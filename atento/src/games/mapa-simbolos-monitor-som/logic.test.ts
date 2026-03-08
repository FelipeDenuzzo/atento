import { describe, expect, it } from "vitest";
import {
  closeRound,
  computeScores,
  handleGlitchResponse,
  scheduleGlitches,
  spawnVisualRound,
  startSession,
  updateRuntime,
  validateSymbolClick,
} from "./logic";
import type { SymbolMapSoundRoundConfig } from "./types";

const config: SymbolMapSoundRoundConfig = {
  id: 1,
  name: "Fase 1",
  durationMs: 60000,
  optionCount: 6,
  gridColumns: 3,
  visualTimeLimitMs: 2200,
  glitchIntervalMinMs: 7000,
  glitchIntervalMaxMs: 9000,
  glitchVisibleMs: 1400,
};

describe("mapa-simbolos-monitor-som logic", () => {
  it("inicia sessão com estado base", () => {
    const runtime = startSession(config, () => 0.2);
    expect(runtime.currentVisualRound).toBeNull();
    expect(runtime.visualAttempts.length).toBe(0);
    expect(runtime.glitches.length).toBe(0);
  });

  it("registra hit e erro no matching visual", () => {
    const runtime = startSession(config, () => 0.3);
    const round = spawnVisualRound(runtime, 0, () => 0.4);

    const correctOption = round.options.find((item) => item.isTarget);

    expect(correctOption).toBeDefined();

    const hit = validateSymbolClick({
      runtime,
      optionId: correctOption?.id ?? "",
      atMs: 600,
    });
    expect(hit.accepted).toBe(true);
    expect(hit.correct).toBe(true);

    const nextRound = spawnVisualRound(runtime, 700, () => 0.5);
    const wrongOption = nextRound.options.find((item) => !item.isTarget);
    expect(wrongOption).toBeDefined();

    const error = validateSymbolClick({
      runtime,
      optionId: wrongOption?.id ?? "",
      atMs: 900,
    });
    expect(error.accepted).toBe(true);
    expect(error.correct).toBe(false);
  });

  it("marca omissão ao estourar tempo da rodada visual", () => {
    const runtime = startSession(config, () => 0.2);
    spawnVisualRound(runtime, 0, () => 0.1);

    updateRuntime(runtime, config.visualTimeLimitMs + 1, () => 0.1);

    expect(runtime.visualAttempts.some((item) => item.outcome === "omission")).toBe(true);
  });

  it("registra detecção de glitch e falso alarme", () => {
    const runtime = startSession(config, () => 0.2);
    const glitch = scheduleGlitches(runtime, runtime.nextGlitchAtMs, () => 0.1);

    expect(glitch).not.toBeNull();

    const detected = handleGlitchResponse({ runtime, atMs: (glitch?.startedAtMs ?? 0) + 200 });
    expect(detected.detected).toBe(true);

    const falseAlarm = handleGlitchResponse({ runtime, atMs: (glitch?.startedAtMs ?? 0) + 250 });
    expect(falseAlarm.falseAlarm).toBe(true);
    expect(runtime.falseAlarms).toBe(1);
  });

  it("calcula score final com peso 50/50", () => {
    const runtime = startSession(config, () => 0.2);

    const visual = spawnVisualRound(runtime, 0, () => 0.3);
    const correctOption = visual.options.find((item) => item.isTarget);
    validateSymbolClick({ runtime, optionId: correctOption?.id ?? "", atMs: 400 });

    const glitch = scheduleGlitches(runtime, runtime.nextGlitchAtMs, () => 0.1);
    handleGlitchResponse({ runtime, atMs: (glitch?.startedAtMs ?? 0) + 180 });

    const round = closeRound({
      runtime,
      roundNumber: 1,
      startedAtIso: new Date(1000).toISOString(),
      endedAtIso: new Date(61000).toISOString(),
    });

    const result = computeScores({
      startedAtMs: 1000,
      endedAtMs: 61000,
      rounds: [round],
    });

    expect(result.finalScore).toBeCloseTo((result.visualScore * 0.5) + (result.audioScore * 0.5), 5);
    expect(result.totalVisualHits).toBeGreaterThan(0);
    expect(result.totalAudioDetected).toBeGreaterThan(0);
  });
});
