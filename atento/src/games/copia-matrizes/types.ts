export type MatrixCopyItemType = "letters" | "numbers" | "symbols";

export type MatrixCopySize = 6 | 8 | 10 | 12;

export type MatrixCopyConfig = {
  itemType: MatrixCopyItemType;
  size: MatrixCopySize;
  optionCount: number;
  durationSec: number;
  prefillPercent: number;
  modelVisibleDuringGame: boolean;
  seed: string;
};

export type MatrixCopyGrid = string[][];

export type MatrixCopyLocked = boolean[][];

export type MatrixCopyEvent = {
  tMs: number;
  type: "click" | "key-cycle" | "key-clear" | "key-nav";
  row: number;
  col: number;
  board: "copy";
  key?: string;
};

export type MatrixCopyMetrics = {
  totalCells: number;
  correct: number;
  errors: number;
  filled: number;
  completeness: number;
  actions: number;
  elapsedMs: number;
  elapsedSec: number;
  correctPerMinute: number;
  errorsPerMinute: number;
};

export type MatrixCopySessionResult = {
  timestampIso: string;
  config: MatrixCopyConfig;
  modelGrid: MatrixCopyGrid;
  copyGrid: MatrixCopyGrid;
  metrics: MatrixCopyMetrics;
  events: MatrixCopyEvent[];
};
