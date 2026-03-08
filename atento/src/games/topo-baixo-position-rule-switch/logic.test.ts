import { describe, expect, it } from "vitest";
import {
  closeRound,
  computeFinalMetrics,
  computeMetrics,
  generatePositionSequence,
  handleResponse,
  resolveTimeout,
  spawnTrial,
  startSession,
} from "./logic";
import type { PositionRuleRoundConfig } from "./types";

const config: PositionRuleRoundConfig = {
  id: 1,
  name: "Teste",
  durationMs: 60000,
  totalTrials: 20,
  fixationMinMs: 300,
  fixationMaxMs: 300,
  responseLimitMs: 2000,
  interTrialMs: 250,
  feedbackMs: 300,
  showFeedback: true,
  switchRate: 0.5,
  colors: ["blue", "green"],
  shapes: ["square", "rectangle"],
  topRule: {
    id: "A",
    dimension: "color",
    colorKeyMap: { blue: "a", green: "s" },
    shapeKeyMap: { square: "k", rectangle: "l" },
  },
  bottomRule: {
    id: "B",
    dimension: "shape",
    colorKeyMap: { blue: "a", green: "s" },
    shapeKeyMap: { square: "k", rectangle: "l" },
  },
};

describe("topo-baixo-position-rule-switch logic", () => {
  it("gera sequência com tamanho configurado", () => {
    const sequence = generatePositionSequence({ totalTrials: 40, switchRate: 0.5, rng: () => 0.3 });
    expect(sequence).toHaveLength(40);
    expect(sequence.every((item) => item === "top" || item === "bottom")).toBe(true);
  });

  it("valida resposta por regra ativa", () => {
    const runtime = startSession(config, () => 0.2);
    const trial = spawnTrial({ runtime, atMs: 0, rng: () => 0.1 });
    if (!trial) throw new Error("trial missing");

    const key = trial.expectedKey;
    const result = handleResponse({ runtime, key, atMs: trial.shownAtMs + 350 });

    expect(result.accepted).toBe(true);
    expect(result.correct).toBe(true);
  });

  it("registra omissão em timeout", () => {
    const runtime = startSession(config, () => 0.2);
    const trial = spawnTrial({ runtime, atMs: 0, rng: () => 0.1 });
    if (!trial) throw new Error("trial missing");

    const omission = resolveTimeout({ runtime, atMs: trial.deadlineAtMs + 1 });
    expect(omission.accepted).toBe(true);
    expect(runtime.logs[0]?.outcome).toBe("omission");
  });

  it("calcula métricas com switch cost", () => {
    const metrics = computeMetrics([
      {
        trialIndex: 1,
        position: "top",
        rule: "A",
        trialType: "repeat",
        relevantDimension: "color",
        stimulusColor: "blue",
        stimulusShape: "square",
        expectedKey: "a",
        pressedKey: "a",
        correct: true,
        outcome: "hit",
        shownAtMs: 1000,
        respondedAtMs: 1300,
        reactionMs: 300,
        timedOut: false,
      },
      {
        trialIndex: 2,
        position: "bottom",
        rule: "B",
        trialType: "switch",
        relevantDimension: "shape",
        stimulusColor: "green",
        stimulusShape: "rectangle",
        expectedKey: "l",
        pressedKey: "l",
        correct: true,
        outcome: "hit",
        shownAtMs: 2000,
        respondedAtMs: 2500,
        reactionMs: 500,
        timedOut: false,
      },
    ]);

    expect(metrics.switchCostMs).toBeGreaterThan(0);
    expect(metrics.meanCorrectReactionMs).toBeGreaterThan(0);
  });

  it("consolida resultado final", () => {
    const runtime = startSession(config, () => 0.2);
    const trial = spawnTrial({ runtime, atMs: 0, rng: () => 0.2 });
    if (!trial) throw new Error("trial missing");
    resolveTimeout({ runtime, atMs: trial.deadlineAtMs + 1 });

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
