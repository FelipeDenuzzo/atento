export type SwitchRule = "color" | "shape";

export type TrialType = "initial" | "repeat" | "switch";

export type StimulusColor = "red" | "blue";

export type StimulusShape = "circle" | "square";

export type SwitchOutcome = "hit" | "error" | "omission";

export type ResponseKeyMap = {
  color: Record<StimulusColor, string>;
  shape: Record<StimulusShape, string>;
};

export type ColorShapeSwitchRoundConfig = {
  id: number;
  name: string;
  durationMs: number;
  totalTrials: number;
  fixationMinMs: number;
  fixationMaxMs: number;
  responseLimitMs: number;
  interTrialMs: number;
  feedbackMs: number;
  showFeedback: boolean;
  ruleBlockMin: 1;
  ruleBlockMax: 3;
  colors: StimulusColor[];
  shapes: StimulusShape[];
  keyMap: ResponseKeyMap;
};

export type SwitchTrial = {
  id: number;
  rule: SwitchRule;
  trialType: TrialType;
  color: StimulusColor;
  shape: StimulusShape;
  expectedKey: string;
  fixationMs: number;
  shownAtMs: number;
  deadlineAtMs: number;
};

export type SwitchTrialLog = {
  trialIndex: number;
  rule: SwitchRule;
  trialType: TrialType;
  color: StimulusColor;
  shape: StimulusShape;
  expectedKey: string;
  responseKey?: string;
  shownAtMs: number;
  respondedAtMs?: number;
  reactionMs?: number;
  outcome: SwitchOutcome;
};

export type SwitchMetrics = {
  totalTrials: number;
  hits: number;
  errors: number;
  omissions: number;
  accuracyPercent: number;
  meanReactionMs: number;
  meanCorrectReactionMs: number;
  repeatMeanReactionMs: number;
  switchMeanReactionMs: number;
  repeatErrorRatePercent: number;
  switchErrorRatePercent: number;
  switchCostMs: number;
  score: number;
};

export type ColorShapeSwitchRoundLog = {
  roundNumber: number;
  roundName: string;
  startedAtIso: string;
  endedAtIso: string;
  config: ColorShapeSwitchRoundConfig;
  metrics: SwitchMetrics;
  trials: SwitchTrialLog[];
};

export type ColorShapeSwitchSessionResult = {
  startedAtIso: string;
  endedAtIso: string;
  elapsedMs: number;
  rounds: ColorShapeSwitchRoundLog[];
  finalScore: number;
  overallAccuracyPercent: number;
  overallMeanReactionMs: number;
  overallMeanCorrectReactionMs: number;
  overallSwitchCostMs: number;
  overallRepeatErrorRatePercent: number;
  overallSwitchErrorRatePercent: number;
  interpretation: string;
};

export type ColorShapeSwitchRuntime = {
  config: ColorShapeSwitchRoundConfig;
  rules: SwitchRule[];
  trialIndex: number;
  activeTrial: SwitchTrial | null;
  logs: SwitchTrialLog[];
};
