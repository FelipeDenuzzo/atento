export type VerticalPosition = "top" | "bottom";

export type TrialType = "first" | "repeat" | "switch";

export type StimulusColor = "blue" | "green";

export type StimulusShape = "square" | "rectangle";

export type RelevantDimension = "color" | "shape";

export type ColorKeyMap = Record<StimulusColor, string>;

export type ShapeKeyMap = Record<StimulusShape, string>;

export type RuleTopConfig = {
  id: "A";
  dimension: RelevantDimension;
  colorKeyMap: ColorKeyMap;
  shapeKeyMap: ShapeKeyMap;
};

export type RuleBottomConfig = {
  id: "B";
  dimension: RelevantDimension;
  colorKeyMap: ColorKeyMap;
  shapeKeyMap: ShapeKeyMap;
};

export type PositionRuleRoundConfig = {
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
  switchRate: number;
  colors: StimulusColor[];
  shapes: StimulusShape[];
  topRule: RuleTopConfig;
  bottomRule: RuleBottomConfig;
};

export type PositionRuleStimulus = {
  color: StimulusColor;
  shape: StimulusShape;
};

export type PositionRuleTrial = {
  id: number;
  position: VerticalPosition;
  rule: "A" | "B";
  trialType: TrialType;
  relevantDimension: RelevantDimension;
  stimulus: PositionRuleStimulus;
  expectedKey: string;
  fixationMs: number;
  shownAtMs: number;
  deadlineAtMs: number;
};

export type PositionRuleOutcome = "hit" | "error" | "omission";

export type PositionRuleTrialLog = {
  trialIndex: number;
  position: VerticalPosition;
  rule: "A" | "B";
  trialType: TrialType;
  relevantDimension: RelevantDimension;
  stimulusColor: StimulusColor;
  stimulusShape: StimulusShape;
  expectedKey: string;
  pressedKey?: string;
  correct: boolean;
  outcome: PositionRuleOutcome;
  shownAtMs: number;
  respondedAtMs?: number;
  reactionMs?: number;
  timedOut: boolean;
};

export type PositionRuleMetrics = {
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
  ruleAAccuracyPercent: number;
  ruleBAccuracyPercent: number;
  ruleAMeanReactionMs: number;
  ruleBMeanReactionMs: number;
  score: number;
};

export type PositionRuleRoundLog = {
  roundNumber: number;
  roundName: string;
  startedAtIso: string;
  endedAtIso: string;
  config: PositionRuleRoundConfig;
  metrics: PositionRuleMetrics;
  trials: PositionRuleTrialLog[];
};

export type PositionRuleSessionResult = {
  startedAtIso: string;
  endedAtIso: string;
  elapsedMs: number;
  rounds: PositionRuleRoundLog[];
  finalScore: number;
  overallAccuracyPercent: number;
  overallMeanReactionMs: number;
  overallMeanCorrectReactionMs: number;
  overallSwitchCostMs: number;
  overallRepeatErrorRatePercent: number;
  overallSwitchErrorRatePercent: number;
  overallRuleAAccuracyPercent: number;
  overallRuleBAccuracyPercent: number;
  interpretation: string;
};

export type PositionRuleRuntime = {
  config: PositionRuleRoundConfig;
  positions: VerticalPosition[];
  trialIndex: number;
  activeTrial: PositionRuleTrial | null;
  logs: PositionRuleTrialLog[];
};
