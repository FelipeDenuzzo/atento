"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReportContext } from "@/components/AttentionTrainingGame";
import { buildTxtReportFileName } from "@/utils/reportFileName";
import {
  closeRound,
  computeScores,
  exportTXT,
  handleSomEstranhoResponse,
  startContinuousAudio,
  startSession,
  updateRuntime,
  validateSymbolClick,
} from "./logic";
import type {
  AudioEngineController,
  SymbolMapSoundRoundConfig,
  SymbolMapSoundRoundLog,
  SymbolMapSoundRoundRuntime,
  SymbolMapSoundSessionResult,
  VisualOption,
} from "./types";

type Props = {
  basePoints: number;
  startingLevel: number;
  maxLevelHint: number;
  reportContext?: ReportContext;
  onComplete: (result: { success: boolean; pointsEarned: number }) => void;
};

type Phase = "intro" | "countdown" | "running" | "result";

const ROUND_CONFIGS: SymbolMapSoundRoundConfig[] = [
  {
    id: 1,
    name: "Fase 1",
    durationMs: 60000,
    optionCount: 6,
    gridColumns: 3,
    visualTimeLimitMs: 2300,
    glitchIntervalMinMs: 9000,
    glitchIntervalMaxMs: 12000,
    glitchVisibleMs: 1500,
  },
  {
    id: 2,
    name: "Fase 2",
    durationMs: 75000,
    optionCount: 8,
    gridColumns: 4,
    visualTimeLimitMs: 2000,
    glitchIntervalMinMs: 7000,
    glitchIntervalMaxMs: 10000,
    glitchVisibleMs: 1400,
  },
  {
    id: 3,
    name: "Fase 3",
    durationMs: 90000,
    optionCount: 10,
    gridColumns: 5,
    visualTimeLimitMs: 1700,
    glitchIntervalMinMs: 5500,
    glitchIntervalMaxMs: 8500,
    glitchVisibleMs: 1300,
  },
  {
    id: 4,
    name: "Fase 4",
    durationMs: 90000,
    optionCount: 12,
    gridColumns: 6,
    visualTimeLimitMs: 1500,
    glitchIntervalMinMs: 4200,
    glitchIntervalMaxMs: 7000,
    glitchVisibleMs: 1150,
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

function buildResultText(
  result: SymbolMapSoundSessionResult,
  reportContext?: ReportContext,
): string {
  const content = exportTXT(result);
  if (!reportContext) {
    return content;
  }

  const prefix = `Escopo: ${reportContext.mode === "sequence" ? "Trilha" : "Jogo individual"} (${reportContext.scopeLabel})\n`;
  return `${prefix}\n${content}`;
}

export function MapaSimbolosMonitorSomGame({
  basePoints,
  reportContext,
  onComplete,
}: Props) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [roundIndex, setRoundIndex] = useState(0);
  const [remainingMs, setRemainingMs] = useState(ROUND_CONFIGS[0]?.durationMs ?? 0);
  // Armazena o índice do símbolo alvo para evitar piscar
  const [targetSymbolIdx, setTargetSymbolIdx] = useState<number | null>(null);
  const [options, setOptions] = useState<VisualOption[]>([]);
  const [feedbackVisual, setFeedbackVisual] = useState<string>("");
  const [feedbackAudio, setFeedbackAudio] = useState<string>("");
  const [somEstranhoAtivo, setSomEstranhoAtivo] = useState(false);
  const [roundLogs, setRoundLogs] = useState<SymbolMapSoundRoundLog[]>([]);
  const [sessionResult, setSessionResult] = useState<SymbolMapSoundSessionResult | null>(null);
  const [memoryAnswer, setMemoryAnswer] = useState<string>("");

  const frameRef = useRef<number | null>(null);
  const runtimeRef = useRef<SymbolMapSoundRoundRuntime | null>(null);
  const roundStartedAtRef = useRef(0);
  const sessionStartedAtRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioControllerRef = useRef<AudioEngineController | null>(null);
  const lastSomEstranhoIdRef = useRef<number | null>(null);

  const currentConfig = useMemo(
    () => ROUND_CONFIGS[roundIndex] ?? ROUND_CONFIGS[0],
    [roundIndex],
  );

  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      if (audioControllerRef.current) {
        audioControllerRef.current.stop();
        audioControllerRef.current = null;
      }
      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (phase !== "running") return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      event.preventDefault();
      triggerAudioResponse();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase]);

  function ensureAudio() {
    if (audioControllerRef.current) return;
    const context = new window.AudioContext();
    audioContextRef.current = context;
    audioControllerRef.current = startContinuousAudio(context);
  }

  function stopLoop() {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }

  function syncUi(runtime: SymbolMapSoundRoundRuntime) {
    const currentVisual = runtime.currentVisualRound;
    // O targetGlyph agora é um índice para o símbolo
    if (currentVisual) {
      const idx = currentVisual.options.findIndex(opt => opt.isTarget);
      setTargetSymbolIdx(idx >= 0 ? idx : null);
    } else {
      setTargetSymbolIdx(null);
    }
    setOptions(currentVisual?.options ?? []);

    const activeSomEstranhoId = runtime.activeSomEstranho?.id ?? null;
    setSomEstranhoAtivo(activeSomEstranhoId != null);

    if (
      activeSomEstranhoId != null &&
      activeSomEstranhoId !== lastSomEstranhoIdRef.current &&
      audioControllerRef.current
    ) {
      audioControllerRef.current.triggerSomEstranho();
      lastSomEstranhoIdRef.current = activeSomEstranhoId;
    }

    if (activeSomEstranhoId == null) {
      lastSomEstranhoIdRef.current = null;
    }
  }

  function runFrame(now: number) {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    const elapsedMs = Math.max(0, now - roundStartedAtRef.current);
    updateRuntime(runtime, elapsedMs);
    syncUi(runtime);

    setRemainingMs(Math.max(0, runtime.config.durationMs - elapsedMs));

    if (elapsedMs >= runtime.config.durationMs) {
      finalizeRound(now);
      return;
    }

    frameRef.current = requestAnimationFrame(runFrame);
  }

  function startRound() {
    setCountdown(3);
    setPhase("countdown");
    let current = 3;
    const interval = setInterval(() => {
      current -= 1;
      if (current > 0) {
        setCountdown(current);
      } else {
        clearInterval(interval);
        setCountdown(null);
        // Iniciar normalmente
        ensureAudio();
        if (sessionStartedAtRef.current == null) {
          sessionStartedAtRef.current = performance.now();
        }
        const runtime = startSession(currentConfig);
        runtimeRef.current = runtime;
        setRemainingMs(currentConfig.durationMs);
        setTargetSymbolIdx(null);
        setOptions([]);
        setFeedbackVisual("");
        setFeedbackAudio("");
        setSomEstranhoAtivo(false);
        const startedAt = performance.now();
        roundStartedAtRef.current = startedAt;
        setPhase("running");
        frameRef.current = requestAnimationFrame(runFrame);
      }
    }, 1000);
  }

  function finalizeRound(now: number) {
    stopLoop();

    const runtime = runtimeRef.current;
    if (!runtime) return;

    const roundLog = closeRound({
      runtime,
      roundNumber: roundIndex + 1,
      startedAtIso: new Date(roundStartedAtRef.current).toISOString(),
      endedAtIso: new Date(now).toISOString(),
    });

    const updatedRounds = [...roundLogs, roundLog];
    setRoundLogs(updatedRounds);

    if (roundIndex + 1 >= ROUND_CONFIGS.length) {
      if (audioControllerRef.current) {
        audioControllerRef.current.stop();
      }

      const startedAt = sessionStartedAtRef.current ?? roundStartedAtRef.current;
      const result = computeScores({
        startedAtMs: startedAt,
        endedAtMs: now,
        rounds: updatedRounds,
      });
      setSessionResult(result);
      setPhase("result");
      return;
    }

    setRoundIndex((value) => value + 1);
    setPhase("intro");
  }

  function handleVisualClick(optionId: string) {
    if (phase !== "running") return;

    const runtime = runtimeRef.current;
    if (!runtime) return;

    const now = performance.now();
    const elapsedMs = Math.max(0, now - roundStartedAtRef.current);

    const response = validateSymbolClick({ runtime, optionId, atMs: elapsedMs });
    if (!response.accepted) return;

    setFeedbackVisual(response.correct ? "Acerto visual" : "Erro visual");
    window.setTimeout(() => setFeedbackVisual(""), 240);

    syncUi(runtime);
  }

  function triggerAudioResponse() {
    if (phase !== "running") return;

    const runtime = runtimeRef.current;
    if (!runtime) return;

    const now = performance.now();
    const elapsedMs = Math.max(0, now - roundStartedAtRef.current);

    const response = handleSomEstranhoResponse({ runtime, atMs: elapsedMs });
    if (response.detected) {
      setFeedbackAudio(`Som estranho detectado (${Math.round(response.reactionMs)} ms)`);
    } else if (response.falseAlarm) {
      setFeedbackAudio("Falso alarme");
    }

    window.setTimeout(() => setFeedbackAudio(""), 380);
    syncUi(runtime);
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

  function finishExercise() {
    if (!sessionResult) {
      onComplete({ success: false, pointsEarned: 0 });
      return;
    }

    const success = sessionResult.finalScore >= 65;
    const pointsEarned = Math.round(basePoints * (sessionResult.finalScore / 100));
    onComplete({ success, pointsEarned });
  }

  return (
    <div className="space-y-5">

      {phase === "countdown" && countdown !== null && (
        <div className="flex flex-col items-center justify-center py-16">
          <span className="text-6xl font-bold text-zinc-800 mb-2">{countdown}</span>
          <span className="text-lg text-zinc-600">Prepare-se! A fase vai começar</span>
        </div>
      )}
      {phase === "intro" && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5 text-left text-black">
          <p>Você terá <strong>duas tarefas ao mesmo tempo</strong>:</p>
          <p>
            🔷 <strong>Tarefa visual</strong> → encontre e clique nos símbolos que correspondem ao alvo mostrado na grade
            <br />
            🔊 <strong>Tarefa auditiva</strong> → ouça o som contínuo e clique em um botão específico sempre que ouvir um <strong>ruído diferente</strong> — um estalo ou interrupção inesperada
          </p>
          <p>Sua pontuação combina os <strong>acertos na grade</strong> com as <strong>detecções corretas do som</strong>. Concentrar-se em apenas uma das tarefas reduz sua pontuação. A cada fase, a grade fica maior e os sons mais sutis.</p>
          {/* Texto removido: instrução sobre teclas */}
          <button
            type="button"
            onClick={startRound}
            className="w-full rounded-lg bg-zinc-900 px-4 py-3 font-semibold text-white hover:bg-zinc-700"
          >
            Iniciar fase
          </button>
        </div>
      )}

      {phase === "running" && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5">
          <div className={`rounded-lg border p-3 ${somEstranhoAtivo ? "border-rose-300 bg-rose-50" : "border-black/10 bg-zinc-50"}`}>
            <p className="text-xs text-zinc-500">Monitor auditivo</p>
            <p className={`font-semibold ${somEstranhoAtivo ? "text-rose-700" : "text-zinc-900"}`}>
              {somEstranhoAtivo ? "Som estranho ativo" : "Som estável"}
            </p>
          </div>

          <div className="rounded-lg border border-black/10 bg-zinc-50 p-4 text-center">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Símbolo-alvo</p>
            <div
              className="mt-2 mx-auto flex items-center justify-center rounded-lg border border-zinc-200 bg-white"
              style={{ width: 80, height: 80 }}
            >
              {targetSymbolIdx !== null && (
                <img src={`/simbolos/${18 + targetSymbolIdx}.png`} alt="Símbolo alvo" style={{ width: 60, height: 60 }} />
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <button
              type="button"
              onClick={triggerAudioResponse}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            >
              Detectei som estranho
            </button>
            {/* Renderizar opções como imagens */}
            {options.map((option, idx) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleVisualClick(option.id)}
                className="rounded-lg border border-zinc-300 bg-white p-2 flex items-center justify-center"
                style={{ width: 60, height: 60 }}
              >
                <img src={`/simbolos/${18 + idx}.png`} alt={`Opção ${idx + 1}`} style={{ width: 40, height: 40 }} />
              </button>
            ))}
            {feedbackVisual && (
              <span className="rounded-md bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-700">
                {feedbackVisual}
              </span>
            )}
            {feedbackAudio && (
              <span className="rounded-md bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-700">
                {feedbackAudio}
              </span>
            )}
          </div>
        </div>
      )}

      {phase === "result" && sessionResult && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5">
                    {/* Pergunta de memória ao final */}
          <div className="my-4">
            <label htmlFor="memory-answer" className="block text-sm font-medium text-zinc-700 mb-2">
              Pergunta de memória: Qual símbolo você lembra?
            </label>
            <div className="flex items-center">
              <input
                id="memory-answer"
                type="text"
                value={memoryAnswer}
                onChange={e => setMemoryAnswer(e.target.value)}
                placeholder="Digite aqui..."
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm w-48"
              />
              {memoryAnswer && memoryAnswer !== "-" ? (
                <button
                  type="button"
                  className="ml-3 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 underline"
                  style={{ cursor: "pointer" }}
                  onClick={() => navigator.clipboard.writeText(memoryAnswer)}
                  title="Clique para copiar a resposta"
                >
                  Copiar resposta
                </button>
              ) : (
                <span className="ml-3 text-zinc-500 text-sm">Nenhuma resposta</span>
              )}
            </div>
          </div>
          <h3 className="text-xl font-semibold text-zinc-900">Resultado final</h3>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Pontuação total</p>
              <p className="font-semibold text-zinc-900">{sessionResult.finalScore.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Pontuação visual</p>
              <p className="font-semibold text-zinc-900">{sessionResult.visualScore.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Pontuação auditiva</p>
              <p className="font-semibold text-zinc-900">{sessionResult.audioScore.toFixed(1)}%</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3 text-sm text-zinc-700">
              <p className="font-semibold text-zinc-900">Tarefa visual</p>
              <p>Acertos: {sessionResult.totalVisualHits}</p>
              <p>Erros: {sessionResult.totalVisualErrors}</p>
              <p>Omissões: {sessionResult.totalVisualOmissions}</p>
              <p>Tempo médio: {sessionResult.meanVisualResponseMs.toFixed(0)} ms</p>
            </div>

            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3 text-sm text-zinc-700">
              <p className="font-semibold text-zinc-900">Tarefa auditiva</p>
              <p>Detecções: {sessionResult.totalAudioDetected}</p>
              <p>Omissões: {sessionResult.totalAudioMissed}</p>
              <p>Falsos alarmes: {sessionResult.totalAudioFalseAlarms}</p>
              <p>Reação média: {sessionResult.meanAudioReactionMs.toFixed(0)} ms</p>
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
              onClick={finishExercise}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Finalizar exercício
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
