"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReportContext } from "@/components/AttentionTrainingGame";
import { buildTxtReportFileName } from "@/utils/reportFileName";
import {
  buildSessionLog,
  computeMetrics,
  generateMatrix,
  SYMBOL_STIMULI,
  saveSessionLog,
  toggleCellMark,
} from "./logic";
import { MatrixCell, MatrixConfig, MatrixMetrics, MatrixSize } from "./types";

type Props = {
  basePoints: number;
  startingLevel: number;
  maxLevelHint: number;
  reportContext?: ReportContext;
  onComplete: (result: { success: boolean; pointsEarned: number }) => void;
};

type Phase = "intro" | "running" | "paused" | "round-result" | "final-result";

type RoundPreset = {
  id: number;
  size: MatrixSize;
  durationSec: number;
  showTargetDuringGame: boolean;
  showContextSymbols: boolean;
};

type RoundOutcome = {
  round: RoundPreset;
  target: string;
  metrics: MatrixMetrics;
};

const TARGET_DENSITY = 0.15;
const ROUND_PRESETS: RoundPreset[] = [
  { id: 1, size: 8, durationSec: 30, showTargetDuringGame: true, showContextSymbols: false },
  { id: 2, size: 10, durationSec: 35, showTargetDuringGame: false, showContextSymbols: false },
  { id: 3, size: 15, durationSec: 45, showTargetDuringGame: true, showContextSymbols: false },
  { id: 4, size: 18, durationSec: 50, showTargetDuringGame: false, showContextSymbols: false },
  { id: 5, size: 20, durationSec: 60, showTargetDuringGame: true, showContextSymbols: true },
  { id: 6, size: 22, durationSec: 60, showTargetDuringGame: false, showContextSymbols: true },
];

function formatSec(value: number): string {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getGridCellClass(size: MatrixSize): string {
  if (size >= 20) return "text-xs";
  if (size >= 15) return "text-sm";
  return "text-base";
}

function buildRoundTargets(totalRounds: number): string[] {
  const shuffled = [...SYMBOL_STIMULI];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, totalRounds);
}

function buildContextSymbols(target: string): string[] {
  const others = SYMBOL_STIMULI.filter((item) => item !== target).slice(0, 4);
  return [others[0] ?? "○", others[1] ?? "△", target, others[2] ?? "□", others[3] ?? "♢"];
}

function buildFinalReport(
  outcomes: RoundOutcome[],
  context?: ReportContext,
): string {
  const totalHits = outcomes.reduce((sum, item) => sum + item.metrics.hits, 0);
  const totalOmissions = outcomes.reduce((sum, item) => sum + item.metrics.omissions, 0);
  const totalCommissions = outcomes.reduce((sum, item) => sum + item.metrics.commissions, 0);
  const totalTime = outcomes.reduce((sum, item) => sum + item.metrics.elapsedSec, 0);
  const totalMarked = outcomes.reduce((sum, item) => sum + item.metrics.totalMarked, 0);
  const totalTargets = outcomes.reduce((sum, item) => sum + item.metrics.totalTargets, 0);
  const precision = totalMarked > 0 ? totalHits / totalMarked : 0;
  const recall = totalTargets > 0 ? totalHits / totalTargets : 0;
  const itemsPerMinute = totalTime > 0 ? totalMarked / (totalTime / 60) : 0;

  const lines: string[] = [];
  lines.push("=" + "=".repeat(60));
  lines.push("RESULTADO - BUSCA DE SÍMBOLOS EM MATRIZ");
  lines.push("=" + "=".repeat(60));
  lines.push("");

  if (context) {
    lines.push(
      `Escopo: ${
        context.mode === "sequence"
          ? `Trilha completa (${context.scopeLabel})`
          : `Jogo individual (${context.scopeLabel})`
      }`,
    );
    lines.push("");
  }

  outcomes.forEach((item) => {
    lines.push(`Rodada ${item.round.id} - Grade ${item.round.size}x${item.round.size}`);
    lines.push(`- Alvo: ${item.target}`);
    lines.push(`- Hits: ${item.metrics.hits}`);
    lines.push(`- Omissões: ${item.metrics.omissions}`);
    lines.push(`- Comissões: ${item.metrics.commissions}`);
    lines.push(`- Tempo: ${item.metrics.elapsedSec}s`);
    lines.push(`- Precisão: ${(item.metrics.precision * 100).toFixed(1)}%`);
    lines.push(`- Recall: ${(item.metrics.recall * 100).toFixed(1)}%`);
    lines.push("");
  });

  lines.push("Resumo final:");
  lines.push(`- Hits: ${totalHits}`);
  lines.push(`- Omissões: ${totalOmissions}`);
  lines.push(`- Comissões: ${totalCommissions}`);
  lines.push(`- Tempo total: ${totalTime}s`);
  lines.push(`- Itens por minuto: ${itemsPerMinute.toFixed(2)}`);
  lines.push(`- Precisão geral: ${(precision * 100).toFixed(1)}%`);
  lines.push(`- Recall geral: ${(recall * 100).toFixed(1)}%`);
  lines.push("");
  lines.push(`Data: ${new Date().toLocaleString("pt-BR")}`);

  return lines.join("\n");
}

export function BuscaSimbolosMatrizGame({
  basePoints,
  reportContext,
  onComplete,
}: Props) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [roundIndex, setRoundIndex] = useState(0);
  const [roundTargets, setRoundTargets] = useState<string[]>(() =>
    buildRoundTargets(ROUND_PRESETS.length),
  );

  const [cells, setCells] = useState<MatrixCell[]>([]);
  const [remainingSec, setRemainingSec] = useState<number>(ROUND_PRESETS[0].durationSec);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [roundOutcomes, setRoundOutcomes] = useState<RoundOutcome[]>([]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cellsRef = useRef<MatrixCell[]>([]);
  const elapsedSecRef = useRef(0);
  const roundConfigRef = useRef<MatrixConfig | null>(null);

  const currentRound = ROUND_PRESETS[roundIndex] ?? ROUND_PRESETS[0];
  const currentTarget = roundTargets[roundIndex] ?? "☆";

  const activeConfig: MatrixConfig = useMemo(
    () => ({
      size: currentRound.size,
      stimulusType: "symbols",
      target: currentTarget,
      targetDensity: TARGET_DENSITY,
      durationSec: currentRound.durationSec,
      seed: `round-${roundIndex + 1}`,
      difficulty: "hard",
    }),
    [currentRound.durationSec, currentRound.size, currentTarget, roundIndex],
  );

  const roundMetrics = useMemo(() => {
    if (phase !== "round-result" && phase !== "final-result") return null;
    return computeMetrics(cells, elapsedSec);
  }, [cells, elapsedSec, phase]);

  const finalMetrics = useMemo(() => {
    if (roundOutcomes.length === 0) return null;
    const totalHits = roundOutcomes.reduce((sum, item) => sum + item.metrics.hits, 0);
    const totalOmissions = roundOutcomes.reduce((sum, item) => sum + item.metrics.omissions, 0);
    const totalCommissions = roundOutcomes.reduce((sum, item) => sum + item.metrics.commissions, 0);
    const totalTime = roundOutcomes.reduce((sum, item) => sum + item.metrics.elapsedSec, 0);
    const totalMarkedAll = roundOutcomes.reduce((sum, item) => sum + item.metrics.totalMarked, 0);
    const totalTargetsAll = roundOutcomes.reduce((sum, item) => sum + item.metrics.totalTargets, 0);
    const precision = totalMarkedAll > 0 ? totalHits / totalMarkedAll : 0;
    const recall = totalTargetsAll > 0 ? totalHits / totalTargetsAll : 0;
    const itemsPerMinute = totalTime > 0 ? totalMarkedAll / (totalTime / 60) : 0;
    return {
      totalHits,
      totalOmissions,
      totalCommissions,
      totalTime,
      precision,
      recall,
      itemsPerMinute,
    };
  }, [roundOutcomes]);

  const finalReportText = useMemo(() => {
    if (roundOutcomes.length === 0) return "";
    return buildFinalReport(roundOutcomes, reportContext);
  }, [reportContext, roundOutcomes]);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const finishSession = useCallback(
    (finalElapsedSec?: number) => {
      clearTimer();
      const elapsedToUse = finalElapsedSec ?? elapsedSecRef.current;
      const summary = computeMetrics(cellsRef.current, elapsedToUse);
      const configForLog = roundConfigRef.current ?? activeConfig;
      const sessionLog = buildSessionLog(configForLog, summary, reportContext);
      saveSessionLog(sessionLog);

      const outcome: RoundOutcome = {
        round: currentRound,
        target: currentTarget,
        metrics: summary,
      };

      setElapsedSec(elapsedToUse);
      setRoundOutcomes((prev) => [...prev, outcome]);
      if (roundIndex + 1 < ROUND_PRESETS.length) {
        setPhase("round-result");
      } else {
        setPhase("final-result");
      }
    },
    [activeConfig, currentRound, currentTarget, reportContext, roundIndex],
  );

  useEffect(() => {
    return () => clearTimer();
  }, []);

  useEffect(() => {
    cellsRef.current = cells;
  }, [cells]);

  useEffect(() => {
    elapsedSecRef.current = elapsedSec;
  }, [elapsedSec]);

  useEffect(() => {
    if (phase !== "running") return;

    clearTimer();
    timerRef.current = setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          clearTimer();
          const finalElapsed = elapsedSecRef.current + 1;
          finishSession(finalElapsed);
          return 0;
        }
        return prev - 1;
      });
      setElapsedSec((prev) => prev + 1);
    }, 1000);

    return () => clearTimer();
  }, [finishSession, phase]);

  function startSession() {
    const runtimeConfig: MatrixConfig = {
      ...activeConfig,
      seed: `${roundIndex + 1}-${Date.now()}-${Math.random()}`,
    };
    roundConfigRef.current = runtimeConfig;
    const generated = generateMatrix(runtimeConfig);
    setCells(generated);
    setRemainingSec(currentRound.durationSec);
    setElapsedSec(0);
    setPhase("running");
  }

  function toggleMark(cellId: string) {
    if (phase !== "running") return;
    setCells((prev) => toggleCellMark(prev, cellId));
  }

  function pauseSession() {
    if (phase !== "running") return;
    clearTimer();
    setPhase("paused");
  }

  function resumeSession() {
    if (phase !== "paused") return;
    setPhase("running");
  }

  function downloadResults() {
    if (roundOutcomes.length === 0) return;
    const txt = buildFinalReport(roundOutcomes, reportContext);
    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
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
    if (!finalMetrics) {
      onComplete({ success: false, pointsEarned: 0 });
      return;
    }

    const success = finalMetrics.recall >= 0.7 && finalMetrics.precision >= 0.7;
    const quality = (finalMetrics.recall + finalMetrics.precision) / 2;
    const pointsEarned = Math.round(basePoints * quality);
    onComplete({ success, pointsEarned });
  }

  function goToNextRound() {
    if (roundIndex + 1 >= ROUND_PRESETS.length) {
      setPhase("final-result");
      return;
    }
    roundConfigRef.current = null;
    setRoundIndex((prev) => prev + 1);
    setPhase("intro");
  }

  function restartAllRounds() {
    setRoundTargets(buildRoundTargets(ROUND_PRESETS.length));
    setRoundIndex(0);
    setCells([]);
    setRemainingSec(ROUND_PRESETS[0].durationSec);
    setElapsedSec(0);
    setRoundOutcomes([]);
    roundConfigRef.current = null;
    setPhase("intro");
  }

  const contextSymbols = useMemo(
    () => buildContextSymbols(currentTarget),
    [currentTarget],
  );

  return (
    <div className="space-y-5">
      {phase === "intro" && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5">
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-xs text-zinc-500">ALVO</p>

            {!currentRound.showContextSymbols ? (
              <div className="mt-2 flex justify-center">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-lg border border-zinc-300 bg-zinc-50 text-2xl font-bold text-zinc-900">
                  {currentTarget}
                </div>
              </div>
            ) : (
              <div className="mt-2 flex items-center justify-center gap-2 text-2xl">
                {contextSymbols.map((symbol, idx) => (
                  <span
                    key={`${symbol}-${idx}`}
                    className={
                      symbol === currentTarget && idx === 2
                        ? "inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-rose-500 font-semibold text-zinc-900"
                        : "inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 font-semibold text-zinc-900"
                    }
                  >
                    {symbol}
                  </span>
                ))}
              </div>
            )}

            <p className="mt-3 text-center text-xs font-bold text-zinc-600">
              {currentRound.showTargetDuringGame
                ? "Nesta rodada, o alvo continua visível durante o jogo."
                : "Nesta rodada, o alvo aparece somente nesta tela inicial."}
            </p>
          </div>

          <button
            type="button"
            onClick={startSession}
            className="w-full rounded-lg bg-zinc-900 px-4 py-3 font-semibold text-white hover:bg-zinc-700"
          >
            Iniciar rodada
          </button>
        </div>
      )}

      {(phase === "running" || phase === "paused") && (
        <div className="space-y-4">
          <div className="rounded-lg border border-black/10 bg-zinc-50 p-3 text-center text-sm font-medium text-zinc-700">
            {phase === "paused" ? "Pausado" : `Rodada em andamento · ${formatSec(remainingSec)}`}
          </div>

          {currentRound.showTargetDuringGame && (
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              {currentRound.showContextSymbols ? (
                <div className="flex items-center justify-center gap-2 text-2xl">
                  {buildContextSymbols(currentTarget).map((symbol, idx) => (
                    <span
                      key={`running-${symbol}-${idx}`}
                      className={
                        symbol === currentTarget && idx === 2
                          ? "inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-rose-500 font-semibold text-zinc-900"
                          : "inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 font-semibold text-zinc-900"
                      }
                    >
                      {symbol}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-center text-2xl font-semibold text-zinc-900">{currentTarget}</p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            {phase === "running" ? (
              <button
                type="button"
                onClick={pauseSession}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Pausar
              </button>
            ) : (
              <button
                type="button"
                onClick={resumeSession}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Retomar
              </button>
            )}
            <button
              type="button"
              onClick={() => finishSession()}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Finalizar agora
            </button>
          </div>

          <div
            className={`grid gap-1 rounded-lg border border-zinc-200 bg-white p-2 ${phase === "paused" ? "opacity-60" : ""}`}
            style={{
              gridTemplateColumns: `repeat(${currentRound.size}, minmax(0, 1fr))`,
            }}
          >
            {cells.map((cell) => (
              <button
                key={cell.id}
                type="button"
                disabled={phase === "paused"}
                onClick={() => toggleMark(cell.id)}
                className={`aspect-square rounded border transition ${
                  cell.marked
                    ? "border-blue-400 bg-blue-100 text-blue-900"
                    : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
                } ${getGridCellClass(currentRound.size)}`}
              >
                {cell.value}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === "round-result" && roundMetrics && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5">
          <h3 className="text-xl font-semibold text-zinc-900">Etapa concluída</h3>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Hits</p>
              <p className="font-semibold text-zinc-900">{roundMetrics.hits}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Omissões</p>
              <p className="font-semibold text-zinc-900">{roundMetrics.omissions}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Comissões</p>
              <p className="font-semibold text-zinc-900">{roundMetrics.commissions}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={goToNextRound}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Próxima rodada
          </button>
        </div>
      )}

      {phase === "final-result" && finalMetrics && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5">
          <h3 className="text-xl font-semibold text-zinc-900">Resultado final</h3>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Hits</p>
              <p className="font-semibold text-zinc-900">{finalMetrics.totalHits}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Omissões</p>
              <p className="font-semibold text-zinc-900">{finalMetrics.totalOmissions}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Comissões</p>
              <p className="font-semibold text-zinc-900">{finalMetrics.totalCommissions}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Tempo total</p>
              <p className="font-semibold text-zinc-900">{finalMetrics.totalTime}s</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Itens/minuto</p>
              <p className="font-semibold text-zinc-900">{finalMetrics.itemsPerMinute.toFixed(2)}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Precisão / Recall</p>
              <p className="font-semibold text-zinc-900">
                {(finalMetrics.precision * 100).toFixed(1)}% / {(finalMetrics.recall * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Relatório</p>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs text-zinc-800">{finalReportText}</pre>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={downloadResults}
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
            <button
              type="button"
              onClick={restartAllRounds}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              Repetir sequência
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
