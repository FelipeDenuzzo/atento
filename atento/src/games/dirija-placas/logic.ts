import type {
  CarState,
  DriveInputState,
  DriveSignsRoundConfig,
  DriveSignsRoundLog,
  DriveSignsRoundMetrics,
  DriveSignsRoundRuntime,
  DriveSignsSessionResult,
  SignInstance,
  TrackState,
} from "./types";

function clamp(min: number, value: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function randomBetween(min: number, max: number, rng: () => number): number {
  return min + rng() * (max - min);
}

function buildTargetVisual(config: DriveSignsRoundConfig): SignInstance["visual"] {
  if (config.targetMode === "red-sign") {
    return { label: "ALVO", colorClass: "bg-red-600 text-white" };
  }
  return { label: "PARE", colorClass: "bg-zinc-900 text-white" };
}

function buildDistractorVisual(config: DriveSignsRoundConfig, rng: () => number): SignInstance["visual"] {
  if (config.targetMode === "red-sign") {
    const pool = [
      { label: "AZUL", colorClass: "bg-blue-600 text-white" },
      { label: "AMARELA", colorClass: "bg-amber-400 text-zinc-900" },
      { label: "VERDE", colorClass: "bg-emerald-600 text-white" },
    ];
    return pool[Math.floor(rng() * pool.length)] ?? pool[0];
  }

  const pool = [
    { label: "SIGA", colorClass: "bg-emerald-600 text-white" },
    { label: "DEVAGAR", colorClass: "bg-amber-400 text-zinc-900" },
    { label: "DÊ PREFERÊNCIA", colorClass: "bg-blue-600 text-white" },
  ];
  return pool[Math.floor(rng() * pool.length)] ?? pool[0];
}

export function startRound(
  config: DriveSignsRoundConfig,
  rng: () => number = Math.random,
): DriveSignsRoundRuntime {
  const centerX = config.arenaWidthPx / 2;
  return {
    config,
    startedAtMs: 0,
    nextSignAtMs: Math.round(randomBetween(config.signSpawnMinMs, config.signSpawnMaxMs, rng)),
    signSeq: 1,
    car: { x: centerX, vx: 0 },
    track: { laneCenterX: centerX, driftPhase: rng() * Math.PI * 2 },
    signs: [],
    archivedSigns: [],
    carSamples: [],
    insideMs: 0,
    outsideMs: 0,
    falsePositives: 0,
    targetCount: 0,
    hits: 0,
    omissions: 0,
  };
}

export function updateTrack(params: {
  state: TrackState;
  elapsedMs: number;
  config: DriveSignsRoundConfig;
}): TrackState {
  const { state, elapsedMs, config } = params;
  const t = Math.max(0, elapsedMs) / Math.max(200, config.driftPeriodMs);
  const phase = state.driftPhase + t * Math.PI * 2;
  const laneCenterX = config.arenaWidthPx / 2 + Math.sin(phase) * config.driftAmplitudePx;
  return { laneCenterX, driftPhase: phase % (Math.PI * 2) };
}

export function updateCarPosition(params: {
  state: CarState;
  input: DriveInputState;
  dtMs: number;
  config: DriveSignsRoundConfig;
}): CarState {
  const dtSec = params.dtMs / 1000;
  const direction = (params.input.leftPressed ? -1 : 0) + (params.input.rightPressed ? 1 : 0);

  let vx = params.state.vx + direction * params.config.carAccelerationPxPerSec2 * dtSec;

  if (direction === 0) {
    const frictionFactor = Math.max(0, 1 - params.config.carFrictionPerSec * dtSec);
    vx *= frictionFactor;
  }

  vx = clamp(-params.config.carMaxSpeedPxPerSec, vx, params.config.carMaxSpeedPxPerSec);

  const halfCar = params.config.carWidthPx / 2;
  const minX = halfCar;
  const maxX = params.config.arenaWidthPx - halfCar;
  const x = clamp(minX, params.state.x + vx * dtSec, maxX);

  if (x === minX || x === maxX) {
    vx = 0;
  }

  return { x, vx };
}

export function spawnSign(params: {
  atMs: number;
  id: number;
  config: DriveSignsRoundConfig;
  rng?: () => number;
}): SignInstance {
  const rng = params.rng ?? Math.random;
  const isTarget = rng() <= params.config.signTargetProbability;
  const speedPxPerSec = randomBetween(
    params.config.signFallMinPxPerSec,
    params.config.signFallMaxPxPerSec,
    rng,
  );

  return {
    id: params.id,
    kind: isTarget ? "target" : "distractor",
    spawnedAtMs: params.atMs,
    y: -56,
    speedPxPerSec,
    heightPx: 48,
    visual: isTarget
      ? buildTargetVisual(params.config)
      : buildDistractorVisual(params.config, rng),
  };
}

export function updateSigns(params: {
  signs: SignInstance[];
  dtMs: number;
  arenaHeightPx: number;
}): { signs: SignInstance[]; archived: SignInstance[]; omissionsAdded: number } {
  const dtSec = params.dtMs / 1000;
  const active: SignInstance[] = [];
  const archived: SignInstance[] = [];
  let omissionsAdded = 0;

  params.signs.forEach((sign) => {
    const nextSign: SignInstance = {
      ...sign,
      y: sign.y + sign.speedPxPerSec * dtSec,
    };

    const isOut = nextSign.y > params.arenaHeightPx + nextSign.heightPx;
    if (isOut) {
      if (nextSign.kind === "target" && !nextSign.answeredAtMs) {
        omissionsAdded += 1;
        archived.push({ ...nextSign, outcome: "ignored" });
      } else {
        archived.push(nextSign);
      }
      return;
    }

    active.push(nextSign);
  });

  return { signs: active, archived, omissionsAdded };
}

export function handleKeyPress(params: {
  key: string;
  atMs: number;
  signs: SignInstance[];
  responseKey?: string;
}): { signs: SignInstance[]; hit: boolean; falsePositive: boolean } {
  const responseKey = (params.responseKey ?? " ").toLowerCase();
  const normalizedKey = params.key.toLowerCase();

  if (normalizedKey !== responseKey && normalizedKey !== "space" && normalizedKey !== "spacebar") {
    return { signs: params.signs, hit: false, falsePositive: false };
  }

  const signs = params.signs.map((sign) => ({ ...sign }));
  const activeTargetIndex = signs.findIndex(
    (sign) => sign.kind === "target" && !sign.answeredAtMs,
  );

  if (activeTargetIndex >= 0) {
    const target = signs[activeTargetIndex];
    if (target) {
      target.answeredAtMs = params.atMs;
      target.outcome = "hit";
    }
    return { signs, hit: true, falsePositive: false };
  }

  return { signs, hit: false, falsePositive: true };
}

export function computeRoundMetrics(params: {
  durationMs: number;
  inLaneMs: number;
  outLaneMs: number;
  totalTargets: number;
  hits: number;
  falsePositives: number;
  omissions: number;
}): DriveSignsRoundMetrics {
  const inLanePercent =
    params.durationMs > 0 ? (params.inLaneMs / params.durationMs) * 100 : 0;
  const hitRatePercent =
    params.totalTargets > 0 ? (params.hits / params.totalTargets) * 100 : 0;

  const dualScore = (inLanePercent + hitRatePercent) / 2;

  return {
    durationMs: params.durationMs,
    inLaneMs: params.inLaneMs,
    outLaneMs: params.outLaneMs,
    inLanePercent,
    totalTargets: params.totalTargets,
    hits: params.hits,
    falsePositives: params.falsePositives,
    omissions: params.omissions,
    hitRatePercent,
    dualScore,
  };
}

export function computeMetrics(params: {
  startedAtMs: number;
  endedAtMs: number;
  rounds: DriveSignsRoundLog[];
}): DriveSignsSessionResult {
  const rounds = params.rounds;
  const elapsedMs = Math.max(0, params.endedAtMs - params.startedAtMs);

  const averageDualScore =
    rounds.length > 0
      ? rounds.reduce((sum, item) => sum + item.metrics.dualScore, 0) / rounds.length
      : 0;

  const averageInLanePercent =
    rounds.length > 0
      ? rounds.reduce((sum, item) => sum + item.metrics.inLanePercent, 0) / rounds.length
      : 0;

  const averageHitRatePercent =
    rounds.length > 0
      ? rounds.reduce((sum, item) => sum + item.metrics.hitRatePercent, 0) / rounds.length
      : 0;

  const chunk = Math.max(1, Math.floor(rounds.length / 3));
  const first = rounds.slice(0, chunk);
  const middle = rounds.slice(chunk, chunk * 2);
  const last = rounds.slice(-chunk);

  const meanDual = (items: DriveSignsRoundLog[]): number =>
    items.length > 0
      ? items.reduce((sum, item) => sum + item.metrics.dualScore, 0) / items.length
      : 0;

  const firstThirdDualScore = meanDual(first);
  const middleThirdDualScore = meanDual(middle);
  const lastThirdDualScore = meanDual(last);

  const trendSummary =
    lastThirdDualScore > firstThirdDualScore
      ? "Melhora do início para o fim do treino."
      : lastThirdDualScore < firstThirdDualScore
        ? "Queda do início para o fim do treino."
        : "Desempenho estável entre início e fim.";

  return {
    startedAtIso: new Date(params.startedAtMs).toISOString(),
    endedAtIso: new Date(params.endedAtMs).toISOString(),
    elapsedMs,
    rounds,
    averageDualScore,
    averageInLanePercent,
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

export function exportJSON(result: DriveSignsSessionResult): string {
  return JSON.stringify(result, null, 2);
}

export function exportCSV(result: DriveSignsSessionResult): string {
  const headers = [
    "startedAt",
    "endedAt",
    "elapsedMs",
    "averageDualScore",
    "averageInLanePercent",
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
    result.averageInLanePercent.toFixed(2),
    result.averageHitRatePercent.toFixed(2),
    result.firstThirdDualScore.toFixed(2),
    result.middleThirdDualScore.toFixed(2),
    result.lastThirdDualScore.toFixed(2),
    result.trendSummary,
    JSON.stringify(result.rounds),
  ];

  return [headers.join(","), row.map(escapeCsv).join(",")].join("\n");
}
