export type ToneType = "grave" | "agudo";

export type RadarToneKeyMap = {
  grave: string;
  agudo: string;
};

export type RadarSpeedModulationMode = "none" | "alternating-up-only";

export type RadarState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

export type ToneEvent = {
  id: number;
  type: ToneType;
  startAtMs: number;
  played: boolean;
  response?: {
    key: string;
    atMs: number;
    reactionMs: number;
    outcome: "correct" | "wrong";
  };
  responseWindowStartedAt?: number;
};

export type RadarToneRoundConfig = {
  id: number;
  name: string;
  durationMs: number;
  arenaSizePx: number;
  dotRadiusPx: number;
  hitTolerancePx: number;
  radarSpeedPxPerSec: number;
  toneIntervalMinMs: number;
  toneIntervalMaxMs: number;
  toneProbabilityAgudo: number;
  responseWindowMinMs: number;
  responseWindowMaxMs: number;
  keyMap: RadarToneKeyMap;
  speedModulationMode?: RadarSpeedModulationMode;
  abruptBoostMultiplier?: number;
  gradualBoostMultiplier?: number;
  modulationWindowMs?: number;
  hasDistractorSphere?: boolean;
  distractorBaseSpeedPxPerSec?: number;
  distractorOscillationAmplitude?: number;
  distractorOscillationPeriodMs?: number;
};

export type RadarToneRoundRuntime = {
  config: RadarToneRoundConfig;
  radarInitialState: RadarState;
  tones: ToneEvent[];
};

export type RadarToneRoundMetrics = {
  durationMs: number;
  radarTrackedMs: number;
  radarTrackedPercent: number;
  totalTones: number;
  toneHits: number;
  toneErrors: number;
  toneOmissions: number;
  toneAccuracyPercent: number;
  meanReactionMs: number;
  dualScore: number;
};

export type RadarToneRoundLog = {
  roundNumber: number;
  roundName: string;
  startedAtIso: string;
  endedAtIso: string;
  metrics: RadarToneRoundMetrics;
};

export type RadarToneSessionResult = {
  startedAtIso: string;
  endedAtIso: string;
  elapsedMs: number;
  rounds: RadarToneRoundLog[];
  averageDualScore: number;
  averageRadarTrackedPercent: number;
  averageToneAccuracyPercent: number;
  firstHalfDualScore: number;
  lastHalfDualScore: number;
  trendSummary: string;
};
