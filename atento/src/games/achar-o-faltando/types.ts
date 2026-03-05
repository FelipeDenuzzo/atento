export type MissingItemPresentationMode = "side-by-side" | "alternating";

export type MissingItemLayoutMode = "list" | "grid";

export type MissingItemType = "numbers" | "letters" | "symbols";

export type MissingItemDifferenceMode = "missing" | "extra" | "mixed";

export type MissingItemResponseMode = "click-difference" | "select-item";

export type MissingItemGridSize = 8 | 10 | 12;

export type MissingItemDifferenceCount = 1 | 2 | 3;

export type MissingItemConfig = {
  presentationMode: MissingItemPresentationMode;
  layoutMode: MissingItemLayoutMode;
  gridSize: MissingItemGridSize;
  itemType: MissingItemType;
  differenceMode: MissingItemDifferenceMode;
  differenceCount: MissingItemDifferenceCount;
  durationSec: number;
  roundLimit: number;
  seed: string;
  responseMode: MissingItemResponseMode;
  highContrast: boolean;
};

export type MissingItemDifference = {
  index: number;
  kind: "missing" | "extra";
  expectedItem: string;
  originalItem: string;
};

export type MissingItemRound = {
  roundNumber: number;
  gridSize: MissingItemGridSize;
  columns: number;
  itemsA: string[];
  itemsB: string[];
  differences: MissingItemDifference[];
  options: string[];
};

export type MissingItemRoundResponse = {
  markedIndexes: number[];
  markedCells?: Array<{
    board: "A" | "B";
    index: number;
  }>;
  selectedItems: string[];
  responseTimeMs: number;
};

export type MissingItemRoundResult = {
  roundNumber: number;
  timestampIso: string;
  gridSize: number;
  presentationMode: MissingItemPresentationMode;
  layoutMode: MissingItemLayoutMode;
  itemType: MissingItemType;
  differenceMode: MissingItemDifferenceMode;
  responseMode: MissingItemResponseMode;
  differenceCount: number;
  targetItems: string[];
  differencePositions: number[];
  response: string;
  correct: boolean;
  hits: number;
  omissions: number;
  falsePositives: number;
  responseTimeMs: number;
};

export type MissingItemSessionMetrics = {
  roundsPlayed: number;
  totalHits: number;
  totalOmissions: number;
  totalFalsePositives: number;
  totalCorrectRounds: number;
  accuracyPerMinute: number;
  averageResponseMs: number;
  roundCurve: Array<{
    roundNumber: number;
    hits: number;
    omissions: number;
    falsePositives: number;
    responseTimeMs: number;
  }>;
};
