"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReportContext } from "@/components/AttentionTrainingGame";
import { buildTxtReportFileName } from "@/utils/reportFileName";
import {
  buildSessionResult,
  computeMetrics,
  createCopyGrid,
  generateModelGrid,
  getItemSet,
} from "./logic";
import {
  MatrixCopyConfig,
  MatrixCopyEvent,
  MatrixCopyGrid,
  MatrixCopyLocked,
  MatrixCopySessionResult,
} from "./types";

type Props = {
  basePoints: number;
  startingLevel: number;
  maxLevelHint: number;
  reportContext?: ReportContext;
  onComplete: (result: { success: boolean; pointsEarned: number }) => void;
};

type Phase = "intro" | "memorize" | "running" | "paused" | "round-feedback" | "result";

type PopupState = {
  open: boolean;
  row: number;
  col: number;
  optionIndex: number;
};

type RoundPreset = {
  itemType: MatrixCopyConfig["itemType"];
  size: MatrixCopyConfig["size"];
  optionCount: number;
  durationSec: number;
  prefillPercent: number;
  modelVisibleDuringGame: boolean;
};

const MEMORIZE_SEC = 4;

const ROUND_PRESETS: RoundPreset[] = [
  { itemType: "letters", size: 6, optionCount: 6, durationSec: 70, prefillPercent: 20, modelVisibleDuringGame: true },
  { itemType: "numbers", size: 6, optionCount: 6, durationSec: 70, prefillPercent: 18, modelVisibleDuringGame: true },
  { itemType: "symbols", size: 8, optionCount: 7, durationSec: 90, prefillPercent: 16, modelVisibleDuringGame: true },
  { itemType: "letters", size: 8, optionCount: 7, durationSec: 95, prefillPercent: 14, modelVisibleDuringGame: false },
  { itemType: "numbers", size: 10, optionCount: 8, durationSec: 110, prefillPercent: 12, modelVisibleDuringGame: false },
  { itemType: "symbols", size: 12, optionCount: 8, durationSec: 130, prefillPercent: 10, modelVisibleDuringGame: false },
];

function getRoundConfig(roundIndex: number, sessionSeed: string): MatrixCopyConfig {
  const preset = ROUND_PRESETS[roundIndex] ?? ROUND_PRESETS[0];
  return {
    ...preset,
    modelVisibleDuringGame: true,
    seed: `${sessionSeed}-copy-r${roundIndex + 1}`,
  };
}

export function CopiaMatrizesGame({ basePoints, reportContext, onComplete }: Props) {
  const sessionSeedRef = useRef(`copy-${Date.now()}-${Math.random()}`);
  const [phase, setPhase] = useState<Phase>("intro");
  const [roundIndex, setRoundIndex] = useState(0);
  const [config, setConfig] = useState<MatrixCopyConfig>(() =>
    getRoundConfig(0, sessionSeedRef.current),
  );
  const [modelGrid, setModelGrid] = useState<MatrixCopyGrid>([]);
  const [copyGrid, setCopyGrid] = useState<MatrixCopyGrid>([]);
  const [locked, setLocked] = useState<MatrixCopyLocked>([]);
  const [remainingMs, setRemainingMs] = useState(config.durationSec * 1000);
  const [actionsCount, setActionsCount] = useState(0);
  const [events, setEvents] = useState<MatrixCopyEvent[]>([]);
  const [focusCell, setFocusCell] = useState<{ row: number; col: number }>({ row: 0, col: 0 });
  const [popup, setPopup] = useState<PopupState>({ open: false, row: 0, col: 0, optionIndex: 0 });
  const [allRoundResults, setAllRoundResults] = useState<MatrixCopySessionResult[]>([]);
  const cellRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const popupRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const elapsedRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const itemSet = useMemo(() => {
    const fromModel = modelGrid.flat().filter((value, idx, arr) => arr.indexOf(value) === idx);
    if (fromModel.length > 0) return fromModel;
    return getItemSet(config).slice(0, config.optionCount);
  }, [config, modelGrid]);

  function clearTimer() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function formatTime(ms: number): string {
    const sec = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function runCountdownTick(deltaMs: number) {
    setRemainingMs((current) => {
      const next = current - deltaMs;
      if (next <= 0) {
        elapsedRef.current = config.durationSec * 1000;
        clearTimer();
        finalizeSession(config.durationSec * 1000);
        return 0;
      }
      elapsedRef.current += deltaMs;
      return next;
    });
  }

  function startRunningTimer() {
    clearTimer();
    intervalRef.current = setInterval(() => runCountdownTick(100), 100);
  }

  function startMemorizePhase() {
    setPhase("memorize");
    clearTimer();
    let memorizeLeft = MEMORIZE_SEC * 1000;
    intervalRef.current = setInterval(() => {
      memorizeLeft -= 100;
      if (memorizeLeft <= 0) {
        clearTimer();
        setPhase("running");
        startRunningTimer();
      }
    }, 100);
  }

  function startRound(index: number) {
    const runtimeConfig = getRoundConfig(index, sessionSeedRef.current);

    const generatedModel = generateModelGrid(runtimeConfig);
    const { copyGrid: generatedCopy, locked: generatedLocked } = createCopyGrid(
      generatedModel,
      runtimeConfig,
    );

    setConfig(runtimeConfig);
    setRoundIndex(index);
    setModelGrid(generatedModel);
    setCopyGrid(generatedCopy);
    setLocked(generatedLocked);
    setRemainingMs(runtimeConfig.durationSec * 1000);
    setActionsCount(0);
    setEvents([]);
    setPopup({ open: false, row: 0, col: 0, optionIndex: 0 });
    setFocusCell({ row: 0, col: 0 });
    elapsedRef.current = 0;

    if (runtimeConfig.modelVisibleDuringGame) {
      setPhase("running");
      startRunningTimer();
    } else {
      startMemorizePhase();
    }
  }

  function startSession() {
    sessionSeedRef.current = `copy-${Date.now()}-${Math.random()}`;
    setAllRoundResults([]);
    startRound(0);
  }

  function pauseSession() {
    if (phase !== "running") return;
    clearTimer();
    setPopup((prev) => ({ ...prev, open: false }));
    setPhase("paused");
  }

  function resumeSession() {
    if (phase !== "paused") return;
    setPhase("running");
    startRunningTimer();
  }

  function restartSession() {
    clearTimer();
    setPhase("intro");
    setRoundIndex(0);
    setModelGrid([]);
    setCopyGrid([]);
    setLocked([]);
    setRemainingMs(getRoundConfig(0, sessionSeedRef.current).durationSec * 1000);
    setActionsCount(0);
    setEvents([]);
    setPopup({ open: false, row: 0, col: 0, optionIndex: 0 });
    setAllRoundResults([]);
    elapsedRef.current = 0;
  }

  function finalizeSession(elapsedOverrideMs?: number) {
    clearTimer();
    const elapsedMs = elapsedOverrideMs ?? elapsedRef.current;

    const metrics = computeMetrics({
      modelGrid,
      copyGrid,
      actions: actionsCount,
      elapsedMs,
    });

    const result = buildSessionResult({
      config,
      modelGrid,
      copyGrid,
      metrics,
      events,
    });

    setAllRoundResults((prev) => [...prev, result]);
    setPopup((prev) => ({ ...prev, open: false }));
    setPhase("round-feedback");
  }

  function pushEvent(event: Omit<MatrixCopyEvent, "tMs" | "board">) {
    setEvents((prev) => [
      ...prev,
      {
        tMs: elapsedRef.current,
        board: "copy",
        ...event,
      },
    ]);
  }

  function findNextEmptyCell(fromRow: number, fromCol: number): { row: number; col: number } | null {
    const total = config.size * config.size;
    const start = fromRow * config.size + fromCol;
    for (let offset = 1; offset <= total; offset += 1) {
      const index = (start + offset) % total;
      const row = Math.floor(index / config.size);
      const col = index % config.size;
      if (!locked[row]?.[col] && (copyGrid[row]?.[col] ?? "") === "") {
        return { row, col };
      }
    }
    return null;
  }

  function openPopup(row: number, col: number) {
    if (phase !== "running") return;
    if (locked[row]?.[col]) return;

    const current = copyGrid[row]?.[col] ?? "";
    const optionIndex = Math.max(0, itemSet.indexOf(current));
    setPopup({ open: true, row, col, optionIndex });
    setFocusCell({ row, col });
  }

  function chooseOption(index: number, source: "click" | "key-cycle") {
    if (!popup.open) return;
    const row = popup.row;
    const col = popup.col;
    const nextValue = itemSet[index] ?? "";

    setCopyGrid((prev) => {
      const clone = prev.map((line) => [...line]);
      if (clone[row]) clone[row][col] = nextValue;
      return clone;
    });

    setActionsCount((value) => value + 1);
    pushEvent({ type: source, row, col });

    setPopup((prev) => ({ ...prev, open: false }));

    const next = findNextEmptyCell(row, col);
    if (next) {
      setFocusCell(next);
      window.setTimeout(() => {
        const idx = next.row * config.size + next.col;
        cellRefs.current[idx]?.focus();
      }, 0);
      return;
    }

    window.setTimeout(() => {
      const idx = row * config.size + col;
      cellRefs.current[idx]?.focus();
    }, 0);
  }

  function focusByIndex(row: number, col: number) {
    const idx = row * config.size + col;
    cellRefs.current[idx]?.focus();
    setFocusCell({ row, col });
  }

  function handleGridKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (phase !== "running") return;

    const max = config.size - 1;
    const { row, col } = focusCell;

    if (event.key === "ArrowRight") {
      event.preventDefault();
      const nextCol = Math.min(max, col + 1);
      focusByIndex(row, nextCol);
      pushEvent({ type: "key-nav", row, col: nextCol, key: event.key });
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      const nextCol = Math.max(0, col - 1);
      focusByIndex(row, nextCol);
      pushEvent({ type: "key-nav", row, col: nextCol, key: event.key });
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const nextRow = Math.min(max, row + 1);
      focusByIndex(nextRow, col);
      pushEvent({ type: "key-nav", row: nextRow, col, key: event.key });
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      const nextRow = Math.max(0, row - 1);
      focusByIndex(nextRow, col);
      pushEvent({ type: "key-nav", row: nextRow, col, key: event.key });
      return;
    }

    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      openPopup(row, col);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setPopup((prev) => ({ ...prev, open: false }));
    }
  }

  function onPopupKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!popup.open) return;

    const cols = Math.min(4, itemSet.length);
    const max = itemSet.length - 1;

    if (event.key === "ArrowRight") {
      event.preventDefault();
      setPopup((prev) => ({ ...prev, optionIndex: Math.min(max, prev.optionIndex + 1) }));
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setPopup((prev) => ({ ...prev, optionIndex: Math.max(0, prev.optionIndex - 1) }));
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setPopup((prev) => ({ ...prev, optionIndex: Math.min(max, prev.optionIndex + cols) }));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setPopup((prev) => ({ ...prev, optionIndex: Math.max(0, prev.optionIndex - cols) }));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      chooseOption(popup.optionIndex, "key-cycle");
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setPopup((prev) => ({ ...prev, open: false }));
    }
  }

  function downloadFile(content: string, fileName: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function downloadTXT() {
    if (allRoundResults.length === 0 || !resultMetrics) return;
    const lines: string[] = [];
    lines.push("== RELATÓRIO - CÓPIA DE MATRIZES ==");
    lines.push("");
    lines.push(`Rodadas concluídas: ${allRoundResults.length}`);
    lines.push(`Total de células: ${resultMetrics.totalCells}`);
    lines.push(`Acertos: ${resultMetrics.correct}`);
    lines.push(`Erros: ${resultMetrics.errors}`);
    lines.push(`Completude: ${(resultMetrics.completeness * 100).toFixed(1)}%`);
    lines.push(`Ações totais: ${resultMetrics.actions}`);
    lines.push(`Tempo total: ${resultMetrics.elapsedSec.toFixed(1)} s`);
    lines.push(`Acertos/min: ${resultMetrics.correctPerMinute.toFixed(2)}`);
    lines.push(`Erros/min: ${resultMetrics.errorsPerMinute.toFixed(2)}`);
    lines.push("");
    allRoundResults.forEach((round, index) => {
      lines.push(`Rodada ${index + 1}`);
      lines.push(`- Células: ${round.metrics.totalCells}`);
      lines.push(`- Acertos: ${round.metrics.correct}`);
      lines.push(`- Erros: ${round.metrics.errors}`);
      lines.push(`- Tempo: ${(round.metrics.elapsedMs / 1000).toFixed(1)} s`);
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
    if (allRoundResults.length === 0) {
      onComplete({ success: false, pointsEarned: 0 });
      return;
    }

    const aggregate = allRoundResults.reduce(
      (sum, item) => ({
        totalCells: sum.totalCells + item.metrics.totalCells,
        correct: sum.correct + item.metrics.correct,
      }),
      { totalCells: 0, correct: 0 },
    );

    const quality = aggregate.totalCells > 0 ? aggregate.correct / aggregate.totalCells : 0;
    const success = quality >= 0.75;
    const pointsEarned = Math.round(basePoints * quality);
    onComplete({ success, pointsEarned });
  }

  function renderGrid(params: {
    title: string;
    grid: MatrixCopyGrid;
    interactive: boolean;
    lockedGrid?: MatrixCopyLocked;
  }) {
    const { title, grid, interactive, lockedGrid } = params;
    if (grid.length === 0) return null;

    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</p>
        <div
          className="grid gap-1 rounded-lg border border-zinc-200 bg-white p-2"
          style={{ gridTemplateColumns: `repeat(${config.size}, minmax(0, 1fr))` }}
          onKeyDown={interactive ? handleGridKeyDown : undefined}
        >
          {grid.map((rowValues, row) =>
            rowValues.map((value, col) => {
              const idx = row * config.size + col;
              const cellLocked = lockedGrid?.[row]?.[col] ?? false;
              return (
                <div key={`${title}-${row}-${col}`} className="relative">
                  <button
                    ref={(el) => {
                      if (interactive) {
                        cellRefs.current[idx] = el;
                      }
                    }}
                    type="button"
                    onFocus={() => setFocusCell({ row, col })}
                    onClick={() => {
                      if (!interactive) return;
                      openPopup(row, col);
                    }}
                    disabled={!interactive || phase !== "running" || cellLocked}
                    className={`aspect-square min-h-8 min-w-8 rounded border text-sm font-semibold transition ${
                      cellLocked
                        ? "border-zinc-300 bg-zinc-100 text-zinc-500"
                        : interactive
                          ? "border-zinc-200 bg-zinc-50 text-zinc-900 hover:bg-zinc-100"
                          : "border-zinc-200 bg-zinc-50 text-zinc-900"
                    }`}
                  >
                    {value}
                  </button>

                  {interactive && popup.open && popup.row === row && popup.col === col && (
                    <div
                      className="matrix-popup absolute left-0 top-full z-20 mt-1 w-max min-w-[10rem] rounded-lg border border-zinc-300 bg-white p-2 shadow-sm"
                      onKeyDown={onPopupKeyDown}
                      tabIndex={0}
                    >
                      <div
                        className="grid gap-1"
                        style={{ gridTemplateColumns: `repeat(${Math.min(4, itemSet.length)}, minmax(0, 1fr))` }}
                      >
                        {itemSet.map((item, index) => (
                          <button
                            key={`option-${item}-${index}`}
                            ref={(el) => {
                              popupRefs.current[index] = el;
                            }}
                            type="button"
                            onClick={() => chooseOption(index, "click")}
                            className={`flex h-9 min-w-9 items-center justify-center rounded border px-2 py-1 text-sm font-semibold ${
                              index === popup.optionIndex
                                ? "border-zinc-900 bg-zinc-900 text-white"
                                : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100"
                            }`}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            }),
          )}
        </div>
      </div>
    );
  }

  useEffect(() => {
    return () => clearTimer();
  }, []);

  useEffect(() => {
    if (!popup.open) return;
    const index = Math.max(0, Math.min(itemSet.length - 1, popup.optionIndex));
    window.setTimeout(() => popupRefs.current[index]?.focus(), 0);
  }, [itemSet.length, popup.open, popup.optionIndex]);

  const resultMetrics = useMemo(() => {
    if (allRoundResults.length === 0) return null;

    const aggregate = allRoundResults.reduce(
      (sum, item) => ({
        totalCells: sum.totalCells + item.metrics.totalCells,
        correct: sum.correct + item.metrics.correct,
        errors: sum.errors + item.metrics.errors,
        filled: sum.filled + item.metrics.filled,
        actions: sum.actions + item.metrics.actions,
        elapsedMs: sum.elapsedMs + item.metrics.elapsedMs,
      }),
      { totalCells: 0, correct: 0, errors: 0, filled: 0, actions: 0, elapsedMs: 0 },
    );

    const elapsedSec = aggregate.elapsedMs / 1000;
    const safeMinutes = Math.max(elapsedSec / 60, 1 / 60);

    return {
      ...aggregate,
      elapsedSec,
      completeness: aggregate.totalCells > 0 ? aggregate.filled / aggregate.totalCells : 0,
      correctPerMinute: aggregate.correct / safeMinutes,
      errorsPerMinute: aggregate.errors / safeMinutes,
    };
  }, [allRoundResults]);

  return (
    <div className="space-y-5">
      {phase === "intro" && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5">
          <button
            type="button"
            onClick={startSession}
            className="w-full rounded-lg bg-zinc-900 px-4 py-3 font-semibold text-white hover:bg-zinc-700"
          >
            Iniciar treino
          </button>
        </div>
      )}

      {(phase === "memorize" || phase === "running" || phase === "paused" || phase === "round-feedback") && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Tempo</p>
              <p className="font-semibold text-zinc-900">{formatTime(remainingMs)}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Rodada</p>
              <p className="font-semibold text-zinc-900">{roundIndex + 1}/{ROUND_PRESETS.length}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Ações</p>
              <p className="font-semibold text-zinc-900">{actionsCount}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Modo</p>
              <p className="font-semibold text-zinc-900">
                {phase === "memorize" ? "Memorização" : phase === "paused" ? "Pausado" : "Em execução"}
              </p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Matriz</p>
              <p className="font-semibold text-zinc-900">{config.size}x{config.size}</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {phase === "memorize" || config.modelVisibleDuringGame
              ? renderGrid({ title: "Modelo", grid: modelGrid, interactive: false })
              : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Modelo</p>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                    Modelo oculto nesta rodada.
                  </div>
                </div>
              )}

            {renderGrid({
              title: "Sua cópia",
              grid: copyGrid,
              interactive: true,
              lockedGrid: locked,
            })}
          </div>

          <div className="flex flex-wrap gap-3">
            {phase === "running" && (
              <button
                type="button"
                onClick={pauseSession}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Pausar
              </button>
            )}
            {phase === "paused" && (
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
              onClick={restartSession}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              Reiniciar
            </button>
            <button
              type="button"
              onClick={() => finalizeSession()}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              disabled={phase !== "running" && phase !== "paused"}
            >
              Finalizar
            </button>
            {phase === "round-feedback" && (
              <button
                type="button"
                onClick={() => {
                  const next = roundIndex + 1;
                  if (next >= ROUND_PRESETS.length) {
                    setPhase("result");
                  } else {
                    startRound(next);
                  }
                }}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Próxima rodada
              </button>
            )}
          </div>
        </div>
      )}

      {phase === "result" && resultMetrics && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5">
          <h3 className="text-xl font-semibold text-zinc-900">Resultado final</h3>
          {reportContext && (
            <p className="text-sm text-zinc-600">
              {reportContext.mode === "sequence" ? "Trilha" : "Jogo individual"}: {reportContext.scopeLabel}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Total de células</p>
              <p className="font-semibold text-zinc-900">{resultMetrics.totalCells}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Acertos</p>
              <p className="font-semibold text-zinc-900">{resultMetrics.correct}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Erros</p>
              <p className="font-semibold text-zinc-900">{resultMetrics.errors}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Completude</p>
              <p className="font-semibold text-zinc-900">{(resultMetrics.completeness * 100).toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Ações totais</p>
              <p className="font-semibold text-zinc-900">{resultMetrics.actions}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Tempo gasto</p>
              <p className="font-semibold text-zinc-900">
                {resultMetrics.elapsedMs} ms ({resultMetrics.elapsedSec.toFixed(1)} s)
              </p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Acerto/min</p>
              <p className="font-semibold text-zinc-900">{resultMetrics.correctPerMinute.toFixed(2)}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Erros/min</p>
              <p className="font-semibold text-zinc-900">{resultMetrics.errorsPerMinute.toFixed(2)}</p>
            </div>
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
