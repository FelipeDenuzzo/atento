export type DriveWordInputState = {
  leftPressed: boolean;
  rightPressed: boolean;
};

export type WordBlock = {
  id: number;
  word: string;
  isTarget: boolean;
  side: "left" | "right";
  spawnedAtMs: number;
  y: number;
  heightPx: number;
  speedPxPerSec: number;
  answeredAtMs?: number;
  responseType?: "hit" | "omission";
};

export type DriveWordSample = {
  atMs: number;
  bandCenterX: number;
  markerX: number;
  insideBand: boolean;
};

export type DriveWordRoundConfig = {
  id: number;
  name: string;
  durationMs: number;
  arenaWidthPx: number;
  arenaHeightPx: number;
  bandWidthPx: number;
  greenZoneRatio: number;
  markerWidthPx: number;
  markerMaxSpeedPxPerSec: number;
  markerAccelerationPxPerSec2: number;
  markerFrictionPerSec: number;
  bandMaxSpeedPxPerSec: number;
  bandAccelerationPxPerSec2: number;
  earlyReturnChance: number;
  greenMaxSpeedPxPerSec: number;
  greenAccelerationPxPerSec2: number;
  greenEarlyReturnChance: number;
  responseLineTolerancePx: number;
  spawnMinMs: number;
  spawnMaxMs: number;
  targetProbability: number;
  blockFallMinPxPerSec: number;
  blockFallMaxPxPerSec: number;
  words: string[];
  targetWord: string;
};

export type DriveWordRoundRuntime = {
  config: DriveWordRoundConfig;
  input: DriveWordInputState;
  markerX: number;
  markerVx: number;
  bandCenterX: number;
  bandVelocityX: number;
  bandTargetX: number;
  greenOffsetX: number;
  greenVelocityX: number;
  greenTargetOffsetX: number;
  nextBlockAtMs: number;
  blockSeq: number;
  activeBlocks: WordBlock[];
  archivedBlocks: WordBlock[];
  samples: DriveWordSample[];
  insideMs: number;
  outsideMs: number;
  totalBlocks: number;
  targetBlocks: number;
  hits: number;
  hitsInsideGreen: number;
  falsePositives: number;
  omissions: number;
  active: boolean;
};

export type DriveWordRoundMetrics = {
  durationMs: number;
  insideMs: number;
  outsideMs: number;
  insidePercent: number;
  totalBlocks: number;
  targetBlocks: number;
  hits: number;
  hitsInsideGreen: number;
  falsePositives: number;
  omissions: number;
  hitRatePercent: number;
  hitInsideGreenRatePercent: number;
  dualScore: number;
};

export type DriveWordRoundLog = {
  roundNumber: number;
  roundName: string;
  startedAtIso: string;
  endedAtIso: string;
  config: DriveWordRoundConfig;
  metrics: DriveWordRoundMetrics;
  samples: DriveWordSample[];
  blocks: WordBlock[];
};

export type DriveWordSessionResult = {
  startedAtIso: string;
  endedAtIso: string;
  elapsedMs: number;
  rounds: DriveWordRoundLog[];
  averageDualScore: number;
  averageInsidePercent: number;
  averageHitRatePercent: number;
  firstThirdDualScore: number;
  middleThirdDualScore: number;
  lastThirdDualScore: number;
  trendSummary: string;
};
