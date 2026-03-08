import { describe, expect, it } from "vitest";
import {
  closeRound,
  computeFinalMetrics,
  computeMetrics,
  generateRuleSequence,
  handleResponse,
  resolveTimeout,
  spawnTrial,
  startSession,
} from "./logic";
import type { ReversalRoundConfig } from "./types";

const config: ReversalRoundConfig = {
  id: 1,
  name: "Teste",
  durationMs: 60000,
  totalTrials: 20,
  fixationMinMs: 300,
  fixationMaxMs: 300,
  cueMs: 500,
  responseLimitMs: 2000,
  interTrialMs: 250,
  feedbackMs: 300,
  showFeedback: true,
  switchRate: 0.5,
  targetRate: 0.5,
};

describe("reversal-go-nogo-switch logic", () => {
  it("gera sequência de regra com tamanho configurado", () => {
    const sequence = generateRuleSequence({ totalTrials: 40, switchRate: 0.5, rng: () => 0.3 });
    expect(sequence).toHaveLength(40);
    expect(sequence.every((rule) => rule === "normal" || rule === "inverted")).toBe(true);
  });

  it("avalia clique correto quando esperado", () => {
    const runtime = startSession(config, () => 0.2);
    const trial = spawnTrial({ runtime, atMs: 0, rng: () => 0.1 });
    if (!trial) throw new Error("trial missing");

    const result = handleResponse({ runtime, clicked: trial.expectedClick, atMs: trial.shownAtMs + 300 });

    expect(result.accepted).toBe(true);
    expect(result.correct).toBe(true);
  });

  it("registra timeout com classificação correta", () => {
    const runtime = startSession(config, () => 0.2);
    const trial = spawnTrial({ runtime, atMs: 0, rng: () => 0.1 });
    if (!trial) throw new Error("trial missing");

    const outcome = resolveTimeout({ runtime, atMs: trial.deadlineAtMs + 1 });
    expect(outcome.accepted).toBe(true);
    expect(runtime.logs[0]?.outcome).toBeDefined();
  });

  it("calcula switch cost e acurácia", () => {
    const metrics = computeMetrics([
      {
        trialIndex: 1,
        rule: "normal",
        trialType: "repeat",
        stimulusShape: "star",
        stimulusKind: "target",
        expectedClick: true,
        clicked: true,
        correct: true,
        outcome: "hit",
        shownAtMs: 1000,
        respondedAtMs: 1300,
        reactionMs: 300,
        timedOut: false,
      },
      {
        trialIndex: 2,
        rule: "inverted",
        trialType: "switch",
        stimulusShape: "circle",
        stimulusKind: "non-target",
        expectedClick: true,
        clicked: true,
        correct: true,
        outcome: "hit",
        shownAtMs: 2000,
        respondedAtMs: 2500,
        reactionMs: 500,
        timedOut: false,
      },
    ]);

    expect(metrics.switchCostMs).toBeGreaterThan(0);
    expect(metrics.accuracyPercent).toBeGreaterThan(0);
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
