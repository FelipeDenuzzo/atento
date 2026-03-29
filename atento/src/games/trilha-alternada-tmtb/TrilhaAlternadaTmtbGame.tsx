
"use client";
import { ResultScreen } from "@/components/ResultScreen";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReportContext } from "@/components/AttentionTrainingGame";
import { buildTxtReportFileName } from "@/utils/reportFileName";
import {
  buildAlternatingSequence,
  buildSessionResult,
  evaluateClick,
  exportTXT,
  generateNodeLayout,
} from "./logic";
import type {
  TmtbClickLog,
  TmtbConfig,
  TmtbNode,
  TmtbSequenceItem,
  TmtbSessionKind,
  TmtbSessionResult,
} from "./types";

type Props = {
  basePoints: number;
  startingLevel: number;
  maxLevelHint: number;
  reportContext?: ReportContext;
  onComplete: (result: { success: boolean; pointsEarned: number }) => void;
};

type Phase = "intro" | "running" | "practice-feedback" | "phase-feedback" | "result";
type ValidPhaseId = 1 | 2 | 3;
type DistractorTheme = "basic" | "roman-symbol";

type DistractorNode = {
  id: string;
  label: string;
  xPct: number;
  yPct: number;
  theme: DistractorTheme;
};

type ValidPhaseConfig = {
  id: ValidPhaseId;
  name: string;
  enableDualHints: boolean;
  enableDistractors: boolean;
  distractorCount: number;
  distractorTheme: DistractorTheme;
};

const PRACTICE_CONFIG: TmtbConfig = {
  numbersCount: 4,
  lettersCount: 4,
  penaltyMode: "back-step",
  backStepsOnError: 1,
  minNodeDistancePct: 11,
};

const MAIN_CONFIG: TmtbConfig = {
  numbersCount: 13,
  lettersCount: 12,
  penaltyMode: "back-step",
  backStepsOnError: 1,
  minNodeDistancePct: 10,
};

const VALID_PHASES: ValidPhaseConfig[] = [
  {
    id: 1,
    name: "Fase 1",
    enableDualHints: false,
    enableDistractors: false,
    distractorCount: 0,
    distractorTheme: "basic",
  },
  {
    id: 2,
    name: "Fase 2",
    enableDualHints: true,
    enableDistractors: true,
    distractorCount: 8,
    distractorTheme: "basic",
  },
  {
    id: 3,
    name: "Fase 3",
    enableDualHints: true,
    enableDistractors: true,
    distractorCount: 10,
    distractorTheme: "roman-symbol",
  },
];

function formatElapsed(ms: number): string {
  const seconds = Math.max(0, ms / 1000);
  return `${seconds.toFixed(1)} s`;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function sessionKindFromPhaseId(phaseId: ValidPhaseId): TmtbSessionKind {
  if (phaseId === 1) return "phase-1";
  if (phaseId === 2) return "phase-2";
  return "phase-3";
}

function generateDistractors(params: {
  count: number;
  theme: DistractorTheme;
  occupied: Array<{ xPct: number; yPct: number }>;
}): DistractorNode[] {
  const basicLabels = ["14", "15", "16", "17", "18", "M", "N", "P", "Q", "R", "S", "T"];
  const romanLabels = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  const symbolLabels = ["◆", "◇", "◼", "◻", "⬟", "⬢", "✦", "✧", "▣", "▤", "◈", "◎"];
  const pool = params.theme === "roman-symbol" ? [...romanLabels, ...symbolLabels] : basicLabels;

  const minX = 8;
  const maxX = 92;
  const minY = 12;
  const maxY = 88;
  const minDistance = 9;

  const nodes: DistractorNode[] = [];
  const used = new Set<string>();

  for (let index = 0; index < params.count; index += 1) {
    let x = randomBetween(minX, maxX);
    let y = randomBetween(minY, maxY);
    let placed = false;

    for (let attempt = 0; attempt < 800; attempt += 1) {
      x = randomBetween(minX, maxX);
      y = randomBetween(minY, maxY);
      const overlapMain = params.occupied.some((point) => Math.hypot(point.xPct - x, point.yPct - y) < minDistance);
      const overlapDistractor = nodes.some((item) => Math.hypot(item.xPct - x, item.yPct - y) < minDistance);
      if (!overlapMain && !overlapDistractor) {
        placed = true;
        break;
      }
    }

    if (!placed) {
      x = randomBetween(minX, maxX);
      y = randomBetween(minY, maxY);
    }

    const label = pool.find((item) => !used.has(item)) ?? `?${index + 1}`;
    used.add(label);

    nodes.push({
      id: `d-${index}-${label}`,
      label,
      xPct: x,
      yPct: y,
      theme: params.theme,
    });
  }

  return nodes;
}

export function TrilhaAlternadaTmtbGame({ basePoints, reportContext, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [sessionKind, setSessionKind] = useState<TmtbSessionKind>("practice");
  const [validPhaseId, setValidPhaseId] = useState<ValidPhaseId>(1);

  const [sequence, setSequence] = useState<TmtbSequenceItem[]>([]);
  const [nodes, setNodes] = useState<TmtbNode[]>([]);
  const [distractors, setDistractors] = useState<DistractorNode[]>([]);
  const [currentSeqIndex, setCurrentSeqIndex] = useState(0);

  const [errorsTotal, setErrorsTotal] = useState(0);
  const [errorsOnNumberTarget, setErrorsOnNumberTarget] = useState(0);
  const [errorsOnLetterTarget, setErrorsOnLetterTarget] = useState(0);
  const [backStepsApplied, setBackStepsApplied] = useState(0);

  const [validStartedAtMs, setValidStartedAtMs] = useState<number | null>(null);
  const [elapsedValidMs, setElapsedValidMs] = useState(0);
  const [completedSequenceLength, setCompletedSequenceLength] = useState(0);

  const [logs, setLogs] = useState<TmtbClickLog[]>([]);

  const [wrongNodeId, setWrongNodeId] = useState<string | null>(null);
  const [wrongDistractorId, setWrongDistractorId] = useState<string | null>(null);
  const [targetBlinkBlue, setTargetBlinkBlue] = useState(false);

  const [result, setResult] = useState<TmtbSessionResult | null>(null);
  const [isResultPopupOpen, setIsResultPopupOpen] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const phaseStartedAtRef = useRef<number | null>(null);
  const phaseDurationsRef = useRef<Record<ValidPhaseId, number>>({ 1: 0, 2: 0, 3: 0 });

  const currentExpected = sequence[currentSeqIndex] ?? null;
  const activeValidPhaseConfig = VALID_PHASES.find((item) => item.id === validPhaseId) ?? VALID_PHASES[0]!;

  const visitedNodes = useMemo(
    () => nodes.filter((item) => item.seqIndex < currentSeqIndex).sort((a, b) => a.seqIndex - b.seqIndex),
    [nodes, currentSeqIndex],
  );

  const polylinePoints = visitedNodes.map((item) => `${item.xPct.toFixed(2)},${item.yPct.toFixed(2)}`).join(" ");

  const showDualPathsTrap =
    phase === "running" &&
    sessionKind !== "practice" &&
    activeValidPhaseConfig.enableDualHints &&
    currentSeqIndex >= 5 &&
    Boolean(currentExpected);

  const dualPathDecoyNodeId = useMemo(() => {
    if (!showDualPathsTrap || !currentExpected) return null;

    const targetNode = nodes.find((node) => node.seqIndex === currentSeqIndex);
    if (!targetNode) return null;

    const sameKindCandidates = nodes.filter(
      (node) => node.seqIndex > currentSeqIndex && node.kind === currentExpected.kind,
    );
    const fallbackCandidates = nodes.filter((node) => node.seqIndex > currentSeqIndex);
    const candidates = sameKindCandidates.length > 0 ? sameKindCandidates : fallbackCandidates;
    if (candidates.length === 0) return null;

    const nearest = [...candidates].sort((a, b) => {
      const distanceA = Math.hypot(a.xPct - targetNode.xPct, a.yPct - targetNode.yPct);
      const distanceB = Math.hypot(b.xPct - targetNode.xPct, b.yPct - targetNode.yPct);
      return distanceA - distanceB;
    })[0];

    return nearest?.id ?? null;
  }, [showDualPathsTrap, currentExpected, nodes, currentSeqIndex]);

  useEffect(() => {
    if (phase !== "phase-feedback") return;
    if (validPhaseId >= 3) return;

    const timeoutId = window.setTimeout(() => {
      startValidPhase((validPhaseId + 1) as ValidPhaseId, false);
    }, 1400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [phase, validPhaseId]);

  function playErrorTone() {
    try {
      const AudioCtor =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtor();
      }

      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "square";
      oscillator.frequency.value = 190;
      gain.gain.value = 0.0001;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.16, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      oscillator.start(now);
      oscillator.stop(now + 0.2);
    } catch {
      return;
    }
  }

  function triggerVisualError(params: { nodeId?: string; distractorId?: string; blinkTarget?: boolean }) {
    if (params.nodeId) {
      setWrongNodeId(params.nodeId);
      window.setTimeout(() => {
        setWrongNodeId((value) => (value === params.nodeId ? null : value));
      }, 220);
    }

    if (params.distractorId) {
      setWrongDistractorId(params.distractorId);
      window.setTimeout(() => {
        setWrongDistractorId((value) => (value === params.distractorId ? null : value));
      }, 220);
    }

    if (params.blinkTarget) {
      setTargetBlinkBlue(true);
      window.setTimeout(() => setTargetBlinkBlue(false), 220);
    }

    playErrorTone();
  }

  function registerErrorAndBackStep(nextSeqIndex: number, backStepsCount: number) {
    if (currentExpected?.kind === "number") {
      setErrorsOnNumberTarget((value) => value + 1);
    } else {
      setErrorsOnLetterTarget((value) => value + 1);
    }

    setErrorsTotal((value) => value + 1);
    setBackStepsApplied((value) => value + backStepsCount);
    setCurrentSeqIndex(nextSeqIndex);
  }

  function finalizePhaseTiming(endedAtMs: number, phaseId: ValidPhaseId) {
    const startedAt = phaseStartedAtRef.current;
    if (startedAt == null) return;
    phaseDurationsRef.current[phaseId] = Math.max(0, endedAtMs - startedAt);
    phaseStartedAtRef.current = null;
  }

  function startPractice() {
    const nextSequence = buildAlternatingSequence({
      numbersCount: PRACTICE_CONFIG.numbersCount,
      lettersCount: PRACTICE_CONFIG.lettersCount,
    });
    const nextNodes = generateNodeLayout({
      items: nextSequence,
      minDistancePct: PRACTICE_CONFIG.minNodeDistancePct,
    });

    setSessionKind("practice");
    setSequence(nextSequence);
    setNodes(nextNodes);
    setDistractors([]);
    setCurrentSeqIndex(0);
    setWrongNodeId(null);
    setWrongDistractorId(null);
    setTargetBlinkBlue(false);
    setIsResultPopupOpen(false);
    setPhase("running");
  }

  function startValidPhase(phaseId: ValidPhaseId, resetAggregate: boolean) {
    const phaseConfig = VALID_PHASES.find((item) => item.id === phaseId) ?? VALID_PHASES[0]!;

    const nextSequence = buildAlternatingSequence({
      numbersCount: MAIN_CONFIG.numbersCount,
      lettersCount: MAIN_CONFIG.lettersCount,
    });

    const nextNodes = generateNodeLayout({
      items: nextSequence,
      minDistancePct: MAIN_CONFIG.minNodeDistancePct,
    });

    const nextDistractors = phaseConfig.enableDistractors
      ? generateDistractors({
          count: phaseConfig.distractorCount,
          theme: phaseConfig.distractorTheme,
          occupied: nextNodes.map((item) => ({ xPct: item.xPct, yPct: item.yPct })),
        })
      : [];

    setSessionKind(sessionKindFromPhaseId(phaseId));
    setValidPhaseId(phaseId);
    setSequence(nextSequence);
    setNodes(nextNodes);
    setDistractors(nextDistractors);
    setCurrentSeqIndex(0);
    setWrongNodeId(null);
    setWrongDistractorId(null);
    setTargetBlinkBlue(false);
    phaseStartedAtRef.current = Date.now();

    if (resetAggregate) {
      const now = Date.now();
      setErrorsTotal(0);
      setErrorsOnNumberTarget(0);
      setErrorsOnLetterTarget(0);
      setBackStepsApplied(0);
      setLogs([]);
      setCompletedSequenceLength(0);
      setResult(null);
      setIsResultPopupOpen(false);
      setValidStartedAtMs(now);
      setElapsedValidMs(0);
      phaseDurationsRef.current = { 1: 0, 2: 0, 3: 0 };
      phaseStartedAtRef.current = now;
    }

    setPhase("running");
  }

  function finishAllValidPhases(endedAtMs: number) {
    const startedAtMs = validStartedAtMs ?? endedAtMs;
    const totalLength = completedSequenceLength + sequence.length;

    const sessionResult = buildSessionResult({
      participantId: reportContext?.participantName,
      startedAtMs,
      endedAtMs,
      sequenceLength: totalLength,
      errorsTotal,
      errorsOnNumberTarget,
      errorsOnLetterTarget,
      backStepsApplied,
      clicks: logs,
      phaseDurationsMs: phaseDurationsRef.current,
    });

    setResult(sessionResult);
    setIsResultPopupOpen(true);
    const pointsEarned = Math.round(basePoints * Math.min(1, sessionResult.finalScore / 100));
    onComplete({ success: sessionResult.finalScore >= 60, pointsEarned });
    setPhase("result");
  }

  function handleCorrect(now: number, nextSeqIndex: number) {
    setCurrentSeqIndex(nextSeqIndex);

    if (sessionKind !== "practice" && validStartedAtMs != null) {
      setElapsedValidMs(now - validStartedAtMs);
    }

    if (nextSeqIndex < sequence.length) {
      return;
    }

    if (sessionKind === "practice") {
      setPhase("practice-feedback");
      return;
    }

    if (validPhaseId < 3) {
      finalizePhaseTiming(now, validPhaseId);
      setCompletedSequenceLength((value) => value + sequence.length);
      setPhase("phase-feedback");
      return;
    }

    finalizePhaseTiming(now, validPhaseId);
    finishAllValidPhases(now);
  }

  function handleNodeClick(node: TmtbNode) {
    if (phase !== "running") return;
    if (!currentExpected) return;

    const config = sessionKind === "practice" ? PRACTICE_CONFIG : MAIN_CONFIG;
    const now = Date.now();

    const evaluation = evaluateClick({
      clickedSeqIndex: node.seqIndex,
      currentSeqIndex,
      penaltyMode: config.penaltyMode,
      backStepsOnError: config.backStepsOnError,
    });

    if (sessionKind !== "practice") {
      setLogs((prev) => [
        ...prev,
        {
          sessionKind,
          atMs: now,
          clickedLabel: node.label,
          clickedSeqIndex: node.seqIndex,
          expectedLabel: currentExpected.label,
          expectedSeqIndex: currentExpected.seqIndex,
          correct: evaluation.correct,
        },
      ]);
    }

    if (evaluation.correct) {
      handleCorrect(now, evaluation.nextSeqIndex);
      return;
    }

    triggerVisualError({ nodeId: node.id });
    registerErrorAndBackStep(evaluation.nextSeqIndex, evaluation.backStepsApplied);
  }

  function handleDistractorClick(distractor: DistractorNode) {
    if (phase !== "running") return;
    if (sessionKind === "practice") return;
    if (!currentExpected) return;

    const now = Date.now();
    const evaluation = evaluateClick({
      clickedSeqIndex: -1,
      currentSeqIndex,
      penaltyMode: MAIN_CONFIG.penaltyMode,
      backStepsOnError: MAIN_CONFIG.backStepsOnError,
    });

    setLogs((prev) => [
      ...prev,
      {
        sessionKind,
        atMs: now,
        clickedLabel: distractor.label,
        clickedSeqIndex: -1,
        expectedLabel: currentExpected.label,
        expectedSeqIndex: currentExpected.seqIndex,
        correct: false,
      },
    ]);

    triggerVisualError({ distractorId: distractor.id, blinkTarget: true });
    registerErrorAndBackStep(evaluation.nextSeqIndex, evaluation.backStepsApplied);
  }

  function downloadTXT() {
    if (!result) return;
    downloadFile(
      buildTxtReportFileName({
        mode: reportContext?.mode ?? "single",
        attentionTypeLabel: reportContext?.attentionTypeLabel,
        participantName: reportContext?.participantName,
      }),
      exportTXT(result),
      "text/plain;charset=utf-8",
    );
  }

  return (
    <div className="space-y-5">
      {phase === "intro" && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5">
          <h3 className="text-xl font-semibold text-zinc-900">Trilha Alternada 1-A-2-B (TMT-B)</h3>

          <div className="rounded-lg border-2 border-zinc-300 bg-zinc-50 p-4 text-zinc-700">
            <p className="text-base font-semibold text-zinc-900">Como funciona</p>
            <p className="mt-2 text-sm font-medium">Clique na ordem alternada: 1 → A → 2 → B → 3 → C...</p>
            <p className="mt-1 text-sm font-medium">O próximo alvo fica destacado em azul.</p>
            <p className="mt-1 text-sm font-medium">Se errar, você volta um passo e precisa retomar a trilha corretamente.</p>
          </div>

          <button
            type="button"
            onClick={startPractice}
            className="w-full rounded-lg bg-zinc-900 px-4 py-3 font-semibold text-white hover:bg-zinc-700"
          >
            Iniciar treino
          </button>
        </div>
      )}

      {phase === "running" && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5">
          <div className="relative h-[70vh] rounded-xl border border-zinc-300 bg-white">
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {polylinePoints && (
                <polyline
                  points={polylinePoints}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="0.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}
            </svg>

            {distractors.map((item) => {
              const isWrong = wrongDistractorId === item.id;
              const romanTheme = item.theme === "roman-symbol";
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleDistractorClick(item)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 text-base font-semibold"
                  style={{
                    left: `${item.xPct}%`,
                    top: `${item.yPct}%`,
                    width: 56,
                    height: 56,
                    borderColor: isWrong ? "#dc2626" : "#d4d4d8",
                    backgroundColor: romanTheme ? "#fafafa" : "#ffffff",
                    color: romanTheme ? "#111111" : "#4b5563",
                  }}
                  aria-label={`Distrator ${item.label}`}
                >
                  {item.label}
                </button>
              );
            })}

            {nodes.map((item) => {
              const isVisited = item.seqIndex < currentSeqIndex;
              const isTarget = item.seqIndex === currentSeqIndex;
              const isDualPathDecoy = showDualPathsTrap && dualPathDecoyNodeId === item.id;
              const isWrong = wrongNodeId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNodeClick(item)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 text-lg font-semibold text-zinc-900"
                  style={{
                    left: `${item.xPct}%`,
                    top: `${item.yPct}%`,
                    width: 64,
                    height: 64,
                    backgroundColor: isVisited ? "#e4e4e7" : "#ffffff",
                    borderColor: isWrong ? "#dc2626" : isTarget || isDualPathDecoy ? "#2563eb" : "#d4d4d8",
                    boxShadow: isTarget || isDualPathDecoy
                      ? targetBlinkBlue
                        ? "0 0 0 5px #60a5fa"
                        : "0 0 0 2px #93c5fd"
                      : "none",
                  }}
                  aria-label={`Nó ${item.label}`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {sessionKind !== "practice" && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-black/10 bg-zinc-50 p-3 text-sm">
                <p className="text-zinc-500">Erros totais</p>
                <p className="font-semibold text-zinc-900">{errorsTotal}</p>
              </div>
              <div className="rounded-lg border border-black/10 bg-zinc-50 p-3 text-sm">
                <p className="text-zinc-500">Erros em alvo número</p>
                <p className="font-semibold text-zinc-900">{errorsOnNumberTarget}</p>
              </div>
              <div className="rounded-lg border border-black/10 bg-zinc-50 p-3 text-sm">
                <p className="text-zinc-500">Erros em alvo letra</p>
                <p className="font-semibold text-zinc-900">{errorsOnLetterTarget}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === "practice-feedback" && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5">
          <h3 className="text-xl font-semibold text-zinc-900">Treino concluído</h3>
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
            Este treino é apenas familiarização e não entra na validação final.
          </p>
          <button
            type="button"
            onClick={() => startValidPhase(1, true)}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Continuar
          </button>
        </div>
      )}

      {phase === "phase-feedback" && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5">
          <h3 className="text-xl font-semibold text-zinc-900">Etapa concluída</h3>
          <p className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
            A próxima etapa começa automaticamente e aumenta a exigência de controle inibitório.
          </p>
          <button
            type="button"
            onClick={() => startValidPhase((validPhaseId + 1) as ValidPhaseId, false)}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Continuar
          </button>
        </div>
      )}

      {phase === "result" && result && isResultPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl space-y-4 overflow-y-auto rounded-lg border border-black/10 bg-white p-5 shadow-xl">
            <ResultScreen
              title="Resultado final"
              result={result}
              onDownloadTxt={downloadTXT}
              onContinue={() => {
                setIsResultPopupOpen(false);
                setPhase("intro");
              }}
              continueLabel="Jogar novamente"
            >
              {/* Métricas customizadas do treino */}
              <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
                <p className="text-sm font-semibold text-zinc-900">Métricas por fase (didático)</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {result.phaseMetrics.map((metric: any) => (
                    <div key={metric.phaseId} className="rounded-md border border-zinc-200 bg-white p-2 text-sm">
                      <p className="font-medium text-zinc-900">Fase {metric.phaseId}</p>
                      <p className="text-zinc-700">Velocidade: {metric.clickRatePerSecond.toFixed(3)} cliques/s</p>
                      <p className="text-zinc-700">Maior intervalo: {(metric.maxInterClickMs / 1000).toFixed(2)} s</p>
                    </div>
                  ))}
                  <div className="rounded-md border border-zinc-200 bg-white p-2 text-sm">
                    <p className="font-medium text-zinc-900">Total geral</p>
                    <p className="text-zinc-700">Velocidade: {result.totalClickRatePerSecond.toFixed(3)} cliques/s</p>
                    <p className="text-zinc-700">Maior intervalo: {(result.maxInterClickMs / 1000).toFixed(2)} s</p>
                  </div>
                </div>
              </div>
            </ResultScreen>
          </div>
        </div>
      )}
    </div>
  );
}
