export type DriveSignsTargetMode = "pare-text" | "red-sign";

export type DriveInputState = {
  leftPressed: boolean;
  rightPressed: boolean;
};

export type CarState = {
  x: number;
  vx: number;
};

export type TrackState = {
  laneCenterX: number;
  driftPhase: number;
};

export type SignKind = "target" | "distractor";

export type SignVisual = {
  label: string;
  colorClass: string;
};

export type SignInstance = {
  id: number;
  kind: SignKind;
  spawnedAtMs: number;
  y: number;
  speedPxPerSec: number;
  heightPx: number;
  visual: SignVisual;
  answeredAtMs?: number;
  outcome?: "hit" | "ignored";
};

export type CarSample = {
  atMs: number;
  carX: number;
  laneCenterX: number;
  insideLane: boolean;
};

export type DriveSignsRoundConfig = {
  id: number;
  name: string;
  durationMs: number;
  arenaWidthPx: number;
  arenaHeightPx: number;
  laneWidthPx: number;
  carWidthPx: number;
  carHeightPx: number;
  carMaxSpeedPxPerSec: number;
  carAccelerationPxPerSec2: number;
  carFrictionPerSec: number;
  driftAmplitudePx: number;
  driftPeriodMs: number;
  signSpawnMinMs: number;
  signSpawnMaxMs: number;
  signTargetProbability: number;
  signFallMinPxPerSec: number;
  signFallMaxPxPerSec: number;
  targetMode: DriveSignsTargetMode;
};

export type DriveSignsRoundRuntime = {
  config: DriveSignsRoundConfig;
  startedAtMs: number;
  nextSignAtMs: number;
  signSeq: number;
  car: CarState;
  track: TrackState;
  signs: SignInstance[];
  archivedSigns: SignInstance[];
  carSamples: CarSample[];
  insideMs: number;
  outsideMs: number;
  falsePositives: number;
  targetCount: number;
  hits: number;
  omissions: number;
};

export type DriveSignsRoundMetrics = {
  durationMs: number;
  inLaneMs: number;
  outLaneMs: number;
  inLanePercent: number;
  totalTargets: number;
  hits: number;
  falsePositives: number;
  omissions: number;
  hitRatePercent: number;
  dualScore: number;
};

export type DriveSignsRoundLog = {
  roundNumber: number;
  roundName: string;
  startedAtIso: string;
  endedAtIso: string;
  config: DriveSignsRoundConfig;
  metrics: DriveSignsRoundMetrics;
  carSamples: CarSample[];
  signs: SignInstance[];
};

export type DriveSignsSessionResult = {
  startedAtIso: string;
  endedAtIso: string;
  elapsedMs: number;
  rounds: DriveSignsRoundLog[];
  averageDualScore: number;
  averageInLanePercent: number;
  averageHitRatePercent: number;
  firstThirdDualScore: number;
  middleThirdDualScore: number;
  lastThirdDualScore: number;
  trendSummary: string;
};
