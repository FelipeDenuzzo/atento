import {
  RadarState,
  RadarToneRoundConfig,
  RadarToneRoundLog,
  RadarToneRoundMetrics,
  RadarToneRoundRuntime,
  RadarToneSessionResult,
  ToneEvent,
  ToneType,
} from "./types";

function clamp(min: number, value: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getEffectiveRadarSpeed(
  elapsedMs: number,
  config: RadarToneRoundConfig,
): number {
  const baseSpeed = config.radarSpeedPxPerSec;
  const mode = config.speedModulationMode ?? "none";

  if (mode !== "alternating-up-only") {
    return baseSpeed;
  }

  const windowMs = Math.max(400, config.modulationWindowMs ?? 2200);
  const abruptMultiplier = Math.max(1, config.abruptBoostMultiplier ?? 1.55);
  const gradualMultiplier = Math.max(1, config.gradualBoostMultiplier ?? 1.25);

  const windowIndex = Math.floor(Math.max(0, elapsedMs) / windowMs);
  const windowProgress = (Math.max(0, elapsedMs) % windowMs) / windowMs;

  if (windowIndex % 2 === 0) {
    return Math.max(baseSpeed, baseSpeed * abruptMultiplier);
  }

  const gradualSpeed =
    baseSpeed * (1 + (gradualMultiplier - 1) * windowProgress);
  return Math.max(baseSpeed, gradualSpeed);
}

export function scheduleTones(
  config: RadarToneRoundConfig,
  rng: () => number = Math.random,
): ToneEvent[] {
  const tones: ToneEvent[] = [];
  let cursorMs = 800;
  let id = 1;

  while (cursorMs < config.durationMs - 200) {
    const interval =
      config.toneIntervalMinMs +
      rng() * (config.toneIntervalMaxMs - config.toneIntervalMinMs);

    cursorMs += Math.round(interval);
    if (cursorMs >= config.durationMs) break;

    const toneType: ToneType =
      rng() <= config.toneProbabilityAgudo ? "agudo" : "grave";

    tones.push({
      id,
      type: toneType,
      startAtMs: cursorMs,
      played: false,
    });
    id += 1;
  }

  return tones;
}

export function startRound(
  config: RadarToneRoundConfig,
  rng: () => number = Math.random,
): RadarToneRoundRuntime {
  const angle = rng() * Math.PI * 2;
  const speed = config.radarSpeedPxPerSec;
  const half = config.arenaSizePx / 2;

  const radarInitialState: RadarState = {
    x: half,
    y: half,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  };

  return {
    config,
    radarInitialState,
    tones: scheduleTones(config, rng),
  };
}

export function updateRadar(params: {
  state: RadarState;
  dtMs: number;
  arenaSizePx: number;
  dotRadiusPx: number;
}): RadarState {
  const dtSec = params.dtMs / 1000;
  const min = params.dotRadiusPx;
  const max = params.arenaSizePx - params.dotRadiusPx;

  let nextX = params.state.x + params.state.vx * dtSec;
  let nextY = params.state.y + params.state.vy * dtSec;
  let nextVx = params.state.vx;
  let nextVy = params.state.vy;

  if (nextX <= min || nextX >= max) {
    nextVx *= -1;
    nextX = clamp(min, nextX, max);
  }

  if (nextY <= min || nextY >= max) {
    nextVy *= -1;
    nextY = clamp(min, nextY, max);
  }

  return {
    x: nextX,
    y: nextY,
    vx: nextVx,
    vy: nextVy,
  };
}

export function handleKeyPress(params: {
  key: string;
  atMs: number;
  events: ToneEvent[];
  keyMap: RadarToneRoundConfig["keyMap"];
  responseWindowMinMs: number;
  responseWindowMaxMs: number;
}): { events: ToneEvent[]; matched: boolean } {
  const normalizedKey = params.key.toLowerCase();
  const nextEvents = params.events.map((event) => ({
    ...event,
    response: event.response ? { ...event.response } : undefined,
  }));

  const targetIndex = nextEvents.findIndex((event) => {
    if (event.response) return false;
    const delta = params.atMs - event.startAtMs;
    return delta >= params.responseWindowMinMs && delta <= params.responseWindowMaxMs;
  });

  if (targetIndex < 0) {
    return { events: nextEvents, matched: false };
  }

  const event = nextEvents[targetIndex];
  if (!event) {
    return { events: nextEvents, matched: false };
  }

  const expectedKey = params.keyMap[event.type].toLowerCase();
  const reactionMs = Math.max(0, params.atMs - event.startAtMs);
  event.response = {
    key: normalizedKey,
    atMs: params.atMs,
    reactionMs,
    outcome: normalizedKey === expectedKey ? "correct" : "wrong",
  };

  return {
    events: nextEvents,
    matched: true,
  };
}

export function computeRoundMetrics(params: {
  durationMs: number;
  radarTrackedMs: number;
  events: ToneEvent[];
}): RadarToneRoundMetrics {
  const toneHits = params.events.filter((event) => event.response?.outcome === "correct").length;
  const toneErrors = params.events.filter((event) => event.response?.outcome === "wrong").length;
  const totalTones = params.events.length;
  const toneOmissions = Math.max(0, totalTones - toneHits - toneErrors);

  const toneAccuracyPercent =
    totalTones > 0 ? (toneHits / totalTones) * 100 : 0;
  const radarTrackedPercent =
    params.durationMs > 0 ? (params.radarTrackedMs / params.durationMs) * 100 : 0;

  const reactionTimes = params.events
    .filter((event) => event.response?.outcome === "correct")
    .map((event) => event.response?.reactionMs ?? 0);

  const meanReactionMs =
    reactionTimes.length > 0
      ? reactionTimes.reduce((sum, value) => sum + value, 0) / reactionTimes.length
      : 0;

  const dualScore = (toneAccuracyPercent + radarTrackedPercent) / 2;

  return {
    durationMs: params.durationMs,
    radarTrackedMs: params.radarTrackedMs,
    radarTrackedPercent,
    totalTones,
    toneHits,
    toneErrors,
    toneOmissions,
    toneAccuracyPercent,
    meanReactionMs,
    dualScore,
  };
}

export function computeMetrics(params: {
  startedAtMs: number;
  endedAtMs: number;
  rounds: RadarToneRoundLog[];
}): RadarToneSessionResult {
  const elapsedMs = Math.max(0, params.endedAtMs - params.startedAtMs);
  const rounds = params.rounds;

  const averageDualScore =
    rounds.length > 0
      ? rounds.reduce((sum, item) => sum + item.metrics.dualScore, 0) / rounds.length
      : 0;

  const averageRadarTrackedPercent =
    rounds.length > 0
      ? rounds.reduce((sum, item) => sum + item.metrics.radarTrackedPercent, 0) / rounds.length
      : 0;

  const averageToneAccuracyPercent =
    rounds.length > 0
      ? rounds.reduce((sum, item) => sum + item.metrics.toneAccuracyPercent, 0) / rounds.length
      : 0;

  const split = Math.max(1, Math.floor(rounds.length / 2));
  const firstHalf = rounds.slice(0, split);
  const lastHalf = rounds.slice(-split);

  const firstHalfDualScore =
    firstHalf.length > 0
      ? firstHalf.reduce((sum, item) => sum + item.metrics.dualScore, 0) / firstHalf.length
      : 0;

  const lastHalfDualScore =
    lastHalf.length > 0
      ? lastHalf.reduce((sum, item) => sum + item.metrics.dualScore, 0) / lastHalf.length
      : 0;

  const trendSummary =
    lastHalfDualScore > firstHalfDualScore
      ? "Melhora de desempenho no final do treino."
      : lastHalfDualScore < firstHalfDualScore
        ? "Queda de desempenho no final do treino."
        : "Desempenho estável entre início e final.";

  return {
    startedAtIso: new Date(params.startedAtMs).toISOString(),
    endedAtIso: new Date(params.endedAtMs).toISOString(),
    elapsedMs,
    rounds,
    averageDualScore,
    averageRadarTrackedPercent,
    averageToneAccuracyPercent,
    firstHalfDualScore,
    lastHalfDualScore,
    trendSummary,
  };
}

function escapeCsv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function exportCSV(result: RadarToneSessionResult): string {
  const header = [
    "startedAt",
    "endedAt",
    "elapsedMs",
    "averageDualScore",
    "averageRadarTrackedPercent",
    "averageToneAccuracyPercent",
    "firstHalfDualScore",
    "lastHalfDualScore",
    "trendSummary",
    "rounds",
  ];

  const row = [
    result.startedAtIso,
    result.endedAtIso,
    String(result.elapsedMs),
    result.averageDualScore.toFixed(2),
    result.averageRadarTrackedPercent.toFixed(2),
    result.averageToneAccuracyPercent.toFixed(2),
    result.firstHalfDualScore.toFixed(2),
    result.lastHalfDualScore.toFixed(2),
    result.trendSummary,
    JSON.stringify(result.rounds),
  ];

  return [header.join(","), row.map(escapeCsv).join(",")].join("\n");
}

export function exportJSON(result: RadarToneSessionResult): string {
  return JSON.stringify(result, null, 2);
}
