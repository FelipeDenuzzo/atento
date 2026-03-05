import {
  MissingItemConfig,
  MissingItemDifference,
  MissingItemRound,
  MissingItemRoundResponse,
  MissingItemRoundResult,
  MissingItemSessionMetrics,
  MissingItemType,
} from "./types";

const DEFAULT_SYMBOLS = [
  "☆",
  "★",
  "○",
  "●",
  "△",
  "▲",
  "□",
  "■",
  "◇",
  "◆",
  "☀",
  "☂",
  "✕",
  "+",
  "◯",
  "◉",
  "I",
  "1",
  "O",
  "0",
];

const SIMILAR_PAIRS: Record<string, string[]> = {
  O: ["0", "Q", "○"],
  0: ["O", "8", "●"],
  I: ["1", "l", "|"],
  1: ["I", "7", "l"],
  "☆": ["★", "✩", "○"],
  "★": ["☆", "✩", "●"],
};

export function createSeededRng(seed: string): () => number {
  if (!seed.trim()) {
    return Math.random;
  }

  let hash = 2166136261;
  for (let idx = 0; idx < seed.length; idx += 1) {
    hash ^= seed.charCodeAt(idx);
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

function sampleOne<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)] ?? items[0];
}

function sampleMany<T>(items: T[], count: number, rng: () => number): T[] {
  return shuffle(items, rng).slice(0, Math.max(1, Math.min(items.length, count)));
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const cloned = [...items];
  for (let idx = cloned.length - 1; idx > 0; idx -= 1) {
    const swap = Math.floor(rng() * (idx + 1));
    [cloned[idx], cloned[swap]] = [cloned[swap], cloned[idx]];
  }
  return cloned;
}

export function getItemPool(itemType: MissingItemType): string[] {
  if (itemType === "numbers") {
    return ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  }
  if (itemType === "letters") {
    return Array.from({ length: 26 }, (_, idx) => String.fromCharCode(65 + idx));
  }
  return DEFAULT_SYMBOLS;
}

function pickDifferenceKinds(config: MissingItemConfig, rng: () => number): Array<"missing" | "extra"> {
  if (config.differenceMode === "missing") {
    return Array.from({ length: config.differenceCount }, () => "missing");
  }
  if (config.differenceMode === "extra") {
    return Array.from({ length: config.differenceCount }, () => "extra");
  }

  return Array.from({ length: config.differenceCount }, () =>
    rng() > 0.5 ? "missing" : "extra",
  );
}

function getBasePool(pool: string[], itemType: MissingItemType, rng: () => number): string[] {
  const baseSize = itemType === "numbers" ? 6 : 8;
  return sampleMany(pool, baseSize, rng);
}

function pickExtraItem(fullPool: string[], itemsA: string[], itemsB: string[], rng: () => number): string {
  const blocked = new Set([...itemsA, ...itemsB].filter((item) => item !== ""));
  const candidates = fullPool.filter((item) => !blocked.has(item));
  return sampleOne(candidates.length > 0 ? candidates : fullPool, rng);
}

export function generateRound(
  config: MissingItemConfig,
  roundNumber: number,
): MissingItemRound {
  const rng = createSeededRng(`${config.seed || "auto"}-${roundNumber}`);
  const fullPool = getItemPool(config.itemType);
  const basePool = getBasePool(fullPool, config.itemType, rng);
  const totalCells = config.gridSize * config.gridSize;

  const itemsA = Array.from({ length: totalCells }, () => sampleOne(basePool, rng));
  const itemsB: string[] = [...itemsA];

  const shuffledIndexes = shuffle(
    Array.from({ length: totalCells }, (_, idx) => idx),
    rng,
  );

  const differenceKinds = pickDifferenceKinds(config, rng).slice(0, 1);
  const differences: MissingItemDifference[] = [];

  for (let idx = 0; idx < differenceKinds.length; idx += 1) {
    const index = shuffledIndexes[idx] ?? idx;
    const kind = differenceKinds[idx];
    const originalItem = itemsA[index] ?? basePool[0] ?? fullPool[0] ?? "?";

    if (kind === "missing") {
      itemsB[index] = "";
      differences.push({
        index,
        kind,
        expectedItem: originalItem,
        originalItem,
      });
      continue;
    }

    const replacement = pickExtraItem(fullPool, itemsA, itemsB, rng);
    itemsB[index] = replacement;
    differences.push({
      index,
      kind,
      expectedItem: replacement,
      originalItem,
    });
  }

  const targetItems = differences.map((item) => item.expectedItem);
  const fillerOptions = shuffle(
    fullPool.filter((item) => !targetItems.includes(item)),
    rng,
  ).slice(0, 3);

  const options = shuffle(
    Array.from(new Set([...targetItems, ...fillerOptions])),
    rng,
  );

  return {
    roundNumber,
    gridSize: config.gridSize,
    columns: config.layoutMode === "list" ? 1 : config.gridSize,
    itemsA,
    itemsB,
    differences,
    options,
  };
}

export function evaluateRound(
  round: MissingItemRound,
  response: MissingItemRoundResponse,
  responseMode: MissingItemConfig["responseMode"],
): Pick<MissingItemRoundResult, "hits" | "omissions" | "falsePositives" | "correct" | "response"> {
  const expectedIndexes = round.differences.map((item) => item.index);

  if (responseMode === "click-difference") {
    const selected = new Set(
      response.markedCells && response.markedCells.length > 0
        ? response.markedCells.map((item) => `${item.board}:${item.index}`)
        : response.markedIndexes.map((index) => `B:${index}`),
    );
    const expected = new Set(expectedIndexes);

    let hits = 0;
    expected.forEach((index) => {
      if (selected.has(`A:${index}`) || selected.has(`B:${index}`)) hits += 1;
    });

    let falsePositives = 0;
    selected.forEach((cellKey) => {
      const [, indexStr] = cellKey.split(":");
      const parsed = Number(indexStr);
      if (!Number.isFinite(parsed) || !expected.has(parsed)) falsePositives += 1;
    });

    const omissions = expected.size - hits;

    return {
      hits,
      omissions,
      falsePositives,
      correct: omissions === 0 && falsePositives === 0,
      response:
        response.markedCells && response.markedCells.length > 0
          ? response.markedCells.map((item) => `${item.board}:${item.index}`).join("|")
          : response.markedIndexes.join("|") || "(vazio)",
    };
  }

  const expectedItems = round.differences.map((item) => item.expectedItem);
  const selectedItems = Array.from(new Set(response.selectedItems));

  let hits = 0;
  expectedItems.forEach((value) => {
    if (selectedItems.includes(value)) hits += 1;
  });

  const omissions = Math.max(0, expectedItems.length - hits);
  const falsePositives = selectedItems.filter((value) => !expectedItems.includes(value)).length;

  return {
    hits,
    omissions,
    falsePositives,
    correct: omissions === 0 && falsePositives === 0,
    response: selectedItems.join("|") || "(vazio)",
  };
}

export function buildRoundResult(params: {
  config: MissingItemConfig;
  round: MissingItemRound;
  response: MissingItemRoundResponse;
  nowIso?: string;
}): MissingItemRoundResult {
  const { config, round, response, nowIso } = params;
  const evaluated = evaluateRound(round, response, config.responseMode);

  return {
    roundNumber: round.roundNumber,
    timestampIso: nowIso ?? new Date().toISOString(),
    gridSize: round.gridSize,
    presentationMode: config.presentationMode,
    layoutMode: config.layoutMode,
    itemType: config.itemType,
    differenceMode: config.differenceMode,
    responseMode: config.responseMode,
    differenceCount: config.differenceCount,
    targetItems: round.differences.map((item) => item.expectedItem),
    differencePositions: round.differences.map((item) => item.index),
    response: evaluated.response,
    correct: evaluated.correct,
    hits: evaluated.hits,
    omissions: evaluated.omissions,
    falsePositives: evaluated.falsePositives,
    responseTimeMs: response.responseTimeMs,
  };
}

export function computeMetrics(
  results: MissingItemRoundResult[],
  elapsedSec: number,
): MissingItemSessionMetrics {
  const roundsPlayed = results.length;
  const totalHits = results.reduce((sum, item) => sum + item.hits, 0);
  const totalOmissions = results.reduce((sum, item) => sum + item.omissions, 0);
  const totalFalsePositives = results.reduce((sum, item) => sum + item.falsePositives, 0);
  const totalCorrectRounds = results.filter((item) => item.correct).length;

  const minutes = Math.max(elapsedSec / 60, 1 / 60);
  const accuracyPerMinute = totalHits / minutes;
  const averageResponseMs =
    roundsPlayed > 0
      ? results.reduce((sum, item) => sum + item.responseTimeMs, 0) / roundsPlayed
      : 0;

  return {
    roundsPlayed,
    totalHits,
    totalOmissions,
    totalFalsePositives,
    totalCorrectRounds,
    accuracyPerMinute,
    averageResponseMs,
    roundCurve: results.map((item) => ({
      roundNumber: item.roundNumber,
      hits: item.hits,
      omissions: item.omissions,
      falsePositives: item.falsePositives,
      responseTimeMs: item.responseTimeMs,
    })),
  };
}

function escapeCsv(value: string): string {
  const normalized = value.replaceAll('"', '""');
  return `"${normalized}"`;
}

export function exportCSV(results: MissingItemRoundResult[]): string {
  const header = [
    "timestamp",
    "round",
    "size",
    "presentationMode",
    "layoutMode",
    "itemType",
    "differenceType",
    "responseMode",
    "targetItem",
    "differencePositions",
    "response",
    "correct",
    "hits",
    "omissions",
    "falsePositives",
    "responseTimeMs",
  ];

  const rows = results.map((item) =>
    [
      item.timestampIso,
      String(item.roundNumber),
      String(item.gridSize),
      item.presentationMode,
      item.layoutMode,
      item.itemType,
      item.differenceMode,
      item.responseMode,
      item.targetItems.join("|"),
      item.differencePositions.join("|"),
      item.response,
      String(item.correct),
      String(item.hits),
      String(item.omissions),
      String(item.falsePositives),
      String(item.responseTimeMs),
    ].map(escapeCsv).join(","),
  );

  return [header.join(","), ...rows].join("\n");
}

export function exportJSON(results: MissingItemRoundResult[]): string {
  return JSON.stringify(results, null, 2);
}
