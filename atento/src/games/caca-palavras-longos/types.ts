export type WordDirection = "H" | "V" | "D";

export type WordPlacement = {
  word: string;
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  direction: WordDirection;
  reversed: boolean;
};

export type WordSearchRoundConfig = {
  size: number;
  words: string[];
  allowedDirections: WordDirection[];
  allowReverse: boolean;
  seed: string;
};

export type WordSearchRound = {
  config: WordSearchRoundConfig;
  grid: string[][];
  placements: WordPlacement[];
};

export type SelectionResult = {
  valid: boolean;
  word?: string;
  path?: Array<{ row: number; col: number }>;
};

export type FoundWordRecord = {
  word: string;
  foundAtMs: number;
  wrongAttemptsBeforeHit: number;
};

export type WordSearchRoundLog = {
  roundNumber: number;
  size: number;
  startedAtIso: string;
  endedAtIso: string;
  elapsedMs: number;
  wordsTotal: number;
  wordsFound: number;
  invalidSelections: number;
  foundWords: FoundWordRecord[];
};

export type WordSearchSessionResult = {
  startedAtIso: string;
  endedAtIso: string;
  elapsedMs: number;
  rounds: WordSearchRoundLog[];
  totalInvalidSelections: number;
  wordsFoundTotal: number;
  wordsTotal: number;
  avgWordTimeMs: number;
  firstThirdAvgMs: number;
  lastThirdAvgMs: number;
  summaryText: string;
};
