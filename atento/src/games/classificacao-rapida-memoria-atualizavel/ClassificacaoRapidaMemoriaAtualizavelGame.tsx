"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReportContext } from "@/components/AttentionTrainingGame";
import { buildTxtReportFileName } from "@/utils/reportFileName";
import {
  buildRoundLog,
  computeScores,
  exportTXT,
  spawnStimulus,
  startSession,
  triggerMemoryCheck,
  validateClassificationAnswer,
  validateMemoryCheckAnswer,
} from "./logic";
import type {
  ClassificationEvent,
  MemoryCheck,
  RapidMemoryRoundConfig,
  RapidMemoryRoundLog,
  RapidMemoryRoundRuntime,
  RapidMemorySessionResult,
  Stimulus,
} from "./types";

type Props = {
  basePoints: number;
  startingLevel: number;
  maxLevelHint: number;
  reportContext?: ReportContext;
  onComplete: (result: { success: boolean; pointsEarned: number }) => void;
};

type Phase = "intro" | "countdown" | "running" | "round-feedback" | "result";

const ROUND_CONFIGS: RapidMemoryRoundConfig[] = [
  {
    id: 1,
    name: "Fase 1",
    durationMs: 60000,
    stimulusVisibleMs: 1800,
    interStimulusMs: 320,
    memoryCheckMinIntervalMs: 13000,
    memoryCheckMaxIntervalMs: 17000,
    classificationMode: "number",
    memoryMode: "last-targets",
    alternativesCount: 3,
    keyMap: { left: "f", right: "j" },
  },
  {
    id: 2,
    name: "Fase 2",
    durationMs: 90000,
    stimulusVisibleMs: 1500,
    interStimulusMs: 260,
    memoryCheckMinIntervalMs: 10500,
    memoryCheckMaxIntervalMs: 14500,
    classificationMode: "letter",
    memoryMode: "last-targets",
    alternativesCount: 4,
    keyMap: { left: "f", right: "j" },
  },
  {
    id: 3,
    name: "Fase 3",
    durationMs: 120000,
    stimulusVisibleMs: 1250,
    interStimulusMs: 220,
    memoryCheckMinIntervalMs: 8500,
    memoryCheckMaxIntervalMs: 12000,
    classificationMode: "number",
    memoryMode: "mental-counter",
    alternativesCount: 4,
    keyMap: { left: "f", right: "j" },
  },
  {
    id: 4,
    name: "Fase 4",
    durationMs: 120000,
    stimulusVisibleMs: 1050,
    interStimulusMs: 180,
    memoryCheckMinIntervalMs: 7000,
    memoryCheckMaxIntervalMs: 10000,
    classificationMode: "letter",
    memoryMode: "mental-counter",
    alternativesCount: 4,
    keyMap: { left: "f", right: "j" },
  },
];

function formatClock(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(sec / 60);
  const rest = sec % 60;
  return `${String(min).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function roundNameByIndex(index: number): string {
  return ROUND_CONFIGS[index]?.name ?? `Fase ${index + 1}`;
}

function classificationRuleLabel(config: RapidMemoryRoundConfig): string {
  if (config.classificationMode === "number") {
    return "NÚMERO: F = par | J = ímpar";
  }
  return "LETRA: F = vogal | J = consoante";
}

function memoryRuleLabel(config: RapidMemoryRoundConfig): string {
  if (config.memoryMode === "last-targets") {
    return "MEMÓRIA: mantenha os 2 últimos alvos.";
  }
  return "MEMÓRIA: mantenha contador mental até a checagem.";
}

function classificationSummary(events: ClassificationEvent[]): {
  hits: number;
  errors: number;
  omissions: number;
} {
  return {
    hits: events.filter((event) => event.outcome === "hit").length,
    errors: events.filter((event) => event.outcome === "error").length,
    omissions: events.filter((event) => event.outcome === "omission").length,
  };
}

function memorySummary(checks: MemoryCheck[]): { hits: number; errors: number; total: number } {
  const answered = checks.filter((check) => check.answeredAtMs != null);
  return {
    hits: answered.filter((check) => check.correct).length,
    errors: answered.filter((check) => check.correct === false).length,
    total: answered.length,
  };
}

function normalizeLetterKey(event: KeyboardEvent): string | null {
  const key = event.key?.trim().toLowerCase();
  if (key && key.length === 1 && key >= "a" && key <= "z") {
    return key;
  }

  const code = event.code?.trim();
  if (code?.startsWith("Key") && code.length === 4) {
    return code.slice(3).toLowerCase();
  }

  return null;
}

function normalizeDigitKey(event: KeyboardEvent): number | null {
  const key = event.key?.trim();
  if (key && /^[1-9]$/.test(key)) {
    return Number(key);
  }

  const code = event.code?.trim();
  if (!code) return null;

  const match = code.match(/^(Digit|Numpad)([1-9])$/);
  if (!match) return null;

  return Number(match[2]);
}

function buildResultText(result: RapidMemorySessionResult, reportContext?: ReportContext): string {
  const content = exportTXT(result);
  if (!reportContext) {
    return content;
  }

  const prefix =
    `Escopo: ${reportContext.mode === "sequence" ? "Trilha" : "Jogo individual"} (${reportContext.scopeLabel})\n`;
  return `${prefix}\n${content}`;
}

export function ClassificacaoRapidaMemoriaAtualizavelGame({
  basePoints,
  reportContext,
  onComplete,
}: Props) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [countdown, setCountdown] = useState(5);
  const [roundIndex, setRoundIndex] = useState(0);
  const [remainingMs, setRemainingMs] = useState(ROUND_CONFIGS[0]?.durationMs ?? 0);
  const [visibleStimulus, setVisibleStimulus] = useState<Stimulus | null>(null);
  const [activeMemoryCheck, setActiveMemoryCheck] = useState<MemoryCheck | null>(null);
  const [feedbackClassification, setFeedbackClassification] = useState("");
  const [feedbackMemory, setFeedbackMemory] = useState("");
  const [roundLogs, setRoundLogs] = useState<RapidMemoryRoundLog[]>([]);
  const [sessionResult, setSessionResult] = useState<RapidMemorySessionResult | null>(null);

  const frameRef = useRef<number | null>(null);
  const runtimeRef = useRef<RapidMemoryRoundRuntime | null>(null);
  const roundStartedAtRef = useRef<number>(0);
  const sessionStartedAtRef = useRef<number | null>(null);

  const currentConfig = useMemo(() => ROUND_CONFIGS[roundIndex] ?? ROUND_CONFIGS[0], [roundIndex]);

  const liveClassification = useMemo(() => {
    const runtime = runtimeRef.current;
    return classificationSummary(runtime?.classificationEvents ?? []);
  }, [feedbackClassification, phase]);

  const liveMemory = useMemo(() => {
    const runtime = runtimeRef.current;
    return memorySummary(runtime?.memoryChecks ?? []);
  }, [feedbackMemory, phase]);

  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  function stopLoop() {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }

  function syncUi() {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    setVisibleStimulus(runtime.activeStimulus);
    setActiveMemoryCheck(runtime.activeMemoryCheck);
  }

  function runFrame(now: number) {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    const elapsedMs = Math.max(0, now - roundStartedAtRef.current);

    spawnStimulus(runtime, elapsedMs);
    if (!runtime.activeStimulus) {
      triggerMemoryCheck(runtime, elapsedMs);
    }

    syncUi();
    setRemainingMs(Math.max(0, runtime.config.durationMs - elapsedMs));

    if (elapsedMs >= runtime.config.durationMs) {
      finalizeRound(now);
      return;
    }

    frameRef.current = requestAnimationFrame(runFrame);
  }


  function startCountdown() {
    setCountdown(5);
    setPhase("countdown");
  }

  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown === 0) {
      startRound();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown]);

  function startRound() {
    if (sessionStartedAtRef.current == null) {
      sessionStartedAtRef.current = Date.now();
      setRoundLogs([]);
      setSessionResult(null);
    }

    const runtime = startSession(currentConfig);
    runtimeRef.current = runtime;

    setVisibleStimulus(null);
    setActiveMemoryCheck(null);
    setFeedbackClassification("");
    setFeedbackMemory("");
    setRemainingMs(currentConfig.durationMs);

    roundStartedAtRef.current = performance.now();
    setPhase("running");
    stopLoop();
    frameRef.current = requestAnimationFrame(runFrame);
  }

  function finalizeRound(now: number) {
    stopLoop();

    const runtime = runtimeRef.current;
    if (!runtime) return;

    const endedAtIso = new Date().toISOString();
    const startedAtIso = new Date(Date.now() - runtime.config.durationMs).toISOString();

    const roundLog = buildRoundLog({
      runtime,
      roundNumber: roundIndex + 1,
      startedAtIso,
      endedAtIso,
    });

    const updated = [...roundLogs, roundLog];
    setRoundLogs(updated);

    if (roundIndex + 1 < ROUND_CONFIGS.length) {
      setPhase("round-feedback");
      return;
    }

    const startedAt = sessionStartedAtRef.current ?? Date.now() - runtime.config.durationMs;
    const result = computeScores({
      startedAtMs: startedAt,
      endedAtMs: Date.now(),
      rounds: updated,
    });

    setSessionResult(result);
    setPhase("result");
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const runtime = runtimeRef.current;
      if (!runtime || phase !== "running") return;
      if (event.repeat) return;

      const elapsedMs = Math.max(0, performance.now() - roundStartedAtRef.current);

      if (runtime.activeMemoryCheck) {
        const number = normalizeDigitKey(event);
        if (number == null) return;

        const optionIndex = number - 1;
        const answered = validateMemoryCheckAnswer({ runtime, optionIndex, atMs: elapsedMs });
        if (!answered.accepted) return;

        setFeedbackMemory(answered.correct ? "Checagem correta" : "Checagem incorreta");
        window.setTimeout(() => setFeedbackMemory(""), 480);
        syncUi();
        return;
      }

      const letterKey = normalizeLetterKey(event);
      if (!letterKey) return;

      const response = validateClassificationAnswer({ runtime, key: letterKey, atMs: elapsedMs });
      if (!response.accepted) return;

      setFeedbackClassification(response.correct ? "Acerto" : "Erro");
      window.setTimeout(() => setFeedbackClassification(""), 220);
      syncUi();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase]);

  function nextRound() {
    setRoundIndex((value) => value + 1);
    setPhase("intro");
  }

  function concludeExercise() {
    if (!sessionResult) {
      onComplete({ success: false, pointsEarned: 0 });
      return;
    }

    const success = sessionResult.finalScore >= 65;
    const pointsEarned = Math.round(basePoints * Math.min(1, sessionResult.finalScore / 100));
    onComplete({ success, pointsEarned });
  }

  function downloadText() {
    if (!sessionResult) return;
    const content = buildResultText(sessionResult, reportContext);
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = buildTxtReportFileName({
      mode: reportContext?.mode ?? "single",
      attentionTypeLabel: reportContext?.attentionTypeLabel,
      participantName: reportContext?.participantName,
    });
    link.click();
    URL.revokeObjectURL(url);
  }

  return (

    <div className="space-y-5">
      {phase === "intro" && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5 text-left text-black">
          <p>O jogo exige <strong>duas tarefas ao mesmo tempo</strong>:</p>

<p>
⌨️ <strong>Classificação</strong> → um item aparece no centro da tela e você deve classificá-lo rapidamente com as teclas <strong>F</strong> ou <strong>J</strong>, seguindo a regra da fase atual

🧠 <strong>Memória</strong> → ao mesmo tempo, mantenha uma informação na cabeça — ela será cobrada em uma checagem surpresa durante a fase
</p>



<p>Quando a checagem surgir, uma pergunta com alternativas vai aparecer no lugar do estímulo, e você responde com as <strong>teclas numéricas</strong>. Depois, o jogo retoma de onde parou.</p>



<p>A regra de classificação e o tipo de memória exigidos estão sempre visíveis na tela. Sua pontuação combina o desempenho nas <strong>duas tarefas</strong> — é preciso manter as duas para ter um bom resultado.</p>


          <button
            type="button"
            onClick={startCountdown}
            className="w-full rounded-lg bg-zinc-900 px-4 py-3 font-semibold text-white hover:bg-zinc-700"
          >
            Iniciar fase
          </button>

              {phase === "countdown" && (
                <div className="space-y-6 rounded-lg border border-black/10 bg-white p-5 text-center text-black">
                  <div className="text-3xl font-bold text-zinc-900">{countdown}</div>
                  <div className="text-base text-zinc-700 mt-2">
                    <strong>Dica</strong> — Localize as teclas <b>J</b> e <b>L</b> no seu teclado e fique preparado para digitar
                  </div>
                </div>
              )}
        </div>
      )}

      {phase === "running" && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* CLASSIFICAÇÃO */}
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-4 flex flex-col items-center">
              <span className="text-xs font-bold text-zinc-500 tracking-widest mb-2">{currentConfig.classificationMode === "number" ? "NÚMERO" : "LETRA"}</span>
              <div className="flex flex-col items-center">
                <span className="text-base font-bold text-zinc-900">F</span>
                <span className="text-sm text-zinc-700">
                  {currentConfig.classificationMode === "number" ? "par" : "vogal"}
                </span>
                <span className="mt-2 text-base font-bold text-zinc-900">J</span>
                <span className="text-sm text-zinc-700">
                  {currentConfig.classificationMode === "number" ? "ímpar" : "consoante"}
                </span>
              </div>
            </div>
            {/* MEMÓRIA */}
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-4 flex flex-col items-center">
              <span className="text-xs font-bold text-zinc-500 tracking-widest mb-2">MEMÓRIA</span>
              <span className="text-sm text-zinc-700 text-center">
                {currentConfig.memoryMode === "last-targets"
                  ? "Mantenha os 2 últimos alvos."
                  : "Mantenha contador mental até a checagem."}
              </span>
            </div>
          </div>

          {!activeMemoryCheck ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-black/10 bg-zinc-50 transition-none">
              <p className="text-6xl font-bold text-zinc-900">{visibleStimulus?.value ?? ""}</p>
            </div>
          ) : (
            <div className="space-y-3 rounded-lg border border-black/10 bg-zinc-50 p-4">
              <p className="text-sm font-semibold text-zinc-900">Checagem de memória</p>
              <p className="text-sm text-zinc-700">{activeMemoryCheck.prompt}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {activeMemoryCheck.options.map((option, index) => (
                  <div
                    key={`${activeMemoryCheck.id}-${option}-${index}`}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800"
                  >
                    <span className="font-semibold text-zinc-900">{index + 1}</span> — {option}
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-600">Responda com as teclas numéricas de 1 a {activeMemoryCheck.options.length}.</p>
            </div>
          )}

          {/* Feedbacks removidos para não mostrar acerto/erro durante o treino */}
        </div>
      )}

      {phase === "round-feedback" && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5">
          <h3 className="text-xl font-semibold text-zinc-900">Fase concluída</h3>
          <button
            type="button"
            onClick={nextRound}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Próxima fase
          </button>
        </div>
      )}

      {phase === "result" && sessionResult && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5">
          <h3 className="text-xl font-semibold text-zinc-900">Resultado final</h3>
          {reportContext && (
            <p className="text-sm text-zinc-600">
              {reportContext.mode === "sequence" ? "Trilha" : "Jogo individual"}: {reportContext.scopeLabel}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Pontuação total</p>
              <p className="font-semibold text-zinc-900">{sessionResult.finalScore.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Classificação</p>
              <p className="font-semibold text-zinc-900">{sessionResult.classificationScore.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Memória</p>
              <p className="font-semibold text-zinc-900">{sessionResult.memoryScore.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3 sm:col-span-3">
              <p className="text-xs text-zinc-500">Classificação (detalhe)</p>
              <p className="font-semibold text-zinc-900">
                Acertos {sessionResult.totalClassificationHits} | erros {sessionResult.totalClassificationErrors} | omissões {sessionResult.totalClassificationOmissions} | RT médio {sessionResult.meanClassificationReactionMs.toFixed(0)} ms
              </p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3 sm:col-span-3">
              <p className="text-xs text-zinc-500">Memória (detalhe)</p>
              <p className="font-semibold text-zinc-900">
                Checagens {sessionResult.totalMemoryChecks} | acertos {sessionResult.totalMemoryHits} | erros {sessionResult.totalMemoryErrors} | RT médio {sessionResult.meanMemoryReactionMs.toFixed(0)} ms
              </p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3 sm:col-span-3">
              <p className="text-xs text-zinc-500">Interpretação</p>
              <p className="font-semibold text-zinc-900">{sessionResult.interpretation}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={downloadText}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              Baixar resultados (.txt)
            </button>
            <button
              type="button"
              onClick={concludeExercise}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Concluir exercício
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
