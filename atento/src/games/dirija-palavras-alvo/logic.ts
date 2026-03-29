import type {
  DriveWordRoundConfig,
  DriveWordRoundLog,
  DriveWordRoundMetrics,
  DriveWordRoundRuntime,
  DriveWordSessionResult,
  WordBlock,
} from "./types";

function clamp(min: number, value: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function randomBetween(min: number, max: number, rng: () => number): number {
  return min + rng() * (max - min);
}

function pickDistractorWord(config: DriveWordRoundConfig, rng: () => number): string {
  const distractors = config.words.filter((word) => word !== config.targetWord);
  if (distractors.length === 0) {
    return config.targetWord;
  }
  return distractors[Math.floor(rng() * distractors.length)] ?? distractors[0];
}

function computeRoundMetrics(runtime: DriveWordRoundRuntime): DriveWordRoundMetrics {
  const insidePercent =
    runtime.config.durationMs > 0
      ? (runtime.insideMs / runtime.config.durationMs) * 100
      : 0;
  const hitRatePercent =
    runtime.targetBlocks > 0 ? (runtime.hits / runtime.targetBlocks) * 100 : 0;
  const hitInsideGreenRatePercent =
    runtime.targetBlocks > 0
      ? (runtime.hitsInsideGreen / runtime.targetBlocks) * 100
      : 0;

  return {
    durationMs: runtime.config.durationMs,
    insideMs: runtime.insideMs,
    outsideMs: runtime.outsideMs,
    insidePercent,
    totalBlocks: runtime.totalBlocks,
    targetBlocks: runtime.targetBlocks,
    hits: runtime.hits,
    hitsInsideGreen: runtime.hitsInsideGreen,
    falsePositives: runtime.falsePositives,
    omissions: runtime.omissions,
    hitRatePercent,
    hitInsideGreenRatePercent,
    dualScore: (insidePercent + hitInsideGreenRatePercent) / 2,
  };
}

function getGreenCenterX(runtime: DriveWordRoundRuntime): number {
  return runtime.bandCenterX + runtime.greenOffsetX;
}

function getGreenHalf(runtime: DriveWordRoundRuntime): number {
  return (runtime.config.bandWidthPx * runtime.config.greenZoneRatio) / 2;
}

export function isMarkerInsideGreen(runtime: DriveWordRoundRuntime): boolean {
  const markerHalf = runtime.config.markerWidthPx / 2;
  const bandHalf = runtime.config.bandWidthPx / 2;
  const greenHalf = getGreenHalf(runtime);
  const greenCenterX = getGreenCenterX(runtime);
  return (
    Math.abs(runtime.markerX - greenCenterX) <=
    Math.min(greenHalf, bandHalf) - markerHalf
  );
}

export function startRound(
  config: DriveWordRoundConfig,
  rng: () => number = Math.random,
): DriveWordRoundRuntime {
  const centerX = config.arenaWidthPx / 2;
  const nextBlockAtMs = Math.round(randomBetween(config.spawnMinMs, config.spawnMaxMs, rng));
  const markerHalf = config.markerWidthPx / 2;
  const margin = markerHalf + 12;
  const minCenter = config.bandWidthPx / 2 + margin;
  const maxCenter = config.arenaWidthPx - config.bandWidthPx / 2 - margin;
  const bandTargetX = randomBetween(minCenter, maxCenter, rng);

  const greenWidth = config.bandWidthPx * config.greenZoneRatio;
  const greenMaxOffset = Math.max(0, (config.bandWidthPx - greenWidth) / 2);
  const greenTargetOffsetX = randomBetween(-greenMaxOffset, greenMaxOffset, rng);

  return {
    config,
    input: { leftPressed: false, rightPressed: false },
    markerX: centerX,
    markerVx: 0,
    bandCenterX: centerX,
    bandVelocityX: 0,
    bandTargetX,
    greenOffsetX: 0,
    greenVelocityX: 0,
    greenTargetOffsetX,
    nextBlockAtMs,
    blockSeq: 1,
    activeBlocks: [],
    archivedBlocks: [],
    samples: [],
    insideMs: 0,
    outsideMs: 0,
    totalBlocks: 0,
    targetBlocks: 0,
    hits: 0,
    hitsInsideGreen: 0,
    falsePositives: 0,
    omissions: 0,
    active: true,
  };
}

export function stopRound(runtime: DriveWordRoundRuntime): DriveWordRoundRuntime {
  return {
    ...runtime,
    active: false,
  };
}

export function updateBandAndMarker(params: {
  runtime: DriveWordRoundRuntime;
  dtMs: number;
  rng?: () => number;
}): { insideBand: boolean } {
  const { runtime, dtMs } = params;
  const rng = params.rng ?? Math.random;
  const dtSec = dtMs / 1000;

  const markerHalf = runtime.config.markerWidthPx / 2;
  const margin = markerHalf + 12;
  const minCenter = runtime.config.bandWidthPx / 2 + margin;
  const maxCenter = runtime.config.arenaWidthPx - runtime.config.bandWidthPx / 2 - margin;

  const distanceToTarget = runtime.bandTargetX - runtime.bandCenterX;
  const desiredSpeed = clamp(
    -runtime.config.bandMaxSpeedPxPerSec,
    distanceToTarget * 1.35,
    runtime.config.bandMaxSpeedPxPerSec,
  );

  const maxDeltaSpeed = runtime.config.bandAccelerationPxPerSec2 * dtSec;
  const deltaSpeed = clamp(
    -maxDeltaSpeed,
    desiredSpeed - runtime.bandVelocityX,
    maxDeltaSpeed,
  );

  runtime.bandVelocityX += deltaSpeed;
  runtime.bandCenterX = clamp(
    minCenter,
    runtime.bandCenterX + runtime.bandVelocityX * dtSec,
    maxCenter,
  );

  const reachedTarget = Math.abs(runtime.bandTargetX - runtime.bandCenterX) < 6;
  if (reachedTarget) {
    const earlyReturn = rng() < runtime.config.earlyReturnChance;
    const innerMargin = earlyReturn ? 46 : 0;
    runtime.bandTargetX = randomBetween(
      minCenter + innerMargin,
      maxCenter - innerMargin,
      rng,
    );
  }

  const greenWidth = runtime.config.bandWidthPx * runtime.config.greenZoneRatio;
  const greenMaxOffset = Math.max(0, (runtime.config.bandWidthPx - greenWidth) / 2);

  const greenDistanceToTarget = runtime.greenTargetOffsetX - runtime.greenOffsetX;
  const greenDesiredSpeed = clamp(
    -runtime.config.greenMaxSpeedPxPerSec,
    greenDistanceToTarget * 1.5,
    runtime.config.greenMaxSpeedPxPerSec,
  );

  const greenMaxDeltaSpeed = runtime.config.greenAccelerationPxPerSec2 * dtSec;
  const greenDeltaSpeed = clamp(
    -greenMaxDeltaSpeed,
    greenDesiredSpeed - runtime.greenVelocityX,
    greenMaxDeltaSpeed,
  );

  runtime.greenVelocityX += greenDeltaSpeed;
  runtime.greenOffsetX = clamp(
    -greenMaxOffset,
    runtime.greenOffsetX + runtime.greenVelocityX * dtSec,
    greenMaxOffset,
  );

  const greenReachedTarget = Math.abs(runtime.greenTargetOffsetX - runtime.greenOffsetX) < 4;
  if (greenReachedTarget) {
    const greenEarlyReturn = rng() < runtime.config.greenEarlyReturnChance;
    const innerMargin = greenEarlyReturn ? 8 : 0;
    runtime.greenTargetOffsetX = randomBetween(
      -greenMaxOffset + innerMargin,
      greenMaxOffset - innerMargin,
      rng,
    );
  }

  const direction =
    (runtime.input.leftPressed ? -1 : 0) + (runtime.input.rightPressed ? 1 : 0);

  runtime.markerVx +=
    direction * runtime.config.markerAccelerationPxPerSec2 * dtSec;

  if (direction === 0) {
    const frictionFactor = Math.max(0, 1 - runtime.config.markerFrictionPerSec * dtSec);
    runtime.markerVx *= frictionFactor;
  }

  runtime.markerVx = clamp(
    -runtime.config.markerMaxSpeedPxPerSec,
    runtime.markerVx,
    runtime.config.markerMaxSpeedPxPerSec,
  );

  const bandHalf = runtime.config.bandWidthPx / 2;
  const minMarkerX = runtime.bandCenterX - bandHalf + markerHalf;
  const maxMarkerX = runtime.bandCenterX + bandHalf - markerHalf;

  runtime.markerX = clamp(
    minMarkerX,
    runtime.markerX + runtime.markerVx * dtSec,
    maxMarkerX,
  );

  const insideBand = isMarkerInsideGreen(runtime);

  if (insideBand) {
    runtime.insideMs += dtMs;
  } else {
    runtime.outsideMs += dtMs;
  }

  return { insideBand };
}

export function spawnWordBlock(params: {
  runtime: DriveWordRoundRuntime;
  atMs: number;
  side: "left" | "right";
  rng?: () => number;
}): WordBlock {
  const rng = params.rng ?? Math.random;
  const isTarget = rng() <= params.runtime.config.targetProbability;

  const block: WordBlock = {
    id: params.runtime.blockSeq,
    word: isTarget
      ? params.runtime.config.targetWord
      : pickDistractorWord(params.runtime.config, rng),
    isTarget,
    side: params.side,
    spawnedAtMs: params.atMs,
    y: -56,
    heightPx: 46,
    speedPxPerSec: randomBetween(
      params.runtime.config.blockFallMinPxPerSec,
      params.runtime.config.blockFallMaxPxPerSec,
      rng,
    ),
  };

  params.runtime.blockSeq += 1;
  params.runtime.totalBlocks += 1;
  if (isTarget) {
    params.runtime.targetBlocks += 1;
  }

  return block;
}

export function updateWordBlocks(params: {
  runtime: DriveWordRoundRuntime;
  dtMs: number;
}): void {
  const dtSec = params.dtMs / 1000;
  const active: WordBlock[] = [];

  params.runtime.activeBlocks.forEach((block) => {
    const moved: WordBlock = {
      ...block,
      y: block.y + block.speedPxPerSec * dtSec,
    };

    const isOut = moved.y > params.runtime.config.arenaHeightPx + moved.heightPx;
    if (!isOut) {
      active.push(moved);
      return;
    }

    if (moved.isTarget && !moved.answeredAtMs) {
      params.runtime.omissions += 1;
      moved.responseType = "omission";
    }

    params.runtime.archivedBlocks.push(moved);
  });

  params.runtime.activeBlocks = active;
}

export function handleKeyDown(params: {
  runtime: DriveWordRoundRuntime;
  key: string;
  code?: string;
  atMs: number;
  responseLineY?: number;
}): { hit: boolean; falsePositive: boolean } {
  const normalizedKey = params.key.toLowerCase();

  if (normalizedKey === "arrowleft" || normalizedKey === "a") {
    params.runtime.input.leftPressed = true;
    return { hit: false, falsePositive: false };
  }

  if (normalizedKey === "arrowright" || normalizedKey === "d") {
    params.runtime.input.rightPressed = true;
    return { hit: false, falsePositive: false };
  }

  const isSpace =
    params.code === "Space" ||
    normalizedKey === " " ||
    normalizedKey === "space" ||
    normalizedKey === "spacebar";

  if (!isSpace) {
    return { hit: false, falsePositive: false };
  }


  // Ajuste: tolerância cobre toda a faixa verde central (48px de altura)
  const responseLineY = params.responseLineY ?? params.runtime.config.arenaHeightPx / 2;
  const tolerance = 24; // metade da altura da faixa verde (48px)

  // Busca se existe pelo menos um alvo não respondido na faixa verde
  const hasUnansweredTarget = params.runtime.activeBlocks.some(
    (block) =>
      block.isTarget &&
      !block.answeredAtMs &&
      Math.abs(block.y - responseLineY) <= tolerance,
  );

  if (hasUnansweredTarget) {
    // Marca todos os alvos não respondidos na faixa como respondidos
    params.runtime.activeBlocks.forEach((block) => {
      if (
        block.isTarget &&
        !block.answeredAtMs &&
        Math.abs(block.y - responseLineY) <= tolerance
      ) {
        block.answeredAtMs = params.atMs;
        block.responseType = "hit";
        params.runtime.hits += 1;
      }
    });
    return { hit: true, falsePositive: false };
  }

  params.runtime.falsePositives += 1;
  return { hit: false, falsePositive: true };
}

export function updateFrame(params: {
  runtime: DriveWordRoundRuntime;
  elapsedMs: number;
  dtMs: number;
  nowMs: number;
  rng?: () => number;
  sampleIntervalMs?: number;
  lastSampleAtMs?: number;
}): { insideBand: boolean; sampled: boolean; finished: boolean; lastSampleAtMs: number } {
  const rng = params.rng ?? Math.random;
  const sampleIntervalMs = params.sampleIntervalMs ?? 100;
  const currentLastSample = params.lastSampleAtMs ?? 0;

  const { insideBand } = updateBandAndMarker({
    runtime: params.runtime,
    dtMs: params.dtMs,
    rng,
  });

  if (params.elapsedMs >= params.runtime.nextBlockAtMs && params.elapsedMs < params.runtime.config.durationMs) {
    const leftBlock = spawnWordBlock({
      runtime: params.runtime,
      atMs: params.elapsedMs,
      side: "left",
      rng,
    });
    const rightBlock = spawnWordBlock({
      runtime: params.runtime,
      atMs: params.elapsedMs,
      side: "right",
      rng,
    });

    params.runtime.activeBlocks.push(leftBlock, rightBlock);

    const interval = randomBetween(
      params.runtime.config.spawnMinMs,
      params.runtime.config.spawnMaxMs,
      rng,
    );
    params.runtime.nextBlockAtMs = params.elapsedMs + Math.round(interval);
  }

  updateWordBlocks({ runtime: params.runtime, dtMs: params.dtMs });

  let sampled = false;
  let lastSampleAtMs = currentLastSample;
  if (params.nowMs - currentLastSample >= sampleIntervalMs) {
    params.runtime.samples.push({
      atMs: params.elapsedMs,
      bandCenterX: params.runtime.bandCenterX,
      markerX: params.runtime.markerX,
      insideBand,
    });
    sampled = true;
    lastSampleAtMs = params.nowMs;
  }

  return {
    insideBand,
    sampled,
    finished: params.elapsedMs >= params.runtime.config.durationMs,
    lastSampleAtMs,
  };
}

export function computeMetrics(params: {
  startedAtMs: number;
  endedAtMs: number;
  rounds: DriveWordRoundLog[];
}): DriveWordSessionResult {
  const elapsedMs = Math.max(0, params.endedAtMs - params.startedAtMs);

  const averageDualScore =
    params.rounds.length > 0
      ? params.rounds.reduce((sum, round) => sum + round.metrics.dualScore, 0) /
        params.rounds.length
      : 0;

  const averageInsidePercent =
    params.rounds.length > 0
      ? params.rounds.reduce((sum, round) => sum + round.metrics.insidePercent, 0) /
        params.rounds.length
      : 0;

  const averageHitRatePercent =
    params.rounds.length > 0
      ? params.rounds.reduce((sum, round) => sum + round.metrics.hitRatePercent, 0) /
        params.rounds.length
      : 0;

  const chunk = Math.max(1, Math.floor(params.rounds.length / 3));
  const first = params.rounds.slice(0, chunk);
  const middle = params.rounds.slice(chunk, chunk * 2);
  const last = params.rounds.slice(-chunk);

  const meanDual = (items: DriveWordRoundLog[]): number =>
    items.length > 0
      ? items.reduce((sum, item) => sum + item.metrics.dualScore, 0) / items.length
      : 0;

  const firstThirdDualScore = meanDual(first);
  const middleThirdDualScore = meanDual(middle);
  const lastThirdDualScore = meanDual(last);

  const trendSummary =
    lastThirdDualScore > firstThirdDualScore
      ? "Melhora no fim do treino."
      : lastThirdDualScore < firstThirdDualScore
        ? "Queda no fim do treino."
        : "Desempenho estável ao longo do treino.";

  return {
    startedAtIso: new Date(params.startedAtMs).toISOString(),
    endedAtIso: new Date(params.endedAtMs).toISOString(),
    elapsedMs,
    rounds: params.rounds,
    averageDualScore,
    averageInsidePercent,
    averageHitRatePercent,
    firstThirdDualScore,
    middleThirdDualScore,
    lastThirdDualScore,
    trendSummary,
  };
}

function escapeCsv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function exportJSON(result: DriveWordSessionResult): string {
  return JSON.stringify(result, null, 2);
}

export function exportCSV(result: DriveWordSessionResult): string {
  const headers = [
    "startedAt",
    "endedAt",
    "elapsedMs",
    "averageDualScore",
    "averageInsidePercent",
    "averageHitRatePercent",
    "firstThirdDualScore",
    "middleThirdDualScore",
    "lastThirdDualScore",
    "trendSummary",
    "rounds",
  ];

  const row = [
    result.startedAtIso,
    result.endedAtIso,
    String(result.elapsedMs),
    result.averageDualScore.toFixed(2),
    result.averageInsidePercent.toFixed(2),
    result.averageHitRatePercent.toFixed(2),
    result.firstThirdDualScore.toFixed(2),
    result.middleThirdDualScore.toFixed(2),
    result.lastThirdDualScore.toFixed(2),
    result.trendSummary,
    JSON.stringify(result.rounds),
  ];

  return [headers.join(","), row.map(escapeCsv).join(",")].join("\n");
}

export function buildRoundLog(params: {
  runtime: DriveWordRoundRuntime;
  roundNumber: number;
  startedAtIso: string;
  endedAtIso: string;
}): DriveWordRoundLog {
  const runtime = params.runtime;
  const metrics = computeRoundMetrics(runtime);

  return {
    roundNumber: params.roundNumber,
    roundName: runtime.config.name,
    startedAtIso: params.startedAtIso,
    endedAtIso: params.endedAtIso,
    config: runtime.config,
    metrics,
    samples: runtime.samples,
    blocks: [...runtime.archivedBlocks, ...runtime.activeBlocks],
  };
}
