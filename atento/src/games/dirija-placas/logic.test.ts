import { describe, expect, it } from "vitest";
import {
  computeMetrics,
  computeRoundMetrics,
  handleKeyPress,
  spawnSign,
  startRound,
  updateCarPosition,
  updateSigns,
  updateTrack,
} from "./logic";
import type { DriveSignsRoundConfig } from "./types";

const config: DriveSignsRoundConfig = {
  id: 1,
  name: "Fase 1",
  durationMs: 60000,
  arenaWidthPx: 380,
  arenaHeightPx: 460,
  laneWidthPx: 170,
  carWidthPx: 34,
  carHeightPx: 58,
  carMaxSpeedPxPerSec: 210,
  carAccelerationPxPerSec2: 620,
  carFrictionPerSec: 5,
  driftAmplitudePx: 24,
  driftPeriodMs: 5200,
  signSpawnMinMs: 2400,
  signSpawnMaxMs: 4200,
  signTargetProbability: 0.3,
  signFallMinPxPerSec: 120,
  signFallMaxPxPerSec: 165,
  targetMode: "pare-text",
};

describe("dirija-placas logic", () => {
  it("inicia rodada com estado base consistente", () => {
    const runtime = startRound(config, () => 0.5);
    expect(runtime.config.name).toBe("Fase 1");
    expect(runtime.signs.length).toBe(0);
    expect(runtime.car.x).toBeCloseTo(config.arenaWidthPx / 2);
  });

  it("atualiza direção e contabiliza tempo dentro/fora da faixa", () => {
    const runtime = startRound(config, () => 0.2);

    runtime.track = updateTrack({
      state: runtime.track,
      elapsedMs: 1200,
      config,
    });

    const carInside = updateCarPosition({
      state: runtime.car,
      input: { leftPressed: false, rightPressed: false },
      dtMs: 120,
      config,
    });

    const laneHalf = config.laneWidthPx / 2;
    const carHalf = config.carWidthPx / 2;
    const isInside = Math.abs(carInside.x - runtime.track.laneCenterX) <= laneHalf - carHalf;

    if (isInside) runtime.insideMs += 120;
    else runtime.outsideMs += 120;

    const metrics = computeRoundMetrics({
      durationMs: config.durationMs,
      inLaneMs: runtime.insideMs,
      outLaneMs: runtime.outsideMs,
      totalTargets: 0,
      hits: 0,
      falsePositives: 0,
      omissions: 0,
    });

    expect(metrics.inLaneMs + metrics.outLaneMs).toBe(120);
  });

  it("registra acerto, falso positivo e omissão de placas", () => {
    const target = spawnSign({ atMs: 1000, id: 1, config, rng: () => 0.1 });
    const distractor = spawnSign({ atMs: 1200, id: 2, config, rng: () => 0.95 });

    const hitResult = handleKeyPress({
      key: " ",
      atMs: 1400,
      signs: [target],
      responseKey: " ",
    });

    expect(hitResult.hit).toBe(true);

    const falsePositiveResult = handleKeyPress({
      key: " ",
      atMs: 1600,
      signs: [distractor],
      responseKey: " ",
    });

    expect(falsePositiveResult.falsePositive).toBe(true);

    const omissionUpdate = updateSigns({
      signs: [
        {
          ...target,
          kind: "target",
          y: config.arenaHeightPx + 60,
        },
      ],
      dtMs: 16,
      arenaHeightPx: config.arenaHeightPx,
    });

    expect(omissionUpdate.omissionsAdded).toBe(1);
  });

  it("consolida resultado final por rodada", () => {
    const result = computeMetrics({
      startedAtMs: 1000,
      endedAtMs: 181000,
      rounds: [
        {
          roundNumber: 1,
          roundName: "Fase 1",
          startedAtIso: new Date(1000).toISOString(),
          endedAtIso: new Date(61000).toISOString(),
          config,
          metrics: {
            durationMs: 60000,
            inLaneMs: 42000,
            outLaneMs: 18000,
            inLanePercent: 70,
            totalTargets: 10,
            hits: 7,
            falsePositives: 2,
            omissions: 3,
            hitRatePercent: 70,
            dualScore: 70,
          },
          carSamples: [],
          signs: [],
        },
        {
          roundNumber: 2,
          roundName: "Fase 2",
          startedAtIso: new Date(62000).toISOString(),
          endedAtIso: new Date(181000).toISOString(),
          config: { ...config, id: 2, name: "Fase 2", durationMs: 119000 },
          metrics: {
            durationMs: 119000,
            inLaneMs: 71400,
            outLaneMs: 47600,
            inLanePercent: 60,
            totalTargets: 12,
            hits: 6,
            falsePositives: 3,
            omissions: 6,
            hitRatePercent: 50,
            dualScore: 55,
          },
          carSamples: [],
          signs: [],
        },
      ],
    });

    expect(result.elapsedMs).toBe(180000);
    expect(result.averageDualScore).toBeGreaterThan(60);
  });
});
