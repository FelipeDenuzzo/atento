export type StimulusType = "numbers" | "symbols";

export type DifficultyMode = "normal" | "hard";

export type MatrixSize = 8 | 10 | 15 | 18 | 20 | 22;

export type MatrixCell = {
  id: string;
  value: string;
  isTarget: boolean;
  marked: boolean;
};

export type MatrixConfig = {
  size: MatrixSize;
  stimulusType: StimulusType;
  target: string;
  targetDensity: number;
  durationSec: number;
  seed: string;
  difficulty: DifficultyMode;
};

export type MatrixMetrics = {
  hits: number;
  omissions: number;
  commissions: number;
  totalTargets: number;
  totalMarked: number;
  elapsedSec: number;
  itemsPerMinute: number;
  precision: number;
  recall: number;
};

export type SessionScopeContext = {
  mode: "single" | "sequence";
  scopeLabel: string;
};

export type MatrixSessionLog = {
  dateIso: string;
  session?: SessionScopeContext;
  config: MatrixConfig;
  metrics: MatrixMetrics;
};
