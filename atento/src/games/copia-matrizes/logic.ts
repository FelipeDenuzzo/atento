import {
  MatrixCopyConfig,
  MatrixCopyEvent,
  MatrixCopyGrid,
  MatrixCopyLocked,
  MatrixCopyMetrics,
  MatrixCopySessionResult,
} from "./types";

const SYMBOLS = ["○", "△", "□", "☆", "◆", "◇", "☀", "☂", "✕", "+", "♣", "♠"];

export function createSeededRng(seed: string): () => number {
  if (!seed.trim()) {
    return Math.random;
  }

  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  let state = hash >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const cloned = [...items];
  for (let index = cloned.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [cloned[index], cloned[swap]] = [cloned[swap], cloned[index]];
  }
  return cloned;
}

export function getItemSet(config: MatrixCopyConfig): string[] {
  if (config.itemType === "letters") {
    return Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index));
  }
  if (config.itemType === "numbers") {
    return ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  }
  return SYMBOLS;
}

export function generateModelGrid(config: MatrixCopyConfig): MatrixCopyGrid {
  const rng = createSeededRng(config.seed);
  const itemSet = getItemSet(config);
  const optionCount = Math.max(2, Math.min(config.optionCount || itemSet.length, itemSet.length));
  const activeSet = shuffle(itemSet, rng).slice(0, optionCount);
  const grid: MatrixCopyGrid = [];

  for (let row = 0; row < config.size; row += 1) {
    const rowItems: string[] = [];
    for (let col = 0; col < config.size; col += 1) {
      const item = activeSet[Math.floor(rng() * activeSet.length)] ?? activeSet[0] ?? "";
      rowItems.push(item);
    }
    grid.push(rowItems);
  }

  return grid;
}

export function createCopyGrid(
  modelGrid: MatrixCopyGrid,
  config: MatrixCopyConfig,
): { copyGrid: MatrixCopyGrid; locked: MatrixCopyLocked } {
  const rng = createSeededRng(`${config.seed}-prefill`);
  const size = config.size;
  const totalCells = size * size;
  const prefillCount = Math.floor((totalCells * config.prefillPercent) / 100);

  const allIndexes = shuffle(
    Array.from({ length: totalCells }, (_, index) => index),
    rng,
  );

  const prefilled = new Set(allIndexes.slice(0, prefillCount));

  const copyGrid: MatrixCopyGrid = [];
  const locked: MatrixCopyLocked = [];

  for (let row = 0; row < size; row += 1) {
    const copyRow: string[] = [];
    const lockRow: boolean[] = [];
    for (let col = 0; col < size; col += 1) {
      const idx = row * size + col;
      const isLocked = prefilled.has(idx);
      lockRow.push(isLocked);
      copyRow.push(isLocked ? modelGrid[row]?.[col] ?? "" : "");
    }
    copyGrid.push(copyRow);
    locked.push(lockRow);
  }

  return { copyGrid, locked };
}

export function computeMetrics(params: {
  modelGrid: MatrixCopyGrid;
  copyGrid: MatrixCopyGrid;
  actions: number;
  elapsedMs: number;
}): MatrixCopyMetrics {
  const { modelGrid, copyGrid, actions, elapsedMs } = params;
  const rows = modelGrid.length;
  const cols = modelGrid[0]?.length ?? 0;
  const totalCells = rows * cols;

  let correct = 0;
  let errors = 0;
  let filled = 0;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const modelValue = modelGrid[row]?.[col] ?? "";
      const copyValue = copyGrid[row]?.[col] ?? "";

      if (copyValue !== "") {
        filled += 1;
      }

      if (copyValue === modelValue) {
        correct += 1;
      } else if (copyValue !== "") {
        errors += 1;
      }
    }
  }

  const elapsedSec = elapsedMs / 1000;
  const safeMinutes = Math.max(elapsedSec / 60, 1 / 60);

  return {
    totalCells,
    correct,
    errors,
    filled,
    completeness: totalCells > 0 ? filled / totalCells : 0,
    actions,
    elapsedMs,
    elapsedSec,
    correctPerMinute: correct / safeMinutes,
    errorsPerMinute: errors / safeMinutes,
  };
}

function escapeCsv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function exportCSV(result: MatrixCopySessionResult): string {
  const header = [
    "timestamp",
    "itemType",
    "size",
    "durationSec",
    "prefillPercent",
    "modelVisibleDuringGame",
    "seed",
    "totalCells",
    "correct",
    "errors",
    "filled",
    "completeness",
    "actions",
    "elapsedMs",
    "elapsedSec",
    "correctPerMinute",
    "errorsPerMinute",
    "modelGrid",
    "copyGrid",
    "events",
  ];

  const row = [
    result.timestampIso,
    result.config.itemType,
    String(result.config.size),
    String(result.config.durationSec),
    String(result.config.prefillPercent),
    String(result.config.modelVisibleDuringGame),
    result.config.seed,
    String(result.metrics.totalCells),
    String(result.metrics.correct),
    String(result.metrics.errors),
    String(result.metrics.filled),
    result.metrics.completeness.toFixed(4),
    String(result.metrics.actions),
    String(result.metrics.elapsedMs),
    result.metrics.elapsedSec.toFixed(3),
    result.metrics.correctPerMinute.toFixed(3),
    result.metrics.errorsPerMinute.toFixed(3),
    JSON.stringify(result.modelGrid),
    JSON.stringify(result.copyGrid),
    JSON.stringify(result.events),
  ];

  return [header.join(","), row.map(escapeCsv).join(",")].join("\n");
}

export function exportJSON(result: MatrixCopySessionResult): string {
  return JSON.stringify(result, null, 2);
}

export function buildSessionResult(params: {
  config: MatrixCopyConfig;
  modelGrid: MatrixCopyGrid;
  copyGrid: MatrixCopyGrid;
  metrics: MatrixCopyMetrics;
  events: MatrixCopyEvent[];
}): MatrixCopySessionResult {
  return {
    timestampIso: new Date().toISOString(),
    config: params.config,
    modelGrid: params.modelGrid,
    copyGrid: params.copyGrid,
    metrics: params.metrics,
    events: params.events,
  };
}
