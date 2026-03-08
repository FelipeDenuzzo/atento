export type AnomalyType = "prohibited-icon" | "bar-color" | "alert-flash";

export type ChatOption = {
  id: string;
  text: string;
  isCorrect: boolean;
};

export type ChatMessageEvent = {
  id: number;
  prompt: string;
  options: ChatOption[];
  appearedAtMs: number;
  deadlineAtMs: number;
  answeredAtMs?: number;
  selectedOptionId?: string;
  isCorrect?: boolean;
  responseTimeMs?: number;
  timeout?: boolean;
};

export type AnomalyEvent = {
  id: number;
  type: AnomalyType;
  startedAtMs: number;
  expiresAtMs: number;
  detectedAtMs?: number;
  reactionMs?: number;
  falseAlarmCountWhileActive: number;
  conflictWithActiveMessage: boolean;
  missed?: boolean;
};

export type ChatErrorRoundConfig = {
  id: number;
  name: string;
  durationMs: number;
  messageIntervalMinMs: number;
  messageIntervalMaxMs: number;
  chatResponseWindowMs: number;
  chatOptionsMin: number;
  chatOptionsMax: number;
  anomalyIntervalMinMs: number;
  anomalyIntervalMaxMs: number;
  anomalyVisibleMs: number;
};

export type ChatErrorRoundRuntime = {
  config: ChatErrorRoundConfig;
  nextMessageAtMs: number;
  nextAnomalyAtMs: number;
  messageSeq: number;
  anomalySeq: number;
  currentMessage: ChatMessageEvent | null;
  activeAnomaly: AnomalyEvent | null;
  messages: ChatMessageEvent[];
  anomalies: AnomalyEvent[];
  falseAlarms: number;
};

export type ChatErrorRoundMetrics = {
  durationMs: number;
  chatTotal: number;
  chatAnswered: number;
  chatCorrect: number;
  chatIncorrect: number;
  chatTimeouts: number;
  chatAccuracyPercent: number;
  chatMeanResponseMs: number;
  anomalyTotal: number;
  anomalyDetected: number;
  anomalyMissed: number;
  anomalyDetectionRatePercent: number;
  anomalyMeanReactionMs: number;
  falseAlarms: number;
  conflictCount: number;
  dualScore: number;
};

export type ChatErrorRoundLog = {
  roundNumber: number;
  roundName: string;
  startedAtIso: string;
  endedAtIso: string;
  config: ChatErrorRoundConfig;
  metrics: ChatErrorRoundMetrics;
  messages: ChatMessageEvent[];
  anomalies: AnomalyEvent[];
};

export type ChatErrorSessionResult = {
  startedAtIso: string;
  endedAtIso: string;
  elapsedMs: number;
  rounds: ChatErrorRoundLog[];
  averageDualScore: number;
  averageChatAccuracyPercent: number;
  averageAnomalyDetectionPercent: number;
  firstHalfDualScore: number;
  lastHalfDualScore: number;
  trendSummary: string;
};
