"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReportContext } from "@/components/AttentionTrainingGame";
import { buildTxtReportFileName } from "@/utils/reportFileName";
import {
  closeRound,
  computeFinalMetrics,
  exportTXT,
  handleResponse,
  resolveTimeout,
  spawnTrial,
  startSession,
} from "./logic";
import type {
  ReversalRoundConfig,
  ReversalRoundLog,
  ReversalRuntime,
  ReversalSessionResult,
  RuleMode,
  StimulusShape,
} from "./types";

type Props = {
  basePoints: number;
  startingLevel: number;
  maxLevelHint: number;
  reportContext?: ReportContext;
  onComplete: (result: { success: boolean; pointsEarned: number }) => void;
};

type Phase = "intro" | "running" | "round-feedback" | "result";
type TrialStage = "fixation" | "cue" | "stimulus" | "feedback" | "iti";

const ROUND_CONFIGS: ReversalRoundConfig[] = [
  {
    id: 1,
    name: "Treino guiado",
    durationMs: 20000,
    totalTrials: 10,
    fixationMinMs: 300,
    fixationMaxMs: 500,
    cueMs: 700,
    responseLimitMs: 2400,
    interTrialMs: 280,
    feedbackMs: 380,
    showFeedback: true,
    switchRate: 0.45,
    targetRate: 0.5,
  },
  {
    id: 2,
    name: "Fase de ação 1",
    durationMs: 30000,
    totalTrials: 42,
    fixationMinMs: 260,
    fixationMaxMs: 420,
    cueMs: 620,
    responseLimitMs: 2200,
    interTrialMs: 230,
    feedbackMs: 320,
    showFeedback: false,
    switchRate: 0.5,
    targetRate: 0.5,
  },
  {
    id: 3,
    name: "Fase de ação 2",
    durationMs: 50000,
    totalTrials: 56,
    fixationMinMs: 220,
    fixationMaxMs: 360,
    cueMs: 560,
    responseLimitMs: 2000,
    interTrialMs: 190,
    feedbackMs: 280,
    showFeedback: false,
    switchRate: 0.56,
    targetRate: 0.5,
  },
];

function formatClock(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function cueLabel(rule: RuleMode | null): string {
  if (rule === "normal") return "NORMAL";
  if (rule === "inverted") return "INVERTIDO";
  return "...";
}

function cueClass(rule: RuleMode | null): string {
  if (rule === "normal") {
    return "border-emerald-300 bg-emerald-600 text-white";
  }
  if (rule === "inverted") {
    return "border-rose-300 bg-rose-600 text-white";
  }
  return "border-zinc-300 bg-zinc-100 text-zinc-700";
}

function shapeGlyph(shape: StimulusShape | null): string {
  if (shape === "star") return "★";
  if (shape === "circle") return "●";
  if (shape === "square") return "■";
  if (shape === "triangle") return "▲";
  return "";
}

function shapeText(shape: StimulusShape | null): string {
  if (shape === "star") return "ESTRELA";
  if (shape === "circle") return "CÍRCULO";
  if (shape === "square") return "QUADRADO";
  if (shape === "triangle") return "TRIÂNGULO";
  return "-";
}

export function ReversalGoNoGoSwitchGame({
  basePoints,
  reportContext,
  onComplete,
}: Props) {
  const [phase, setPhase] = useState<Phase>("running");
  const [roundIndex, setRoundIndex] = useState(0);
  const [trialStage, setTrialStage] = useState<TrialStage>("fixation");
  const [remainingMs, setRemainingMs] = useState(ROUND_CONFIGS[0]?.durationMs ?? 0);
  const [currentRule, setCurrentRule] = useState<RuleMode | null>(null);
  const [currentShape, setCurrentShape] = useState<StimulusShape | null>(null);
  const [currentExpectedClick, setCurrentExpectedClick] = useState<boolean | null>(null);
  const [trialCounter, setTrialCounter] = useState(0);
  const [feedback, setFeedback] = useState("\u00A0");
  const [roundLogs, setRoundLogs] = useState<ReversalRoundLog[]>([]);
  const [result, setResult] = useState<ReversalSessionResult | null>(null);

  const runtimeRef = useRef<ReversalRuntime | null>(null);
  const sessionStartedAtRef = useRef<number | null>(null);
  const roundStartedAtRef = useRef<number>(0);
  const stageStartedAtRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trialStageRef = useRef<TrialStage>("fixation");

  const currentConfig = useMemo(() => ROUND_CONFIGS[roundIndex] ?? ROUND_CONFIGS[0], [roundIndex]);
  const isTrainingRound = roundIndex === 0;

  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function setTrialStageSafe(next: TrialStage) {
    trialStageRef.current = next;
    setTrialStage(next);
  }

  function syncVisualFromRuntime(runtime: ReversalRuntime) {
    const trial = runtime.activeTrial;
    setCurrentRule(trial?.rule ?? null);
    setCurrentShape(trial?.stimulusShape ?? null);
    setCurrentExpectedClick(trial?.expectedClick ?? null);
    setTrialCounter(runtime.logs.length + (trial ? 1 : 0));
  }

  function startNextTrial(runtime: ReversalRuntime, elapsedMs: number) {
    const trial = spawnTrial({ runtime, atMs: elapsedMs });
    if (!trial) {
      finishRound();
      return;
    }

    setTrialStageSafe("fixation");
    stageStartedAtRef.current = elapsedMs;
    setCurrentRule(null);
    setCurrentShape(null);
    setCurrentExpectedClick(null);
    setFeedback("\u00A0");
  }

  function finishRound() {
    clearTimer();
    const runtime = runtimeRef.current;
    if (!runtime) return;

    const endedAt = Date.now();
    const roundLog = closeRound({
      runtime,
      roundNumber: roundIndex + 1,
      startedAtIso: new Date(roundStartedAtRef.current).toISOString(),
      endedAtIso: new Date(endedAt).toISOString(),
    });

    const updated = [...roundLogs, roundLog];
    setRoundLogs(updated);

    if (roundIndex + 1 < ROUND_CONFIGS.length) {
      setPhase("round-feedback");
      return;
    }

    const startedAt = sessionStartedAtRef.current ?? roundStartedAtRef.current;
    const actionRounds = updated.filter((entry) => entry.roundNumber > 1);
    const finalResult = computeFinalMetrics({
      startedAtMs: startedAt,
      endedAtMs: endedAt,
      rounds: actionRounds.length > 0 ? actionRounds : updated,
    });

    setResult(finalResult);
    setPhase("result");
  }

  function startRound(index: number) {
    const config = ROUND_CONFIGS[index] ?? ROUND_CONFIGS[0];
    const runtime = startSession(config);
    runtimeRef.current = runtime;

    const now = Date.now();
    if (sessionStartedAtRef.current == null) {
      sessionStartedAtRef.current = now;
      setRoundLogs([]);
      setResult(null);
    }

    roundStartedAtRef.current = now;
    stageStartedAtRef.current = 0;
    trialStageRef.current = "fixation";
    setRemainingMs(config.durationMs);
    setTrialCounter(0);
    setFeedback("\u00A0");
    setCurrentRule(null);
    setCurrentShape(null);
    setCurrentExpectedClick(null);

    clearTimer();
    startNextTrial(runtime, 0);

    timerRef.current = setInterval(() => {
      const activeRuntime = runtimeRef.current;
      if (!activeRuntime) return;

      const elapsedMs = Date.now() - roundStartedAtRef.current;
      setRemainingMs(Math.max(0, activeRuntime.config.durationMs - elapsedMs));

      if (elapsedMs >= activeRuntime.config.durationMs) {
        finishRound();
        return;
      }

      if (trialStageRef.current === "fixation") {
        const activeTrial = activeRuntime.activeTrial;
        if (!activeTrial) return;
        if (elapsedMs - stageStartedAtRef.current >= activeTrial.fixationMs) {
          setTrialStageSafe("cue");
          stageStartedAtRef.current = elapsedMs;
          setCurrentRule(activeTrial.rule);
        }
        return;
      }

      if (trialStageRef.current === "cue") {
        const activeTrial = activeRuntime.activeTrial;
        if (!activeTrial) return;
        if (elapsedMs - stageStartedAtRef.current >= activeRuntime.config.cueMs) {
          setTrialStageSafe("stimulus");
          stageStartedAtRef.current = elapsedMs;
          syncVisualFromRuntime(activeRuntime);
        }
        return;
      }

      if (trialStageRef.current === "stimulus") {
        const resolved = resolveTimeout({ runtime: activeRuntime, atMs: elapsedMs });
        if (resolved.accepted) {
          if (activeRuntime.config.showFeedback) {
            setFeedback(resolved.correct ? "Certo" : "Errado");
            setTrialStageSafe("feedback");
          } else {
            setFeedback("\u00A0");
            setTrialStageSafe("iti");
          }
          stageStartedAtRef.current = elapsedMs;
          setCurrentShape(null);
          setCurrentExpectedClick(null);
          setCurrentRule(null);
        }
        return;
      }

      if (trialStageRef.current === "feedback") {
        if (elapsedMs - stageStartedAtRef.current >= activeRuntime.config.feedbackMs) {
          setFeedback("\u00A0");
          setTrialStageSafe("iti");
          stageStartedAtRef.current = elapsedMs;
        }
        return;
      }

      if (trialStageRef.current === "iti") {
        if (elapsedMs - stageStartedAtRef.current >= activeRuntime.config.interTrialMs) {
          startNextTrial(activeRuntime, elapsedMs);
        }
      }
    }, 16);

    setPhase("running");
  }

  useEffect(() => {
    // Inicia o round automaticamente ao montar
    startRound(roundIndex);
    return () => clearTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function answerByClick() {
    const runtime = runtimeRef.current;
    if (!runtime || !runtime.activeTrial) return;
    if (trialStageRef.current !== "stimulus") return;

    const elapsedMs = Date.now() - roundStartedAtRef.current;
    const response = handleResponse({ runtime, clicked: true, atMs: elapsedMs });
    if (!response.accepted) return;

    if (runtime.config.showFeedback) {
      setFeedback(response.correct ? "Certo" : "Errado");
      setTrialStageSafe("feedback");
    } else {
      setFeedback("\u00A0");
      setTrialStageSafe("iti");
    }

    stageStartedAtRef.current = elapsedMs;
    setCurrentShape(null);
    setCurrentExpectedClick(null);
    setCurrentRule(null);
  }

  function nextRound() {
    const next = roundIndex + 1;
    setRoundIndex(next);
    startRound(next);
  }

  function concludeExercise() {
    if (!result) {
      onComplete({ success: false, pointsEarned: 0 });
      return;
    }

    const success = result.finalScore >= 65;
    const pointsEarned = Math.round(basePoints * Math.min(1, result.finalScore / 100));
    onComplete({ success, pointsEarned });
  }

  function downloadTXT() {
    if (!result) return;
    const blob = new Blob([exportTXT(result)], { type: "text/plain;charset=utf-8" });
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
      {/* Tela de instrução removida. O jogo inicia automaticamente. */}
      {phase === "running" && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5">
          {isTrainingRound && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
                <p className="text-xs text-zinc-500">Fase</p>
                <p className="font-semibold text-zinc-900">
                  Treino
                  <span className="ml-2 text-zinc-500">{roundIndex + 1}/{ROUND_CONFIGS.length}</span>
                </p>
              </div>
              <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
                <p className="text-xs text-zinc-500">Tentativa</p>
                <p className="font-semibold text-zinc-900">{trialCounter}/{currentConfig.totalTrials}</p>
              </div>
              <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
                <p className="text-xs text-zinc-500">Tempo</p>
                <p className="font-semibold text-zinc-900">{formatClock(remainingMs)}</p>
              </div>
            </div>
          )}

          <div className="space-y-3 rounded-lg border-2 border-zinc-300 bg-zinc-50 p-4">
            <div className={`rounded-lg border px-4 py-3 text-center text-base font-semibold ${cueClass(currentRule)}`}>
              REGRA: {cueLabel(currentRule)}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
                <p className="font-semibold">NORMAL</p>
                <p>Clique na estrela</p>
              </div>
              <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">
                <p className="font-semibold">INVERTIDO</p>
                <p>Clique no não-estrela</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-300 bg-white p-6">
            {trialStage === "fixation" ? (
              <div className="flex h-[260px] items-center justify-center text-5xl font-black text-zinc-400">•</div>
            ) : trialStage === "cue" ? (
              <div className="flex h-[260px] items-center justify-center text-lg font-medium text-zinc-600">Prepare-se...</div>
            ) : trialStage === "stimulus" ? (
              <button
                type="button"
                onClick={answerByClick}
                disabled={trialStage !== "stimulus"}
                className="mx-auto flex h-[260px] w-full max-w-[280px] items-center justify-center rounded-2xl border-2 border-zinc-300 bg-white text-[128px] text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed"
                aria-label="Clique para responder"
              >
                {shapeGlyph(currentShape)}
              </button>
            ) : null}
          </div>

          {isTrainingRound && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
              <p className="font-semibold text-zinc-900">Estímulo atual: {shapeText(currentShape)}</p>
              <p>Resposta esperada: {currentExpectedClick == null ? "-" : currentExpectedClick ? "CLICAR" : "NÃO CLICAR"}</p>
            </div>
          )}

          <p className="min-h-[20px] text-sm font-semibold text-zinc-700">{feedback}</p>
        </div>
      )}

      {phase === "round-feedback" && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5">
          <h3 className="text-xl font-semibold text-zinc-900">
            {roundIndex === 0 ? "Treino concluído" : "Fase concluída"}
          </h3>
          {roundIndex === 0 && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
              O treino não entra na validação. A partir da próxima fase, o desempenho passa a valer no resultado final.
            </p>
          )}
          <button
            type="button"
            onClick={nextRound}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            {roundIndex === 0 ? "Iniciar fase válida" : "Próxima fase"}
          </button>
        </div>
      )}

      {phase === "result" && result && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5">
          <h3 className="text-xl font-semibold text-zinc-900">Resultado final</h3>

          <div className="rounded-lg border border-black/10 bg-zinc-50 p-3 text-sm text-zinc-700">
            <p>{result.interpretation}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={downloadTXT}
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
