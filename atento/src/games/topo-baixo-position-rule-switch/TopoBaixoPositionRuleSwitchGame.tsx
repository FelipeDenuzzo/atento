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
  PositionRuleRoundConfig,
  PositionRuleRoundLog,
  PositionRuleRuntime,
  PositionRuleSessionResult,
  RelevantDimension,
  StimulusColor,
  StimulusShape,
  VerticalPosition,
} from "./types";

type Props = {
  basePoints: number;
  startingLevel: number;
  maxLevelHint: number;
  reportContext?: ReportContext;
  onComplete: (result: { success: boolean; pointsEarned: number }) => void;
};

type Phase = "intro" | "running" | "round-feedback" | "result";
type TrialStage = "fixation" | "stimulus" | "iti";
type KeyScheme = "color-as-shape-kl" | "color-kl-shape-as";

const STORAGE_KEY_SCHEME = "topo-baixo-position-rule-switch-key-scheme";

const KEY_MAPS_BY_SCHEME: Record<
  KeyScheme,
  {
    colorKeyMap: { blue: string; green: string };
    shapeKeyMap: { square: string; rectangle: string };
  }
> = {
  "color-as-shape-kl": {
    colorKeyMap: { blue: "a", green: "s" },
    shapeKeyMap: { square: "k", rectangle: "l" },
  },
  "color-kl-shape-as": {
    colorKeyMap: { blue: "k", green: "l" },
    shapeKeyMap: { square: "a", rectangle: "s" },
  },
};

const ROUND_CONFIGS: PositionRuleRoundConfig[] = [
  {
    id: 1,
    name: "Prática",
    durationMs: 60000,
    totalTrials: 30,
    fixationMinMs: 320,
    fixationMaxMs: 500,
    responseLimitMs: 2600,
    interTrialMs: 260,
    feedbackMs: 350,
    showFeedback: true,
    switchRate: 0.45,
    colors: ["blue", "green"],
    shapes: ["square", "rectangle"],
    topRule: {
      id: "A",
      dimension: "color",
      colorKeyMap: { blue: "a", green: "s" },
      shapeKeyMap: { square: "k", rectangle: "l" },
    },
    bottomRule: {
      id: "B",
      dimension: "shape",
      colorKeyMap: { blue: "a", green: "s" },
      shapeKeyMap: { square: "k", rectangle: "l" },
    },
  },
  {
    id: 2,
    name: "Fase 2",
    durationMs: 80000,
    totalTrials: 42,
    fixationMinMs: 280,
    fixationMaxMs: 420,
    responseLimitMs: 2300,
    interTrialMs: 230,
    feedbackMs: 280,
    showFeedback: true,
    switchRate: 0.5,
    colors: ["blue", "green"],
    shapes: ["square", "rectangle"],
    topRule: {
      id: "A",
      dimension: "color",
      colorKeyMap: { blue: "a", green: "s" },
      shapeKeyMap: { square: "k", rectangle: "l" },
    },
    bottomRule: {
      id: "B",
      dimension: "shape",
      colorKeyMap: { blue: "a", green: "s" },
      shapeKeyMap: { square: "k", rectangle: "l" },
    },
  },
  {
    id: 3,
    name: "Fase 3",
    durationMs: 100000,
    totalTrials: 56,
    fixationMinMs: 240,
    fixationMaxMs: 360,
    responseLimitMs: 2000,
    interTrialMs: 190,
    feedbackMs: 240,
    showFeedback: false,
    switchRate: 0.56,
    colors: ["blue", "green"],
    shapes: ["square", "rectangle"],
    topRule: {
      id: "A",
      dimension: "color",
      colorKeyMap: { blue: "a", green: "s" },
      shapeKeyMap: { square: "k", rectangle: "l" },
    },
    bottomRule: {
      id: "B",
      dimension: "shape",
      colorKeyMap: { blue: "a", green: "s" },
      shapeKeyMap: { square: "k", rectangle: "l" },
    },
  },
];

function configsForScheme(scheme: KeyScheme): PositionRuleRoundConfig[] {
  const maps = KEY_MAPS_BY_SCHEME[scheme];
  return ROUND_CONFIGS.map((config) => ({
    ...config,
    topRule: {
      ...config.topRule,
      colorKeyMap: { ...maps.colorKeyMap },
      shapeKeyMap: { ...maps.shapeKeyMap },
    },
    bottomRule: {
      ...config.bottomRule,
      colorKeyMap: { ...maps.colorKeyMap },
      shapeKeyMap: { ...maps.shapeKeyMap },
    },
  }));
}

function formatClock(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function normalizeKeyboardInput(event: KeyboardEvent): string | null {
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

function colorClass(color: StimulusColor | null): string {
  if (color === "blue") return "bg-blue-600";
  if (color === "green") return "bg-emerald-600";
  return "bg-zinc-300";
}

function shapeClass(shape: StimulusShape | null): string {
  if (shape === "rectangle") {
    return "h-20 w-36 rounded-md";
  }
  return "h-24 w-24 rounded-md";
}

function relevantLabel(dimension: RelevantDimension | null): string {
  if (dimension === "color") return "Regra ativa: COR";
  if (dimension === "shape") return "Regra ativa: FORMA";
  return "Fixação";
}

function positionLabel(position: VerticalPosition | null): string {
  if (position === "top") return "Topo";
  if (position === "bottom") return "Baixo";
  return "-";
}

export function TopoBaixoPositionRuleSwitchGame({
  basePoints,
  reportContext,
  onComplete,
}: Props) {
  const [schemeReady, setSchemeReady] = useState(false);
  const [sessionConfigs, setSessionConfigs] = useState<PositionRuleRoundConfig[]>(() =>
    configsForScheme("color-as-shape-kl"),
  );
  const [phase, setPhase] = useState<Phase>("running");
  const [roundIndex, setRoundIndex] = useState(0);
  const [trialStage, setTrialStage] = useState<TrialStage>("fixation");
  const [remainingMs, setRemainingMs] = useState(sessionConfigs[0]?.durationMs ?? 0);
  const [currentPosition, setCurrentPosition] = useState<VerticalPosition | null>(null);
  const [currentDimension, setCurrentDimension] = useState<RelevantDimension | null>(null);
  const [currentColor, setCurrentColor] = useState<StimulusColor | null>(null);
  const [currentShape, setCurrentShape] = useState<StimulusShape | null>(null);
  const [trialCounter, setTrialCounter] = useState(0);
  const [roundLogs, setRoundLogs] = useState<PositionRuleRoundLog[]>([]);
  const [result, setResult] = useState<PositionRuleSessionResult | null>(null);

  const runtimeRef = useRef<PositionRuleRuntime | null>(null);
  const sessionStartedAtRef = useRef<number | null>(null);
  const roundStartedAtRef = useRef<number>(0);
  const stageStartedAtRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trialStageRef = useRef<TrialStage>("fixation");

  const currentConfig = useMemo(
    () => sessionConfigs[roundIndex] ?? sessionConfigs[0],
    [roundIndex, sessionConfigs],
  );

  useEffect(() => {
    let nextScheme: KeyScheme = "color-kl-shape-as";

    try {
      const previous = window.localStorage.getItem(STORAGE_KEY_SCHEME) as KeyScheme | null;
      nextScheme = previous === "color-kl-shape-as" ? "color-as-shape-kl" : "color-kl-shape-as";
      window.localStorage.setItem(STORAGE_KEY_SCHEME, nextScheme);
    } catch {
      nextScheme = "color-kl-shape-as";
    }

    setSessionConfigs(configsForScheme(nextScheme));
    setRemainingMs(configsForScheme(nextScheme)[0]?.durationMs ?? 0);
    setSchemeReady(true);
    setPhase("running");
  }, []);

  useEffect(() => {
    if (schemeReady) startRound(0);
  }, [schemeReady]);

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

  function syncVisualFromRuntime(runtime: PositionRuleRuntime) {
    const trial = runtime.activeTrial;
    setCurrentPosition(trial?.position ?? null);
    setCurrentDimension(trial?.relevantDimension ?? null);
    setCurrentColor(trial?.stimulus.color ?? null);
    setCurrentShape(trial?.stimulus.shape ?? null);
    setTrialCounter(runtime.logs.length + (trial ? 1 : 0));
  }

  function startNextTrial(runtime: PositionRuleRuntime, elapsedMs: number) {
    const trial = spawnTrial({ runtime, atMs: elapsedMs });
    if (!trial) {
      finishRound();
      return;
    }

    setTrialStageSafe("fixation");
    stageStartedAtRef.current = elapsedMs;
    setCurrentPosition(null);
    setCurrentDimension(null);
    setCurrentColor(null);
    setCurrentShape(null);
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
    if (!schemeReady) return;
    const config = sessionConfigs[index] ?? sessionConfigs[0];
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
    setCurrentPosition(null);
    setCurrentDimension(null);
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

  useEffect(() => () => clearTimer(), []);

  useEffect(() => {
    if (phase !== "running") return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat) return;

      const runtime = runtimeRef.current;
      if (!runtime || !runtime.activeTrial) return;
      if (trialStageRef.current !== "stimulus") return;

      const pressedKey = normalizeKeyboardInput(event);
      if (!pressedKey) return;

      const validKeys = new Set<string>([
        ...Object.values(runtime.config.topRule.colorKeyMap).map((key) => key.toLowerCase()),
        ...Object.values(runtime.config.topRule.shapeKeyMap).map((key) => key.toLowerCase()),
        ...Object.values(runtime.config.bottomRule.colorKeyMap).map((key) => key.toLowerCase()),
        ...Object.values(runtime.config.bottomRule.shapeKeyMap).map((key) => key.toLowerCase()),
      ]);
      if (!validKeys.has(pressedKey)) return;

      event.preventDefault();

      const elapsedMs = Date.now() - roundStartedAtRef.current;
      const response = handleResponse({ runtime, key: pressedKey, atMs: elapsedMs });
      if (!response.accepted) return;

      setTrialStageSafe("iti");
      stageStartedAtRef.current = elapsedMs;
      setCurrentPosition(null);
      setCurrentDimension(null);
      setCurrentColor(null);
      setCurrentShape(null);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase]);

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

  const topRule =
    currentConfig.topRule.dimension === "color"
      ? {
          position: "TOPO",
          dimension: "COR",
          mapping: `${currentConfig.topRule.colorKeyMap.blue.toUpperCase()} - AZUL / ${currentConfig.topRule.colorKeyMap.green.toUpperCase()} - VERDE`,
        }
      : {
          position: "TOPO",
          dimension: "FORMA",
          mapping: `${currentConfig.topRule.shapeKeyMap.square.toUpperCase()} - QUADRADO / ${currentConfig.topRule.shapeKeyMap.rectangle.toUpperCase()} - RETÂNGULO`,
        };

  const bottomRule =
    currentConfig.bottomRule.dimension === "shape"
      ? {
          position: "BAIXO",
          dimension: "FORMA",
          mapping: `${currentConfig.bottomRule.shapeKeyMap.square.toUpperCase()} - QUADRADO / ${currentConfig.bottomRule.shapeKeyMap.rectangle.toUpperCase()} - RETÂNGULO`,
        }
      : {
          position: "BAIXO",
          dimension: "COR",
          mapping: `${currentConfig.bottomRule.colorKeyMap.blue.toUpperCase()} - AZUL / ${currentConfig.bottomRule.colorKeyMap.green.toUpperCase()} - VERDE`,
        };

  return (
    <div className="space-y-5">

      {phase === "running" && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Fase</p>
              <p className="font-semibold text-zinc-900">{roundIndex + 1}/{ROUND_CONFIGS.length}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Trial</p>
              <p className="font-semibold text-zinc-900">{trialCounter}/{currentConfig.totalTrials}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Tempo</p>
              <p className="font-semibold text-zinc-900">{formatClock(remainingMs)}</p>
            </div>
          </div>

          <div className="rounded-lg border-2 border-zinc-300 bg-zinc-50 p-4 text-zinc-700">
            <p className="text-lg font-semibold text-zinc-900">{relevantLabel(currentDimension)}</p>
            <p className="text-base">Posição atual: {positionLabel(currentPosition)}</p>
          </div>

          <div className="relative h-[360px] overflow-hidden rounded-xl border border-zinc-300 bg-white">
            <div className="absolute inset-x-0 top-0 h-1/2 border-b border-dashed border-zinc-300 bg-zinc-50/60" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-zinc-100/40" />

            <p className="absolute left-3 top-3 text-xs font-semibold uppercase text-zinc-500">Topo</p>
            <p className="absolute left-3 bottom-3 text-xs font-semibold uppercase text-zinc-500">Baixo</p>

            {trialStage === "fixation" && (
              <div className="absolute inset-0 flex items-center justify-center text-4xl font-black text-zinc-400">+</div>
            )}

            {trialStage === "stimulus" && currentPosition && (
              <div
                className={`absolute left-1/2 -translate-x-1/2 ${currentPosition === "top" ? "top-[18%]" : "top-[66%]"}`}
              >
                <div className={`${shapeClass(currentShape)} ${colorClass(currentColor)} shadow-sm`} />
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border-2 border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-800">
              <p className="text-base font-semibold leading-tight">{topRule.position}</p>
              <p className="text-base font-semibold leading-tight">{topRule.dimension}</p>
              <p className="mt-1 text-sm font-medium">{topRule.mapping}</p>
            </div>
            <div className="rounded-lg border-2 border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-800">
              <p className="text-base font-semibold leading-tight">{bottomRule.position}</p>
              <p className="text-base font-semibold leading-tight">{bottomRule.dimension}</p>
              <p className="mt-1 text-sm font-medium">{bottomRule.mapping}</p>
            </div>
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
              <p className="text-xs text-zinc-500">RT médio geral</p>
              <p className="font-semibold text-zinc-900">{result.overallMeanReactionMs.toFixed(0)} ms</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">RT médio acertos</p>
              <p className="font-semibold text-zinc-900">{result.overallMeanCorrectReactionMs.toFixed(0)} ms</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Acurácia A/B</p>
              <p className="font-semibold text-zinc-900">
                {result.overallRuleAAccuracyPercent.toFixed(1)}% / {result.overallRuleBAccuracyPercent.toFixed(1)}%
              </p>
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
