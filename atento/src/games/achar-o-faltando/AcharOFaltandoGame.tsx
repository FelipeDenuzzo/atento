"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReportContext } from "@/components/AttentionTrainingGame";
import { buildTxtReportFileName } from "@/utils/reportFileName";
import {
  buildRoundResult,
  computeMetrics,
  generateRound,
} from "./logic";
import {
  MissingItemConfig,
  MissingItemRound,
  MissingItemRoundResult,
} from "./types";

type Props = {
  basePoints: number;
  startingLevel: number;
  maxLevelHint: number;
  reportContext?: ReportContext;
  onComplete: (result: { success: boolean; pointsEarned: number }) => void;
};

type Phase = "intro" | "running" | "feedback" | "final";

type BoardView = "A" | "B";
type MarkedCell = { board: BoardView; index: number };

type RoundPreset = {
  presentationMode: MissingItemConfig["presentationMode"];
  layoutMode: MissingItemConfig["layoutMode"];
  gridSize: MissingItemConfig["gridSize"];
  itemType: MissingItemConfig["itemType"];
  differenceMode: MissingItemConfig["differenceMode"];
  differenceCount: MissingItemConfig["differenceCount"];
  durationSec: number;
  responseMode: MissingItemConfig["responseMode"];
};

const ROUND_PRESETS: RoundPreset[] = [
  {
    presentationMode: "side-by-side",
    layoutMode: "grid",
    gridSize: 8,
    itemType: "symbols",
    differenceMode: "mixed",
    differenceCount: 1,
    durationSec: 45,
    responseMode: "click-difference",
  },
  {
    presentationMode: "side-by-side",
    layoutMode: "grid",
    gridSize: 8,
    itemType: "numbers",
    differenceMode: "missing",
    differenceCount: 1,
    durationSec: 45,
    responseMode: "click-difference",
  },
  {
    presentationMode: "side-by-side",
    layoutMode: "grid",
    gridSize: 8,
    itemType: "letters",
    differenceMode: "mixed",
    differenceCount: 1,
    durationSec: 50,
    responseMode: "click-difference",
  },
  {
    presentationMode: "side-by-side",
    layoutMode: "grid",
    gridSize: 10,
    itemType: "symbols",
    differenceMode: "mixed",
    differenceCount: 1,
    durationSec: 55,
    responseMode: "click-difference",
  },
  {
    presentationMode: "side-by-side",
    layoutMode: "grid",
    gridSize: 10,
    itemType: "symbols",
    differenceMode: "mixed",
    differenceCount: 2,
    durationSec: 55,
    responseMode: "click-difference",
  },
  {
    presentationMode: "alternating",
    layoutMode: "grid",
    gridSize: 10,
    itemType: "letters",
    differenceMode: "mixed",
    differenceCount: 2,
    durationSec: 60,
    responseMode: "click-difference",
  },
  {
    presentationMode: "side-by-side",
    layoutMode: "grid",
    gridSize: 12,
    itemType: "numbers",
    differenceMode: "missing",
    differenceCount: 2,
    durationSec: 60,
    responseMode: "click-difference",
  },
  {
    presentationMode: "side-by-side",
    layoutMode: "grid",
    gridSize: 12,
    itemType: "symbols",
    differenceMode: "extra",
    differenceCount: 2,
    durationSec: 65,
    responseMode: "click-difference",
  },
  {
    presentationMode: "side-by-side",
    layoutMode: "grid",
    gridSize: 12,
    itemType: "symbols",
    differenceMode: "mixed",
    differenceCount: 3,
    durationSec: 70,
    responseMode: "click-difference",
  },
  {
    presentationMode: "alternating",
    layoutMode: "grid",
    gridSize: 12,
    itemType: "symbols",
    differenceMode: "mixed",
    differenceCount: 3,
    durationSec: 75,
    responseMode: "click-difference",
  },
];

function getRoundConfig(roundNumber: number, sessionSeed: string): MissingItemConfig {
  const preset = ROUND_PRESETS[roundNumber - 1] ?? ROUND_PRESETS[0];
  return {
    ...preset,
    presentationMode: "side-by-side",
    differenceCount: 1,
    responseMode: "click-difference",
    seed: `${sessionSeed}-round-${roundNumber}`,
    roundLimit: ROUND_PRESETS.length,
    highContrast: false,
  };
}

function formatSec(total: number): string {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function AcharOFaltandoGame({
  basePoints,
  reportContext,
  onComplete,
}: Props) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [currentRoundNumber, setCurrentRoundNumber] = useState(1);
  const sessionSeedRef = useRef(`session-${Date.now()}-${Math.random()}`);
  const [currentConfig, setCurrentConfig] = useState<MissingItemConfig>(() =>
    getRoundConfig(1, sessionSeedRef.current),
  );
  const [currentRound, setCurrentRound] = useState<MissingItemRound | null>(null);
  const [remainingSec, setRemainingSec] = useState(
    getRoundConfig(1, sessionSeedRef.current).durationSec,
  );
  const [results, setResults] = useState<MissingItemRoundResult[]>([]);
  const [visibleBoard, setVisibleBoard] = useState<BoardView>("A");
  const [markedIndexes, setMarkedIndexes] = useState<number[]>([]);
  const [markedCells, setMarkedCells] = useState<MarkedCell[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [cursorIndex, setCursorIndex] = useState(0);
  const [feedbackResult, setFeedbackResult] = useState<MissingItemRoundResult | null>(null);

  const roundStartedAtRef = useRef<number>(0);
  const boardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const lockRef = useRef(false);

  const metrics = useMemo(() => {
    const elapsedSec = Math.round(results.reduce((sum, item) => sum + item.responseTimeMs, 0) / 1000);
    return computeMetrics(results, elapsedSec);
  }, [results]);

  const accuracy = useMemo(() => {
    const totalAttempts = metrics.totalHits + metrics.totalOmissions + metrics.totalFalsePositives;
    if (totalAttempts <= 0) return 0;
    return metrics.totalHits / totalAttempts;
  }, [metrics.totalFalsePositives, metrics.totalHits, metrics.totalOmissions]);

  useEffect(() => {
    if (phase !== "running") return;

    const timer = window.setInterval(() => {
      setRemainingSec((value) => {
        if (value <= 1) {
          finalizeRound(true);
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "running" || currentConfig.presentationMode !== "alternating") {
      setVisibleBoard("A");
      return;
    }

    const timer = window.setInterval(() => {
      setVisibleBoard((value) => (value === "A" ? "B" : "A"));
    }, 1200);

    return () => window.clearInterval(timer);
  }, [currentConfig.presentationMode, phase]);

  function startSession() {
    sessionSeedRef.current = `session-${Date.now()}-${Math.random()}`;
    const firstConfig = getRoundConfig(1, sessionSeedRef.current);
    const firstRound = generateRound(firstConfig, 1);
    setCurrentConfig(firstConfig);
    setCurrentRoundNumber(1);
    setCurrentRound(firstRound);
    setRemainingSec(firstConfig.durationSec);
    setResults([]);
    setMarkedIndexes([]);
    setMarkedCells([]);
    setSelectedItems([]);
    setCursorIndex(0);
    setFeedbackResult(null);
    roundStartedAtRef.current = performance.now();
    lockRef.current = false;
    setPhase("running");
  }

  function toggleMark(index: number, board: BoardView) {
    if (phase !== "running" || currentConfig.responseMode !== "click-difference") return;
    setMarkedCells((prev) => {
      const existing = prev.find((item) => item.board === board && item.index === index);
      if (existing) {
        return prev.filter((item) => !(item.board === board && item.index === index));
      }
      return [...prev, { board, index }];
    });
  }

  function toggleSelectedItem(item: string) {
    if (phase !== "running" || currentConfig.responseMode !== "select-item") return;
    setSelectedItems((prev) => {
      const alreadySelected = prev.includes(item);
      if (alreadySelected) return prev.filter((value) => value !== item);
      if (prev.length >= currentConfig.differenceCount) return prev;
      return [...prev, item];
    });
  }

  function clearSelections() {
    setMarkedIndexes([]);
    setMarkedCells([]);
    setSelectedItems([]);
  }

  function goToNextRoundOrFinish() {
    const nextRoundNumber = currentRoundNumber + 1;
    const shouldFinish = remainingSec <= 0 || nextRoundNumber > ROUND_PRESETS.length;

    if (shouldFinish) {
      setPhase("final");
      return;
    }

    const nextConfig = getRoundConfig(nextRoundNumber, sessionSeedRef.current);
    const nextRound = generateRound(nextConfig, nextRoundNumber);
    setCurrentConfig(nextConfig);
    setCurrentRoundNumber(nextRoundNumber);
    setCurrentRound(nextRound);
    setRemainingSec(nextConfig.durationSec);
    setMarkedIndexes([]);
    setMarkedCells([]);
    setSelectedItems([]);
    setCursorIndex(0);
    setFeedbackResult(null);
    roundStartedAtRef.current = performance.now();
    lockRef.current = false;
    setPhase("running");
  }

  function finalizeRound(isTimeout: boolean) {
    if (!currentRound || lockRef.current) return;
    lockRef.current = true;

    const elapsedMs = Math.max(0, Math.round(performance.now() - roundStartedAtRef.current));
    const responseTimeMs = isTimeout ? Math.max(elapsedMs, 1) : elapsedMs;

    const roundResult = buildRoundResult({
      config: currentConfig,
      round: currentRound,
      response: {
        markedIndexes: markedCells
          .filter((item) => item.board === "B")
          .map((item) => item.index),
        markedCells,
        selectedItems,
        responseTimeMs,
      },
    });

    setResults((prev) => [...prev, roundResult]);
    setFeedbackResult(roundResult);
    setPhase("feedback");
  }

  function downloadFile(content: string, fileName: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function downloadTxt() {
    const lines: string[] = [];
    lines.push("== RELATÓRIO - ACHAR O FALTANDO ==");
    lines.push("");
    lines.push(`Rodadas jogadas: ${metrics.roundsPlayed}`);
    lines.push(`Acertos: ${metrics.totalHits}`);
    lines.push(`Omissões: ${metrics.totalOmissions}`);
    lines.push(`Falsos positivos: ${metrics.totalFalsePositives}`);
    lines.push(`Acertos por minuto: ${metrics.accuracyPerMinute.toFixed(2)}`);
    lines.push(`Tempo médio por rodada: ${(metrics.averageResponseMs / 1000).toFixed(1)} s`);
    lines.push("");
    lines.push("Curva por rodada");
    metrics.roundCurve.forEach((entry) => {
      lines.push(
        `- R${entry.roundNumber}: acertos ${entry.hits}, omissões ${entry.omissions}, falsos ${entry.falsePositives}, tempo ${(entry.responseTimeMs / 1000).toFixed(1)} s`,
      );
    });

    downloadFile(
      lines.join("\n"),
      buildTxtReportFileName({
        mode: reportContext?.mode ?? "single",
        attentionTypeLabel: reportContext?.attentionTypeLabel,
        participantName: reportContext?.participantName,
      }),
      "text/plain;charset=utf-8",
    );
  }

  function concludeExercise() {
    const success = accuracy >= 0.65;
    const pointsEarned = Math.max(0, Math.round(basePoints * accuracy));
    onComplete({ success, pointsEarned });
  }

  function renderGrid(items: string[], label: string, clickable: boolean, board: BoardView) {
    if (!currentRound) return null;

    const feedbackIndexes = new Set(feedbackResult?.differencePositions ?? []);

    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
        <div
          className={`grid gap-1 rounded-lg border p-2 ${
            currentConfig.highContrast ? "border-black bg-white" : "border-zinc-200 bg-white"
          }`}
          style={{
            gridTemplateColumns: `repeat(${currentRound.columns}, minmax(0, 1fr))`,
          }}
          onKeyDown={(event) => {
            if (!currentRound) return;

            const columns = currentRound.columns;
            const row = Math.floor(cursorIndex / columns);
            const col = cursorIndex % columns;
            const maxRow = Math.floor((items.length - 1) / columns);

            if (event.key === "ArrowRight") {
              event.preventDefault();
              const next = Math.min(items.length - 1, cursorIndex + 1);
              setCursorIndex(next);
              boardRefs.current[next]?.focus();
            } else if (event.key === "ArrowLeft") {
              event.preventDefault();
              const next = Math.max(0, cursorIndex - 1);
              setCursorIndex(next);
              boardRefs.current[next]?.focus();
            } else if (event.key === "ArrowDown") {
              event.preventDefault();
              const next = Math.min(items.length - 1, (Math.min(maxRow, row + 1) * columns) + col);
              setCursorIndex(next);
              boardRefs.current[next]?.focus();
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              const next = Math.max(0, (Math.max(0, row - 1) * columns) + col);
              setCursorIndex(next);
              boardRefs.current[next]?.focus();
            } else if (event.key === " " && clickable) {
              event.preventDefault();
              toggleMark(cursorIndex, board);
            } else if (event.key === "Enter" && phase === "running") {
              event.preventDefault();
              finalizeRound(false);
            }
          }}
        >
          {items.map((value, index) => {
            const marked = markedCells.some((item) => item.board === board && item.index === index);
            const isDifference = feedbackIndexes.has(index);
            const baseClass = currentConfig.highContrast
              ? "border-black text-black"
              : "border-zinc-200 text-zinc-800";

            const markClass = marked
              ? currentConfig.highContrast
                ? "bg-black text-white"
                : "bg-blue-100 border-blue-300 text-blue-900"
              : currentConfig.highContrast
                ? "bg-white"
                : "bg-zinc-50 hover:bg-zinc-100";

            const feedbackClass =
              phase === "feedback" && (isDifference || marked)
                ? "border-black ring-1 ring-black bg-zinc-100 text-zinc-900"
                : "";

            return (
              <button
                key={`${label}-${index}`}
                ref={(el) => {
                  if (clickable) {
                    boardRefs.current[index] = el;
                  }
                }}
                type="button"
                tabIndex={clickable && index === cursorIndex ? 0 : -1}
                onFocus={() => {
                  if (clickable) setCursorIndex(index);
                }}
                onClick={() => {
                  if (clickable) toggleMark(index, board);
                }}
                className={`aspect-square min-h-8 min-w-8 rounded border text-sm font-semibold transition ${baseClass} ${markClass} ${feedbackClass}`}
                disabled={!clickable || phase !== "running"}
              >
                {value}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
      <div className="space-y-5">
      {phase === "intro" && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5">
          <p>Compare as duas grades (ou listas) que aparecem na tela.</p>
          <p>
            Elas são quase iguais, mas existe uma diferença: em uma delas <strong>falta</strong> um item ou existe um item <strong>a mais</strong>.
          </p>
          <p>Sua tarefa é encontrar essa diferença e marcar onde ela está.</p>
          <p>Vá com calma e confira linha por linha (ou coluna por coluna) até ter certeza.</p>
          <div className="mt-3 rounded-lg border border-black/10 bg-zinc-50 p-3">
            O treino é aplicado em <strong>10 rodadas progressivas</strong>, com dificuldade crescente.<br />
            Você só precisa iniciar e seguir até o final.
          </div>
          <button
            type="button"
            onClick={startSession}
            className="w-full rounded-lg bg-zinc-900 px-4 py-3 font-semibold text-white hover:bg-zinc-700"
          >
            Iniciar treino
          </button>
        </div>
      )}

      {(phase === "running" || phase === "feedback") && currentRound && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Rodada</p>
              <p className="font-semibold text-zinc-900">
                {currentRoundNumber}/{ROUND_PRESETS.length}
              </p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Tempo restante</p>
              <p className="font-semibold text-zinc-900">{formatSec(remainingSec)}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Modo</p>
              <p className="font-semibold text-zinc-900">
                {currentConfig.presentationMode === "side-by-side"
                  ? "Lado a lado"
                  : `Alternância (${visibleBoard})`}
              </p>
            </div>
          </div>

          {currentConfig.responseMode === "select-item" && (
            <div className="space-y-2 rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-sm font-semibold text-zinc-900">Qual item está faltando ou a mais?</p>
              <div className="flex flex-wrap gap-2">
                {currentRound.options.map((option) => {
                  const active = selectedItems.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleSelectedItem(option)}
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                        active
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100"
                      }`}
                      disabled={phase !== "running"}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {currentConfig.presentationMode === "side-by-side" ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {renderGrid(
                currentRound.itemsA,
                "Grade A",
                currentConfig.responseMode === "click-difference",
                "A",
              )}
              {renderGrid(
                currentRound.itemsB,
                "Grade B",
                currentConfig.responseMode === "click-difference",
                "B",
              )}
            </div>
          ) : (
            renderGrid(
              visibleBoard === "A" ? currentRound.itemsA : currentRound.itemsB,
              visibleBoard === "A" ? "Grade A" : "Grade B",
              currentConfig.responseMode === "click-difference",
              visibleBoard,
            )
          )}

          {phase === "feedback" && feedbackResult && (
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3 text-sm text-zinc-700">
              <p>
                Rodada {feedbackResult.roundNumber}: <strong>{feedbackResult.correct ? "Correto" : "Incorreto"}</strong>
              </p>
              <p className="mt-1">Contorno preto = diferença real ou marcação feita.</p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {phase === "running" && (
              <>
                <button
                  type="button"
                  onClick={() => finalizeRound(false)}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  onClick={clearSelections}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                >
                  Limpar marcações
                </button>
              </>
            )}
            {phase === "feedback" && (
              <button
                type="button"
                onClick={goToNextRoundOrFinish}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Próxima rodada
              </button>
            )}
          </div>
        </div>
      )}

      {phase === "final" && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5">
          <h3 className="text-xl font-semibold text-zinc-900">Resultado final</h3>

          {reportContext && (
            <p className="text-sm text-zinc-600">
              {reportContext.mode === "sequence" ? "Trilha" : "Jogo individual"}: {reportContext.scopeLabel}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Rodadas jogadas</p>
              <p className="font-semibold text-zinc-900">{metrics.roundsPlayed}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Acertos</p>
              <p className="font-semibold text-zinc-900">{metrics.totalHits}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Omissões</p>
              <p className="font-semibold text-zinc-900">{metrics.totalOmissions}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Falsos positivos</p>
              <p className="font-semibold text-zinc-900">{metrics.totalFalsePositives}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Acertos por minuto</p>
              <p className="font-semibold text-zinc-900">{metrics.accuracyPerMinute.toFixed(2)}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Tempo médio/rodada</p>
              <p className="font-semibold text-zinc-900">{(metrics.averageResponseMs / 1000).toFixed(1)} s</p>
            </div>
          </div>

          <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Curva por rodada</p>
            <div className="mt-2 space-y-1 text-sm text-zinc-700">
              {metrics.roundCurve.map((entry) => (
                <p key={entry.roundNumber}>
                  R{entry.roundNumber}: acertos {entry.hits} · omissões {entry.omissions} · falsos {entry.falsePositives} · {" "}
                  {(entry.responseTimeMs / 1000).toFixed(1)} s
                </p>
              ))}
              {metrics.roundCurve.length === 0 && <p>Nenhuma rodada concluída.</p>}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={downloadTxt}
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
