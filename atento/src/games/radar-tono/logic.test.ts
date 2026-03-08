import { describe, expect, it } from "vitest";
import {
  computeMetrics,
  computeRoundMetrics,
  getEffectiveRadarSpeed,
  handleKeyPress,
  scheduleTones,
  startRound,
} from "./logic";
import type { RadarToneRoundConfig } from "./types";

const config: RadarToneRoundConfig = {
  id: 1,
  name: "Fase 1",
  durationMs: 60000,
  arenaSizePx: 360,
  dotRadiusPx: 12,
  hitTolerancePx: 14,
  radarSpeedPxPerSec: 60,
  toneIntervalMinMs: 1500,
  toneIntervalMaxMs: 2200,
  toneProbabilityAgudo: 0.5,
  responseWindowMinMs: 150,
  responseWindowMaxMs: 1500,
  keyMap: { grave: "j", agudo: "k" },
};

describe("radar-tono logic", () => {
  it("inicia rodada com tons agendados", () => {
    const round = startRound(config, () => 0.4);
    expect(round.tones.length).toBeGreaterThan(0);
    expect(round.config.durationMs).toBe(60000);
  });

  it("agenda tons dentro da duração", () => {
    const tones = scheduleTones(config, () => 0.3);
    expect(tones.length).toBeGreaterThan(0);
    expect(tones.every((tone) => tone.startAtMs < config.durationMs)).toBe(true);
  });

  it("contabiliza acerto, erro e omissão", () => {
    const tones = [
      { id: 1, type: "grave" as const, startAtMs: 1000, played: true },
      { id: 2, type: "agudo" as const, startAtMs: 3000, played: true },
      { id: 3, type: "grave" as const, startAtMs: 5000, played: true },
    ];

    const first = handleKeyPress({
      key: "j",
      atMs: 1300,
      events: tones,
      keyMap: config.keyMap,
      responseWindowMinMs: 150,
      responseWindowMaxMs: 1500,
    });

    const second = handleKeyPress({
      key: "j",
      atMs: 3400,
      events: first.events,
      keyMap: config.keyMap,
      responseWindowMinMs: 150,
      responseWindowMaxMs: 1500,
    });

    const metrics = computeRoundMetrics({
      durationMs: 60000,
      radarTrackedMs: 30000,
      events: second.events,
    });

    expect(metrics.toneHits).toBe(1);
    expect(metrics.toneErrors).toBe(1);
    expect(metrics.toneOmissions).toBe(1);
  });

  it("calcula métricas finais consolidadas", () => {
    const result = computeMetrics({
      startedAtMs: 1000,
      endedAtMs: 90000,
      rounds: [
        {
          roundNumber: 1,
          roundName: "Fase 1",
          startedAtIso: new Date(1000).toISOString(),
          endedAtIso: new Date(61000).toISOString(),
          metrics: {
            durationMs: 60000,
            radarTrackedMs: 30000,
            radarTrackedPercent: 50,
            totalTones: 20,
            toneHits: 12,
            toneErrors: 4,
            toneOmissions: 4,
            toneAccuracyPercent: 60,
            meanReactionMs: 420,
            dualScore: 55,
          },
        },
        {
          roundNumber: 2,
          roundName: "Fase 2",
          startedAtIso: new Date(62000).toISOString(),
          endedAtIso: new Date(90000).toISOString(),
          metrics: {
            durationMs: 28000,
            radarTrackedMs: 19600,
            radarTrackedPercent: 70,
            totalTones: 16,
            toneHits: 12,
            toneErrors: 2,
            toneOmissions: 2,
            toneAccuracyPercent: 75,
            meanReactionMs: 390,
            dualScore: 72.5,
          },
        },
      ],
    });

    expect(result.averageDualScore).toBeGreaterThan(60);
    expect(result.elapsedMs).toBe(89000);
  });

  it("modulação nas fases finais acelera sem ficar abaixo da base", () => {
    const modulatedConfig: RadarToneRoundConfig = {
      ...config,
      radarSpeedPxPerSec: 90,
      speedModulationMode: "alternating-up-only",
      abruptBoostMultiplier: 1.6,
      gradualBoostMultiplier: 1.25,
      modulationWindowMs: 2000,
    };

    const speedA = getEffectiveRadarSpeed(100, modulatedConfig);
    const speedB = getEffectiveRadarSpeed(2300, modulatedConfig);
    const speedC = getEffectiveRadarSpeed(3500, modulatedConfig);

    expect(speedA).toBeGreaterThanOrEqual(modulatedConfig.radarSpeedPxPerSec);
    expect(speedB).toBeGreaterThanOrEqual(modulatedConfig.radarSpeedPxPerSec);
    expect(speedC).toBeGreaterThanOrEqual(modulatedConfig.radarSpeedPxPerSec);
  });
});
