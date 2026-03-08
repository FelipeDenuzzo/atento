import { describe, expect, it } from "vitest";
import {
  classifyTrialType,
  closeRound,
  computeFinalMetrics,
  computeSwitchMetrics,
  generateRuleSequence,
  handleResponse,
  resolveOmission,
  spawnTrial,
  startSession,
} from "./logic";
import type { ColorShapeSwitchRoundConfig } from "./types";

const config: ColorShapeSwitchRoundConfig = {
  id: 1,
  name: "Teste",
  durationMs: 60000,
  totalTrials: 18,
  fixationMinMs: 300,
  fixationMaxMs: 300,
  responseLimitMs: 2000,
  interTrialMs: 200,
  feedbackMs: 300,
  showFeedback: true,
  ruleBlockMin: 1,
  ruleBlockMax: 3,
  colors: ["red", "blue"],
  shapes: ["circle", "square"],
  keyMap: {
    color: { red: "j", blue: "k" },
    shape: { circle: "a", square: "s" },
  },
};

describe("cor-ou-forma-switch logic", () => {
  it("gera sequência em blocos de 1 a 3", () => {
    const sequence = generateRuleSequence({ totalTrials: 40, blockMin: 1, blockMax: 3, rng: () => 0.4 });
    expect(sequence.length).toBe(40);

    let runLength = 1;
    for (let i = 1; i < sequence.length; i += 1) {
      if (sequence[i] === sequence[i - 1]) {
        runLength += 1;
      } else {
        expect(runLength).toBeGreaterThanOrEqual(1);
        expect(runLength).toBeLessThanOrEqual(3);
        runLength = 1;
      }
    }
    expect(runLength).toBeGreaterThanOrEqual(1);
    expect(runLength).toBeLessThanOrEqual(3);
  });

  it("classifica trial como repetição ou troca", () => {
    expect(classifyTrialType(null, "color")).toBe("initial");
    expect(classifyTrialType("color", "color")).toBe("repeat");
    expect(classifyTrialType("color", "shape")).toBe("switch");
  });

  it("valida resposta por regra", () => {
    const runtime = startSession(config, () => 0.1);
    const trial = spawnTrial({ runtime, atMs: 0, rng: () => 0.1 });
    if (!trial) throw new Error("trial missing");

    const key = trial.rule === "color" ? config.keyMap.color[trial.color] : config.keyMap.shape[trial.shape];
    const result = handleResponse({ runtime, key, atMs: trial.shownAtMs + 300 });

    expect(result.accepted).toBe(true);
    expect(result.correct).toBe(true);
  });

  it("registra omissão em timeout", () => {
    const runtime = startSession(config, () => 0.3);
    const trial = spawnTrial({ runtime, atMs: 0, rng: () => 0.2 });
    if (!trial) throw new Error("trial missing");

    const omission = resolveOmission({ runtime, atMs: trial.deadlineAtMs + 1 });
    expect(omission.accepted).toBe(true);
    expect(runtime.logs[0]?.outcome).toBe("omission");
  });

  it("calcula switch cost e métricas finais", () => {
    const metrics = computeSwitchMetrics([
      {
        trialIndex: 1,
        rule: "color",
        trialType: "repeat",
        color: "red",
        shape: "circle",
        expectedKey: "j",
        shownAtMs: 1000,
        respondedAtMs: 1300,
        reactionMs: 300,
        outcome: "hit",
      },
      {
        trialIndex: 2,
        rule: "shape",
        trialType: "switch",
        color: "red",
        shape: "circle",
        expectedKey: "a",
        shownAtMs: 2000,
        respondedAtMs: 2500,
        reactionMs: 500,
        outcome: "hit",
      },
    ]);

    expect(metrics.switchCostMs).toBeGreaterThan(0);

    const runtime = startSession(config, () => 0.2);
    const spawned = spawnTrial({ runtime, atMs: 0, rng: () => 0.2 });
    if (!spawned) throw new Error("trial missing");
    resolveOmission({ runtime, atMs: spawned.deadlineAtMs + 1 });

    const round = closeRound({
      runtime,
      roundNumber: 1,
      startedAtIso: new Date(1000).toISOString(),
      endedAtIso: new Date(61000).toISOString(),
    });

    const result = computeFinalMetrics({
      startedAtMs: 1000,
      endedAtMs: 61000,
      rounds: [round],
    });

    expect(result.rounds.length).toBe(1);
    expect(result.finalScore).toBeGreaterThanOrEqual(0);
  });
});
