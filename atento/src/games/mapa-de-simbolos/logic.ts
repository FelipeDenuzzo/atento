import {
  ClickOutcome,
  SessionScopeContext,
  SymbolMapCell,
  SymbolMapLevelConfig,
  SymbolMapLevelLog,
  SymbolMapLevelResult,
} from "./types";

export const SYMBOL_MAP_LOG_KEY = "atento.symbolMap.logs";

function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

function randomItem<T>(items: T[], rng: () => number = Math.random): T {
  return items[Math.floor(rng() * items.length)];
}

export function countTargetsBySymbol(cells: SymbolMapCell[]): Record<string, number> {
  return cells.reduce<Record<string, number>>((acc, cell) => {
    if (!cell.isTarget || !cell.targetSymbol) return acc;
    acc[cell.targetSymbol] = (acc[cell.targetSymbol] ?? 0) + 1;
    return acc;
  }, {});
}

export function generateBoard(
  level: SymbolMapLevelConfig,
  rng: () => number = Math.random,
): SymbolMapCell[] {
  const totalCells = level.rows * level.cols;
  const targetSymbols = level.targetSymbols;
  const targetCount = Math.min(level.targetCount, totalCells - 1);

  const perTarget = targetSymbols.map((symbol, index) => {
    const base = Math.floor(targetCount / targetSymbols.length);
    const extra = index < targetCount % targetSymbols.length ? 1 : 0;
    return { symbol, count: base + extra };
  });

  const targets: SymbolMapCell[] = perTarget.flatMap(({ symbol, count }, index) =>
    Array.from({ length: count }, (_, itemIndex) => ({
      id: `target-${index}-${itemIndex}`,
      symbol,
      isTarget: true,
      targetSymbol: symbol,
      found: false,
    })),
  );

  const distractorCount = totalCells - targets.length;
  const distractors: SymbolMapCell[] = Array.from({ length: distractorCount }, (_, index) => ({
    id: `dist-${index}`,
    symbol: randomItem(level.distractorSymbols, rng),
    isTarget: false,
    found: false,
  }));

  return shuffle([...targets, ...distractors], rng).map((cell, index) => ({
    ...cell,
    id: `${cell.id}-${index}`,
  }));
}

export function evaluateCellClick(
  cells: SymbolMapCell[],
  cellId: string,
): {
  updatedCells: SymbolMapCell[];
  outcome: ClickOutcome;
  foundIncrement: number;
  missIncrement: number;
} {
  const cell = cells.find((entry) => entry.id === cellId);
  if (!cell) {
    return { updatedCells: cells, outcome: "miss", foundIncrement: 0, missIncrement: 1 };
  }

  if (cell.isTarget && !cell.found) {
    const updatedCells = cells.map((entry) =>
      entry.id === cellId ? { ...entry, found: true } : entry,
    );
    return { updatedCells, outcome: "hit", foundIncrement: 1, missIncrement: 0 };
  }

  if (cell.isTarget && cell.found) {
    return { updatedCells: cells, outcome: "already-found", foundIncrement: 0, missIncrement: 0 };
  }

  return { updatedCells: cells, outcome: "miss", foundIncrement: 0, missIncrement: 1 };
}

export function calculateAccuracy(hits: number, misses: number): number {
  const clicks = hits + misses;
  if (clicks === 0) return 0;
  return hits / clicks;
}

export function isRoundCompleted(params: {
  targetsFound: number;
  totalTargets: number;
  elapsedMs: number;
  timeLimitSec: number;
}): { completed: boolean; success: boolean } {
  if (params.targetsFound >= params.totalTargets) {
    return { completed: true, success: true };
  }
  if (params.elapsedMs >= params.timeLimitSec * 1000) {
    return { completed: true, success: false };
  }
  return { completed: false, success: false };
}

export function buildLevelResult(input: {
  level: SymbolMapLevelConfig;
  timeElapsedMs: number;
  board: SymbolMapCell[];
  targetsFound: number;
  misses: number;
  completed: boolean;
}): SymbolMapLevelResult {
  const totalTargets = input.board.filter((cell) => cell.isTarget).length;
  const byTargetTotal = countTargetsBySymbol(input.board);
  const byTargetFound = input.board.reduce<Record<string, number>>((acc, cell) => {
    if (!cell.isTarget || !cell.targetSymbol || !cell.found) return acc;
    acc[cell.targetSymbol] = (acc[cell.targetSymbol] ?? 0) + 1;
    return acc;
  }, {});

  const byTarget = Object.keys(byTargetTotal).reduce<Record<string, { total: number; found: number }>>(
    (acc, key) => {
      acc[key] = { total: byTargetTotal[key], found: byTargetFound[key] ?? 0 };
      return acc;
    },
    {},
  );

  return {
    levelId: input.level.id,
    levelName: input.level.name,
    timeElapsedMs: input.timeElapsedMs,
    timeLimitSec: input.level.timeLimitSec,
    totalTargets,
    targetsFound: input.targetsFound,
    misses: input.misses,
    accuracy: calculateAccuracy(input.targetsFound, input.misses),
    completed: input.completed,
    byTarget,
  };
}

export function buildLevelLog(
  result: SymbolMapLevelResult,
  session?: SessionScopeContext,
): SymbolMapLevelLog {
  return {
    dateIso: new Date().toISOString(),
    ...(session ? { session } : {}),
    result,
  };
}

export function saveLevelLog(log: SymbolMapLevelLog): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(SYMBOL_MAP_LOG_KEY);
    const parsed: SymbolMapLevelLog[] = raw ? JSON.parse(raw) : [];
    parsed.unshift(log);
    window.localStorage.setItem(SYMBOL_MAP_LOG_KEY, JSON.stringify(parsed.slice(0, 80)));
  } catch (error) {
    console.error("Failed to save symbol map log:", error);
  }
}
