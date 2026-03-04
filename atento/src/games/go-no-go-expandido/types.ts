export type ItemCategory = "fruta" | "objeto";

export type GoNoGoExpandidoLevelConfig = {
  id: number;
  name: string;
  trialsPerBlock: number;
  goProbability: number;
  maxItemsPerWindow: number;
  exposureMs: number;
  itiMs: number;
};

export type StimulusItem = {
  id: string;
  emoji: string;
  label: string;
  category: ItemCategory;
};

export type GoNoGoExpandidoTrial = {
  id: string;
  levelId: number;
  items: StimulusItem[];
  targetCategory: ItemCategory;
  shouldClick: boolean;
};

export type BlockMetrics = {
  goCorrect: number;
  nogoCorrect: number;
  commissionErrors: number;
  omissionErrors: number;
  reactionTimesMs: number[];
};

export type BlockSummary = {
  totalTrials: number;
  goCorrect: number;
  nogoCorrect: number;
  commissionErrors: number;
  omissionErrors: number;
  avgReactionMs: number | null;
  medianReactionMs: number | null;
  commissionRate: number;
  omissionRate: number;
  accuracy: number;
};

export type BlockLog = {
  dateIso: string;
  session?: {
    mode: "single" | "sequence";
    scopeLabel: string;
  };
  levelId: number;
  levelName: string;
  config: {
    trialsPerBlock: number;
    goProbability: number;
    exposureMs: number;
    itiMs: number;
    maxItemsPerWindow: number;
  };
  summary: BlockSummary;
};
