export type RuleMode = "normal" | "inverted";

export type TrialType = "first" | "repeat" | "switch";

export type StimulusShape = "star" | "circle" | "square" | "triangle";

export type StimulusKind = "target" | "non-target";

export type ReversalOutcome = "hit" | "commission" | "omission";

export type ReversalRoundConfig = {
  id: number;
  name: string;
  durationMs: number;
  totalTrials: number;
  fixationMinMs: number;
  fixationMaxMs: number;
  cueMs: number;
  responseLimitMs: number;
  interTrialMs: number;
  feedbackMs: number;
  showFeedback: boolean;
  switchRate: number;
  targetRate: number;
};

export type ReversalTrial = {
  id: number;
  rule: RuleMode;
  trialType: TrialType;
  stimulusShape: StimulusShape;
  stimulusKind: StimulusKind;
  expectedClick: boolean;
  fixationMs: number;
  cueEndsAtMs: number;
  shownAtMs: number;
  deadlineAtMs: number;
};

export type ReversalTrialLog = {
  trialIndex: number;
  rule: RuleMode;
  trialType: TrialType;
  stimulusShape: StimulusShape;
  stimulusKind: StimulusKind;
  expectedClick: boolean;
  clicked: boolean;
  correct: boolean;
  outcome: ReversalOutcome;
  shownAtMs: number;
  respondedAtMs?: number;
  reactionMs?: number;
  timedOut: boolean;
};

export type ReversalMetrics = {
  totalTrials: number;
  hits: number;
  commissions: number;
  omissions: number;
  accuracyPercent: number;
  meanReactionMs: number;
  meanCorrectReactionMs: number;
  normalAccuracyPercent: number;
  invertedAccuracyPercent: number;
  normalMeanReactionMs: number;
  invertedMeanReactionMs: number;
  repeatAccuracyPercent: number;
  switchAccuracyPercent: number;
  repeatMeanReactionMs: number;
  switchMeanReactionMs: number;
  switchCostMs: number;
  score: number;
};

export type ReversalRoundLog = {
  roundNumber: number;
  roundName: string;
  startedAtIso: string;
  endedAtIso: string;
  config: ReversalRoundConfig;
  metrics: ReversalMetrics;
  trials: ReversalTrialLog[];
};

export type ReversalSessionResult = {
  startedAtIso: string;
  endedAtIso: string;
  elapsedMs: number;
  rounds: ReversalRoundLog[];
  finalScore: number;
  overallAccuracyPercent: number;
  overallMeanReactionMs: number;
  overallMeanCorrectReactionMs: number;
  overallSwitchCostMs: number;
  overallNormalAccuracyPercent: number;
  overallInvertedAccuracyPercent: number;
  overallCommissionCount: number;
  overallOmissionCount: number;
  interpretation: string;
};

export type ReversalRuntime = {
  config: ReversalRoundConfig;
  rules: RuleMode[];
  trialIndex: number;
  activeTrial: ReversalTrial | null;
  logs: ReversalTrialLog[];
};
