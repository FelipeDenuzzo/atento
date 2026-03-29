"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReportContext } from "@/components/AttentionTrainingGame";
import { buildTxtReportFileName } from "@/utils/reportFileName";
import {
  closeRound,
  computeFinalMetrics,
  exportTXT,
  handleResponse,
  spawnTrial,
  startSession,
} from "./logic";
import type {
  ColorShapeSwitchRoundConfig,
  ColorShapeSwitchRoundLog,
  ColorShapeSwitchRuntime,
  ColorShapeSwitchSessionResult,
  StimulusColor,
  StimulusShape,
  SwitchRule,
} from "./types";

type Props = {
  basePoints: number;
  startingLevel: number;
  maxLevelHint: number;
  reportContext?: ReportContext;
  onComplete: (result: { success: boolean; pointsEarned: number }) => void;
};

type Phase = "intro" | "running" | "round-feedback" | "result";
type TrialStage = "fixation" | "stimulus" | "feedback" | "iti";
type ChoiceOption = "red" | "circle" | "blue" | "square";

const ROUND_CONFIGS: ColorShapeSwitchRoundConfig[] = [
  {
    id: 1,
    name: "Prática",
    durationMs: 60000,
    totalTrials: 20,
    fixationMinMs: 320,
    fixationMaxMs: 500,
    responseLimitMs: 2600,
    interTrialMs: 280,
    feedbackMs: 450,
    showFeedback: true,
    ruleBlockMin: 1,
    ruleBlockMax: 3,
    colors: ["red", "blue"],
    shapes: ["circle", "square"],
    keyMap: {
      color: { red: "j", blue: "k" },
      shape: { circle: "a", square: "s" },
    },
  },
  {
    id: 2,
    name: "Fase 2",
    durationMs: 70000,
    totalTrials: 32,
    fixationMinMs: 300,
    fixationMaxMs: 440,
    responseLimitMs: 2300,
    interTrialMs: 230,
    feedbackMs: 300,
    showFeedback: true,
    ruleBlockMin: 1,
    ruleBlockMax: 3,
    colors: ["red", "blue"],
    shapes: ["circle", "square"],
    keyMap: {
      color: { red: "j", blue: "k" },
      shape: { circle: "a", square: "s" },
    },
  },
  {
    id: 3,
    name: "Fase 3",
    durationMs: 90000,
    totalTrials: 44,
    fixationMinMs: 260,
    fixationMaxMs: 380,
    responseLimitMs: 2100,
    interTrialMs: 200,
    feedbackMs: 260,
    showFeedback: false,
    ruleBlockMin: 1,
    ruleBlockMax: 3,
    colors: ["red", "blue"],
    shapes: ["circle", "square"],
    keyMap: {
      color: { red: "j", blue: "k" },
      shape: { circle: "a", square: "s" },
    },
  },
  {
    id: 4,
    name: "Fase 4",
    durationMs: 100000,
    totalTrials: 56,
    fixationMinMs: 240,
    fixationMaxMs: 350,
    responseLimitMs: 1900,
    interTrialMs: 170,
    feedbackMs: 220,
    showFeedback: false,
    ruleBlockMin: 1,
    ruleBlockMax: 3,
    colors: ["red", "blue"],
    shapes: ["circle", "square"],
    keyMap: {
      color: { red: "j", blue: "k" },
      shape: { circle: "a", square: "s" },
    },
  },
];

function cueClass(rule: SwitchRule | null): string {
  if (rule === "color") return "bg-blue-100";
  if (rule === "shape") return "bg-zinc-200";
  return "bg-zinc-100";
}

function cueLabel(rule: SwitchRule | null): string {
  if (rule === "color") return "Regra: COR";
  if (rule === "shape") return "Regra: FORMA";
  return "Fixação";
}

function shapeGlyph(shape: StimulusShape | null): string {
  if (shape === "circle") return "●";
  if (shape === "square") return "■";
  return "";
}

function colorClass(color: StimulusColor | null): string {
  if (color === "red") return "text-red-600";
  if (color === "blue") return "text-blue-600";
  return "text-zinc-700";
}

export function CorOuFormaSwitchGame({
  basePoints,
  reportContext,
  onComplete,
}: Props) {
  const [phase, setPhase] = useState<Phase>("running");
  const [roundIndex, setRoundIndex] = useState(0);
  const [trialStage, setTrialStage] = useState<TrialStage>("fixation");
  const [remainingMs, setRemainingMs] = useState(ROUND_CONFIGS[0]?.durationMs ?? 0);
  const [currentRule, setCurrentRule] = useState<SwitchRule | null>(null);
  const [currentColor, setCurrentColor] = useState<StimulusColor | null>(null);
  const [currentShape, setCurrentShape] = useState<StimulusShape | null>(null);
  const [trialCounter, setTrialCounter] = useState(0);
  const [feedback, setFeedback] = useState("\u00A0");
  const [choiceOrder, setChoiceOrder] = useState<ChoiceOption[]>([
    "red",
    "circle",
    "blue",
    "square",
  ]);
  const [roundLogs, setRoundLogs] = useState<ColorShapeSwitchRoundLog[]>([]);
  const [result, setResult] = useState<ColorShapeSwitchSessionResult | null>(null);

  const runtimeRef = useRef<ColorShapeSwitchRuntime | null>(null);
  const sessionStartedAtRef = useRef<number | null>(null);
  const roundStartedAtRef = useRef<number>(0);
  const stageStartedAtRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trialStageRef = useRef<TrialStage>("fixation");

  const currentConfig = useMemo(
    () => ROUND_CONFIGS[roundIndex] ?? ROUND_CONFIGS[0],
    [roundIndex],
  );

  function shuffledChoices(): ChoiceOption[] {
    const items: ChoiceOption[] = ["red", "circle", "blue", "square"];
    for (let index = items.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [items[index], items[swap]] = [items[swap] as ChoiceOption, items[index] as ChoiceOption];
    }
    return items;
  }

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

  function syncVisualFromRuntime(runtime: ColorShapeSwitchRuntime) {
    const trial = runtime.activeTrial;
    setCurrentRule(trial?.rule ?? null);
    setCurrentColor(trial?.color ?? null);
    setCurrentShape(trial?.shape ?? null);
    setTrialCounter(runtime.logs.length + (trial ? 1 : 0));
  }

  function startNextTrial(runtime: ColorShapeSwitchRuntime, elapsedMs: number) {
    const trial = spawnTrial({ runtime, atMs: elapsedMs });
    if (!trial) {
      finishRound();
      return;
    }

    setChoiceOrder(shuffledChoices());

    setTrialStageSafe("fixation");
    stageStartedAtRef.current = elapsedMs;
    setCurrentRule(null);
    setCurrentColor(null);
    setCurrentShape(null);
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
    const finalResult = computeFinalMetrics({
      startedAtMs: startedAt,
      endedAtMs: endedAt,
      rounds: updated,
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
    setCurrentColor(null);
    setCurrentShape(null);

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
          setTrialStageSafe("stimulus");
          stageStartedAtRef.current = elapsedMs;
          syncVisualFromRuntime(activeRuntime);
        }
        return;
      }

      if (trialStageRef.current === "stimulus") {
        if (!activeRuntime.activeTrial) return;
        return;
      }

      if (trialStageRef.current === "feedback") {
        if (elapsedMs - stageStartedAtRef.current >= activeRuntime.config.feedbackMs) {
          setTrialStageSafe("iti");
          stageStartedAtRef.current = elapsedMs;
          setFeedback("\u00A0");
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

  function answerByClick(option: ChoiceOption) {
    const runtime = runtimeRef.current;
    if (!runtime || phase !== "running") return;
    if (!runtime.activeTrial) return;
    if (trialStageRef.current !== "stimulus") return;

    const keyMap = runtime.config.keyMap;
    const pressedKey =
      option === "red"
        ? keyMap.color.red
        : option === "blue"
          ? keyMap.color.blue
          : option === "circle"
            ? keyMap.shape.circle
            : keyMap.shape.square;

    const elapsedMs = Date.now() - roundStartedAtRef.current;
    const response = handleResponse({ runtime, key: pressedKey, atMs: elapsedMs });
    if (!response.accepted) return;

    setFeedback("\u00A0");
    setTrialStageSafe("iti");

    stageStartedAtRef.current = elapsedMs;
    setCurrentRule(null);
    setCurrentColor(null);
    setCurrentShape(null);
  }

  function nextRound() {
    const next = roundIndex + 1;
    setRoundIndex(next);
    startRound(next);
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

  function concludeExercise() {
    if (!result) {
      onComplete({ success: false, pointsEarned: 0 });
      return;
    }

    const success = result.finalScore >= 65;
    const pointsEarned = Math.round(basePoints * Math.min(1, result.finalScore / 100));
    onComplete({ success, pointsEarned });
  }

  return (
    <div className="space-y-5">
      {/* Tela de instrução removida. O jogo inicia automaticamente. */}
      {phase === "running" && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-1">
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3 text-center">
              <p className="text-xs text-zinc-500">Alvo</p>
              <p className="font-semibold text-zinc-900">{cueLabel(currentRule)}</p>
            </div>
          </div>

          <div className={`rounded-xl border border-zinc-300 p-10 text-center ${cueClass(currentRule)} min-h-[180px] flex flex-col items-center justify-center`}>
            <div className="mt-4 flex items-center justify-center" style={{height: 120, width: 120}}>
              <span className={`text-9xl font-black leading-none ${colorClass(currentColor)}`}>{shapeGlyph(currentShape)}</span>
            </div>
            <p className="mt-4 min-h-[22px] text-sm font-semibold text-zinc-700">{feedback}</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {choiceOrder.map((choice) => (
              <button
                key={choice}
                type="button"
                onClick={() => answerByClick(choice)}
                className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
              >
                {choice === "red"
                  ? "Vermelho"
                  : choice === "circle"
                    ? "Círculo"
                    : choice === "blue"
                      ? "Azul"
                      : "Quadrado"}
              </button>
            ))}
          </div>
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

      {phase === "result" && result && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5">
          <h3 className="text-xl font-semibold text-zinc-900">Resultado final</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Pontuação</p>
              <p className="font-semibold text-zinc-900">{result.finalScore.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Acurácia</p>
              <p className="font-semibold text-zinc-900">{result.overallAccuracyPercent.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Switch cost</p>
              <p className="font-semibold text-zinc-900">{result.overallSwitchCostMs.toFixed(0)} ms</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Tempo resp. geral</p>
              <p className="font-semibold text-zinc-900">{result.overallMeanReactionMs.toFixed(0)} ms</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Tempo resp. acertos</p>
              <p className="font-semibold text-zinc-900">{result.overallMeanCorrectReactionMs.toFixed(0)} ms</p>
            </div>
          </div>

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
