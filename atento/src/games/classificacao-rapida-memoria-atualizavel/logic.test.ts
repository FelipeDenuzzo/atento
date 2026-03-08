import { describe, expect, it } from "vitest";
import {
  buildRoundLog,
  computeScores,
  spawnStimulus,
  startSession,
  triggerMemoryCheck,
  validateClassificationAnswer,
  validateMemoryCheckAnswer,
} from "./logic";
import type { RapidMemoryRoundConfig } from "./types";

const numberLastTargetsConfig: RapidMemoryRoundConfig = {
  id: 1,
  name: "Fase 1",
  durationMs: 60000,
  stimulusVisibleMs: 1500,
  interStimulusMs: 250,
  memoryCheckMinIntervalMs: 9000,
  memoryCheckMaxIntervalMs: 12000,
  classificationMode: "number",
  memoryMode: "last-targets",
  alternativesCount: 4,
  keyMap: { left: "f", right: "j" },
};

const letterCounterConfig: RapidMemoryRoundConfig = {
  id: 2,
  name: "Fase 2",
  durationMs: 70000,
  stimulusVisibleMs: 1400,
  interStimulusMs: 220,
  memoryCheckMinIntervalMs: 7000,
  memoryCheckMaxIntervalMs: 9500,
  classificationMode: "letter",
  memoryMode: "mental-counter",
  alternativesCount: 3,
  keyMap: { left: "f", right: "j" },
};

describe("classificacao-rapida-memoria-atualizavel logic", () => {
  it("inicia sessão com estado base", () => {
    const runtime = startSession(numberLastTargetsConfig, () => 0.3);
    expect(runtime.activeStimulus).toBeNull();
    expect(runtime.activeMemoryCheck).toBeNull();
    expect(runtime.classificationEvents.length).toBe(0);
    expect(runtime.memoryChecks.length).toBe(0);
    expect(runtime.nextMemoryCheckAtMs).toBeGreaterThan(0);
  });

  it("registra acerto, erro e omissão na classificação", () => {
    const runtime = startSession(numberLastTargetsConfig, () => 0.1);

    const first = spawnStimulus(runtime, 0, () => 0.2);
    expect(first).not.toBeNull();
    if (!first) throw new Error("missing stimulus");

    const keyForHit = first.category === "left" ? "f" : "j";
    const hit = validateClassificationAnswer({ runtime, key: keyForHit, atMs: 300 });
    expect(hit.accepted).toBe(true);
    expect(hit.correct).toBe(true);

    spawnStimulus(runtime, 700, () => 0.8);
    const second = runtime.activeStimulus;
    if (!second) throw new Error("second stimulus missing");

    const wrongKey = second.category === "left" ? "j" : "f";
    const error = validateClassificationAnswer({ runtime, key: wrongKey, atMs: 900 });
    expect(error.accepted).toBe(true);
    expect(error.correct).toBe(false);

    spawnStimulus(runtime, 1300, () => 0.4);
    const third = runtime.activeStimulus;
    if (!third) throw new Error("third stimulus missing");

    spawnStimulus(runtime, third.deadlineMs + 5, () => 0.5);

    const hits = runtime.classificationEvents.filter((item) => item.outcome === "hit").length;
    const errors = runtime.classificationEvents.filter((item) => item.outcome === "error").length;
    const omissions = runtime.classificationEvents.filter((item) => item.outcome === "omission").length;

    expect(hits).toBe(1);
    expect(errors).toBe(1);
    expect(omissions).toBe(1);
  });

  it("gera e valida checagem de memória em last-targets", () => {
    const runtime = startSession(numberLastTargetsConfig, () => 0.1);

    for (let index = 0; index < 3; index += 1) {
      spawnStimulus(runtime, index * 900, () => 0.2);
      const active = runtime.activeStimulus;
      if (!active) throw new Error("stimulus missing");
      const keyForHit = active.category === "left" ? "f" : "j";
      validateClassificationAnswer({ runtime, key: keyForHit, atMs: index * 900 + 250 });
    }

    const check = triggerMemoryCheck(runtime, runtime.nextMemoryCheckAtMs + 1, () => 0.3);
    expect(check).not.toBeNull();
    if (!check) throw new Error("memory check missing");

    const answer = validateMemoryCheckAnswer({
      runtime,
      optionIndex: check.correctOptionIndex,
      atMs: check.askedAtMs + 400,
    });

    expect(answer.accepted).toBe(true);
    expect(answer.correct).toBe(true);
  });

  it("reinicia contador mental após checagem", () => {
    const runtime = startSession(letterCounterConfig, () => 0.1);

    for (let index = 0; index < 4; index += 1) {
      spawnStimulus(runtime, index * 800, () => 0.0);
      const active = runtime.activeStimulus;
      if (!active) throw new Error("stimulus missing");
      const keyForHit = active.category === "left" ? "f" : "j";
      validateClassificationAnswer({ runtime, key: keyForHit, atMs: index * 800 + 220 });
    }

    const check = triggerMemoryCheck(runtime, runtime.nextMemoryCheckAtMs + 1, () => 0.2);
    expect(check).not.toBeNull();
    if (!check) throw new Error("check missing");

    const result = validateMemoryCheckAnswer({
      runtime,
      optionIndex: check.correctOptionIndex,
      atMs: check.askedAtMs + 500,
    });

    expect(result.accepted).toBe(true);
    if (runtime.memoryState.mode !== "mental-counter") {
      throw new Error("invalid memory mode");
    }
    expect(runtime.memoryState.counterSinceLastCheck).toBe(0);
  });

  it("calcula score final 50/50", () => {
    const runtime = startSession(numberLastTargetsConfig, () => 0.2);

    for (let index = 0; index < 2; index += 1) {
      spawnStimulus(runtime, index * 900, () => 0.2);
      const active = runtime.activeStimulus;
      if (!active) throw new Error("stimulus missing");
      const keyForHit = active.category === "left" ? "f" : "j";
      validateClassificationAnswer({ runtime, key: keyForHit, atMs: index * 900 + 250 });
    }

    const check = triggerMemoryCheck(runtime, runtime.nextMemoryCheckAtMs + 1, () => 0.4);
    if (!check) throw new Error("check missing");
    validateMemoryCheckAnswer({ runtime, optionIndex: check.correctOptionIndex, atMs: check.askedAtMs + 350 });

    const round = buildRoundLog({
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

    expect(result.finalScore).toBeCloseTo((result.classificationScore + result.memoryScore) / 2, 5);
    expect(result.totalMemoryChecks).toBeGreaterThan(0);
  });
});
