import {
  SelectionResult,
  WordDirection,
  WordPlacement,
  WordSearchRound,
  WordSearchRoundConfig,
  WordSearchRoundLog,
  WordSearchSessionResult,
} from "./types";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function createSeededRng(seed: string): () => number {
  if (!seed.trim()) return Math.random;

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

function normalizeWord(word: string): string {
  return word
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();
}

function directionDelta(direction: WordDirection): { dr: number; dc: number } {
  if (direction === "H") return { dr: 0, dc: 1 };
  if (direction === "V") return { dr: 1, dc: 0 };
  return { dr: 1, dc: 1 };
}

function canPlaceWord(
  grid: string[][],
  word: string,
  row: number,
  col: number,
  dr: number,
  dc: number,
): boolean {
  const size = grid.length;
  for (let i = 0; i < word.length; i += 1) {
    const r = row + dr * i;
    const c = col + dc * i;
    if (r < 0 || c < 0 || r >= size || c >= size) return false;
    const cell = grid[r]?.[c] ?? "";
    const char = word[i] ?? "";
    if (cell !== "" && cell !== char) return false;
  }
  return true;
}

function writeWord(
  grid: string[][],
  word: string,
  row: number,
  col: number,
  dr: number,
  dc: number,
): void {
  for (let i = 0; i < word.length; i += 1) {
    const r = row + dr * i;
    const c = col + dc * i;
    if (grid[r]) {
      grid[r][c] = word[i] ?? "";
    }
  }
}

function shuffleInPlace<T>(items: T[], rng: () => number): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = items[i];
    items[i] = items[j] as T;
    items[j] = tmp as T;
  }
  return items;
}

function getCandidatesForWord(params: {
  grid: string[][];
  word: string;
  direction: WordDirection;
}): Array<{ row: number; col: number; dr: number; dc: number }> {
  const { grid, word, direction } = params;
  const { dr, dc } = directionDelta(direction);
  const size = grid.length;
  const candidates: Array<{ row: number; col: number; dr: number; dc: number }> = [];

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (canPlaceWord(grid, word, row, col, dr, dc)) {
        candidates.push({ row, col, dr, dc });
      }
    }
  }

  return candidates;
}

export function placeWords(config: WordSearchRoundConfig): { grid: string[][]; placements: WordPlacement[] } {
  const rng = createSeededRng(config.seed);
  const size = config.size;
  const normalizedWords = config.words.map(normalizeWord).filter((word) => word.length > 0);
  const words = [...normalizedWords].sort((a, b) => b.length - a.length);

  const layoutAttempts = 18;
  let lastFailedWord = words[0] ?? "";
  let grid: string[][] = [];
  let placements: WordPlacement[] = [];

  for (let layoutTry = 0; layoutTry < layoutAttempts; layoutTry += 1) {
    grid = Array.from({ length: size }, () => Array.from({ length: size }, () => ""));
    placements = [];

    const orderedWords = [...words];
    const maxLen = orderedWords[0]?.length ?? 0;
    const longWords = orderedWords.filter((w) => w.length === maxLen);
    const restWords = orderedWords.filter((w) => w.length !== maxLen);
    shuffleInPlace(longWords, rng);
    shuffleInPlace(restWords, rng);
    const layoutWords = [...longWords, ...restWords];

    let layoutFailed = false;

    for (const rawWord of layoutWords) {
      const directionPool = shuffleInPlace([...config.allowedDirections], rng);
      const reversePool = config.allowReverse ? shuffleInPlace([false, true], rng) : [false];
      let placed = false;

      for (const direction of directionPool) {
        for (const reversed of reversePool) {
          const word = reversed ? rawWord.split("").reverse().join("") : rawWord;
          const candidates = getCandidatesForWord({ grid, word, direction });
          if (candidates.length === 0) continue;

          shuffleInPlace(candidates, rng);
          const selected = candidates[0];
          if (!selected) continue;

          writeWord(grid, word, selected.row, selected.col, selected.dr, selected.dc);
          const endRow = selected.row + selected.dr * (word.length - 1);
          const endCol = selected.col + selected.dc * (word.length - 1);

          placements.push({
            word: rawWord,
            startRow: selected.row,
            startCol: selected.col,
            endRow,
            endCol,
            direction,
            reversed,
          });

          placed = true;
          break;
        }
        if (placed) break;
      }

      if (!placed) {
        lastFailedWord = rawWord;
        layoutFailed = true;
        break;
      }
    }

    if (!layoutFailed) break;
  }

  if (placements.length !== words.length) {
    throw new Error(`Não foi possível posicionar a palavra: ${lastFailedWord}`);
  }

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (grid[row]?.[col] === "") {
        const letter = ALPHABET[Math.floor(rng() * ALPHABET.length)] ?? "A";
        grid[row][col] = letter;
      }
    }
  }

  return { grid, placements };
}

export function generateGrid(config: WordSearchRoundConfig): WordSearchRound {
  const { grid, placements } = placeWords(config);
  return {
    config,
    grid,
    placements,
  };
}

function buildPath(start: { row: number; col: number }, end: { row: number; col: number }) {
  const dr = Math.sign(end.row - start.row);
  const dc = Math.sign(end.col - start.col);
  const lenR = Math.abs(end.row - start.row);
  const lenC = Math.abs(end.col - start.col);

  if (!((dr === 0 && dc !== 0) || (dr !== 0 && dc === 0) || (dr !== 0 && dc !== 0 && lenR === lenC))) {
    return null;
  }

  const steps = Math.max(lenR, lenC);
  const path: Array<{ row: number; col: number }> = [];

  for (let i = 0; i <= steps; i += 1) {
    path.push({ row: start.row + dr * i, col: start.col + dc * i });
  }

  return path;
}

export function handleSelection(params: {
  grid: string[][];
  start: { row: number; col: number };
  end: { row: number; col: number };
  wordsToFind: string[];
  foundWords: Set<string>;
}): SelectionResult {
  const path = buildPath(params.start, params.end);
  if (!path || path.length === 0) {
    return { valid: false };
  }

  const forward = path.map((p) => params.grid[p.row]?.[p.col] ?? "").join("");
  const backward = forward.split("").reverse().join("");

  const remainingWords = params.wordsToFind.filter((word) => !params.foundWords.has(word));

  const matched = remainingWords.find((word) => word === forward || word === backward);
  if (!matched) {
    return { valid: false, path };
  }

  return {
    valid: true,
    word: matched,
    path,
  };
}

export function computeMetrics(params: {
  startedAtMs: number;
  endedAtMs: number;
  roundLogs: WordSearchRoundLog[];
}): WordSearchSessionResult {
  const elapsedMs = Math.max(0, params.endedAtMs - params.startedAtMs);
  const totalInvalidSelections = params.roundLogs.reduce((sum, round) => sum + round.invalidSelections, 0);
  const wordsFoundTotal = params.roundLogs.reduce((sum, round) => sum + round.wordsFound, 0);
  const wordsTotal = params.roundLogs.reduce((sum, round) => sum + round.wordsTotal, 0);

  const allFoundTimes = params.roundLogs
    .flatMap((round) => round.foundWords.map((item) => item.foundAtMs))
    .sort((a, b) => a - b);

  const avgWordTimeMs = allFoundTimes.length > 0
    ? allFoundTimes.reduce((sum, time) => sum + time, 0) / allFoundTimes.length
    : 0;

  const thirdSize = Math.max(1, Math.floor(allFoundTimes.length / 3));
  const firstThird = allFoundTimes.slice(0, thirdSize);
  const lastThird = allFoundTimes.slice(-thirdSize);

  const firstThirdAvgMs = firstThird.length > 0
    ? firstThird.reduce((sum, value) => sum + value, 0) / firstThird.length
    : 0;
  const lastThirdAvgMs = lastThird.length > 0
    ? lastThird.reduce((sum, value) => sum + value, 0) / lastThird.length
    : 0;

  const summaryText =
    wordsFoundTotal > 0
      ? `Primeiro terço: ${(firstThirdAvgMs / 1000).toFixed(1)}s por palavra; último terço: ${(lastThirdAvgMs / 1000).toFixed(1)}s.`
      : "Não houve palavras encontradas para comparar desempenho.";

  return {
    startedAtIso: new Date(params.startedAtMs).toISOString(),
    endedAtIso: new Date(params.endedAtMs).toISOString(),
    elapsedMs,
    rounds: params.roundLogs,
    totalInvalidSelections,
    wordsFoundTotal,
    wordsTotal,
    avgWordTimeMs,
    firstThirdAvgMs,
    lastThirdAvgMs,
    summaryText,
  };
}

function escapeCsv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function exportCSV(result: WordSearchSessionResult): string {
  const header = [
    "startedAt",
    "endedAt",
    "elapsedMs",
    "wordsFoundTotal",
    "wordsTotal",
    "invalidSelections",
    "avgWordTimeMs",
    "firstThirdAvgMs",
    "lastThirdAvgMs",
    "summary",
    "rounds",
  ];

  const row = [
    result.startedAtIso,
    result.endedAtIso,
    String(result.elapsedMs),
    String(result.wordsFoundTotal),
    String(result.wordsTotal),
    String(result.totalInvalidSelections),
    result.avgWordTimeMs.toFixed(2),
    result.firstThirdAvgMs.toFixed(2),
    result.lastThirdAvgMs.toFixed(2),
    result.summaryText,
    JSON.stringify(result.rounds),
  ];

  return [header.join(","), row.map(escapeCsv).join(",")].join("\n");
}

export function exportJSON(result: WordSearchSessionResult): string {
  return JSON.stringify(result, null, 2);
}
