import { describe, expect, it } from "vitest";
import {
  buildRoundLog,
  computeMetrics,
  handleKeyDown,
  spawnWordBlock,
  startRound,
  stopRound,
  updateBandAndMarker,
  updateWordBlocks,
} from "./logic";
import type { DriveWordRoundConfig } from "./types";

const config: DriveWordRoundConfig = {
  id: 1,
  name: "Fase 1",
  durationMs: 60000,
  arenaWidthPx: 380,
  arenaHeightPx: 460,
  bandWidthPx: 240,
  greenZoneRatio: 0.58,
  markerWidthPx: 26,
  markerMaxSpeedPxPerSec: 210,
  markerAccelerationPxPerSec2: 620,
  markerFrictionPerSec: 5,
  bandMaxSpeedPxPerSec: 95,
  bandAccelerationPxPerSec2: 120,
  earlyReturnChance: 0.2,
  greenMaxSpeedPxPerSec: 72,
  greenAccelerationPxPerSec2: 95,
  greenEarlyReturnChance: 0.25,
  responseLineTolerancePx: 20,
  spawnMinMs: 1200,
  spawnMaxMs: 1800,
  targetProbability: 0.22,
  blockFallMinPxPerSec: 95,
  blockFallMaxPxPerSec: 125,
  words: ["CASA", "RUA", "AZUL", "PORTA"],
  targetWord: "AZUL",
};

describe("dirija-palavras-alvo logic", () => {
  it("inicia e encerra rodada corretamente", () => {
    const runtime = startRound(config, () => 0.5);
    expect(runtime.active).toBe(true);
    expect(runtime.activeBlocks.length).toBe(0);

    const stopped = stopRound(runtime);
    expect(stopped.active).toBe(false);
  });

  it("contabiliza tempo dentro/fora da faixa", () => {
    const runtime = startRound(config, () => 0.5);

    const before = runtime.insideMs + runtime.outsideMs;
    updateBandAndMarker({ runtime, dtMs: 120, rng: () => 0.5 });
    const after = runtime.insideMs + runtime.outsideMs;

    expect(after - before).toBe(120);
  });

  it("registra acerto, falso positivo e omissão", () => {
    const runtime = startRound(config, () => 0.5);

    const target = spawnWordBlock({ runtime, atMs: 900, side: "left", rng: () => 0.1 });
    const distractor = spawnWordBlock({ runtime, atMs: 1200, side: "right", rng: () => 0.9 });

    runtime.activeBlocks = [{ ...target, y: runtime.config.arenaHeightPx / 2 + 2 }];
    const hit = handleKeyDown({
      runtime,
      key: " ",
      code: "Space",
      atMs: 1300,
      responseLineY: runtime.config.arenaHeightPx / 2,
    });
    expect(hit.hit).toBe(true);

    runtime.activeBlocks = [{ ...distractor, y: 60 }];
    const fp = handleKeyDown({
      runtime,
      key: " ",
      code: "Space",
      atMs: 1500,
      responseLineY: runtime.config.arenaHeightPx / 2,
    });
    expect(fp.falsePositive).toBe(true);

    runtime.activeBlocks = [
      {
        ...target,
        answeredAtMs: undefined,
        responseType: undefined,
        y: config.arenaHeightPx + 80,
      },
    ];
    updateWordBlocks({ runtime, dtMs: 16 });
    expect(runtime.omissions).toBe(1);
  });

  it("consolida resultado final corretamente", () => {
    const runtime = startRound(config, () => 0.5);
    runtime.insideMs = 40000;
    runtime.outsideMs = 20000;
    runtime.totalBlocks = 20;
    runtime.targetBlocks = 8;
    runtime.hits = 6;
    runtime.hitsInsideGreen = 4;
    runtime.falsePositives = 2;
    runtime.omissions = 2;

    const roundLog = buildRoundLog({
      runtime,
      roundNumber: 1,
      startedAtIso: new Date(1000).toISOString(),
      endedAtIso: new Date(61000).toISOString(),
    });

    const result = computeMetrics({
      startedAtMs: 1000,
      endedAtMs: 61000,
      rounds: [roundLog],
    });

    expect(result.elapsedMs).toBe(60000);
    expect(result.averageDualScore).toBeGreaterThan(55);
    expect(result.averageInsidePercent).toBeGreaterThan(60);
    expect(roundLog.metrics.hitsInsideGreen).toBe(4);
  });
});
