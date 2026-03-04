import { describe, expect, it } from "vitest";
import {
  countTargets,
  evaluateAnswer,
  generateStimulusSequence,
} from "./logic";
import { CountingFlowLevelConfig } from "./types";

const level: CountingFlowLevelConfig = {
  id: 1,
  name: "Teste",
  modality: "visual",
  totalStimuli: 60,
  stimulusDurationMs: 600,
  isiMs: 400,
  targetProbability: 0.2,
  targetVisual: { shape: "circle", color: "red" },
  distractorVisuals: [
    { shape: "circle", color: "blue" },
    { shape: "square", color: "green" },
  ],
};

describe("Contagem de Estímulos em Fluxo - lógica", () => {
  it("gera sequência com tamanho correto", () => {
    const sequence = generateStimulusSequence(level);
    expect(sequence).toHaveLength(level.totalStimuli);
  });

  it("mantém proporção aproximada de alvo", () => {
    const sequence = generateStimulusSequence(level);
    const targetCount = countTargets(sequence);
    expect(targetCount).toBe(Math.round(level.totalStimuli * level.targetProbability));
  });

  it("avalia resposta exata", () => {
    const result = evaluateAnswer(12, 12);
    expect(result.absoluteError).toBe(0);
    expect(result.estimationDirection).toBe("exact");
  });

  it("avalia subestimação", () => {
    const result = evaluateAnswer(12, 9);
    expect(result.absoluteError).toBe(3);
    expect(result.estimationDirection).toBe("under");
  });

  it("avalia superestimação", () => {
    const result = evaluateAnswer(12, 16);
    expect(result.absoluteError).toBe(4);
    expect(result.estimationDirection).toBe("over");
  });
});
