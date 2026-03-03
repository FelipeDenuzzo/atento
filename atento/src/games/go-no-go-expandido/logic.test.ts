import { describe, expect, it } from "vitest";
import {
  createEmptyMetrics,
  defaultExpandidoLevels,
  generateBlockTrials,
  registerTrialOutcome,
} from "./logic";

describe("go-no-go logic", () => {
  it("gera bloco respeitando proporção go/no-go", () => {
    const level = {
      ...defaultExpandidoLevels()[0],
      trialsPerBlock: 40,
      goProbability: 0.7,
    };

    const trials = generateBlockTrials(level, () => 0.21);
    const goCount = trials.filter((trial) => trial.shouldClick).length;
    const nogoCount = trials.filter((trial) => !trial.shouldClick).length;

    expect(goCount).toBe(28);
    expect(nogoCount).toBe(12);
  });

  it("gera trials com categoria alvo consistente", () => {
    const level = defaultExpandidoLevels()[0];
    const trials = generateBlockTrials(level, () => 0.5);

    const firstCategory = trials[0].targetCategory;
    const allSameCategory = trials.every((trial) => trial.targetCategory === firstCategory);

    expect(allSameCategory).toBe(true);
    expect(["fruta", "objeto"]).toContain(firstCategory);
  });

  it("gera nível 3 com múltiplos itens corretamente", () => {
    const level = defaultExpandidoLevels()[2]; // Nível 3
    const trials = generateBlockTrials(level, () => 0.5);

    const goTrials = trials.filter((trial) => trial.shouldClick);
    const nogoTrials = trials.filter((trial) => !trial.shouldClick);

    // Go trials no nível 3 devem ter todos os itens da mesma categoria (alvo)
    goTrials.forEach((trial) => {
      if (trial.items.length > 1) {
        const allSameCategory = trial.items.every(
          (item) => item.category === trial.targetCategory
        );
        expect(allSameCategory).toBe(true);
      }
    });

    // NoGo trials no nível 3 devem ter pelo menos um item diferente
    nogoTrials.forEach((trial) => {
      if (trial.items.length > 1) {
        const hasDifferent = trial.items.some(
          (item) => item.category !== trial.targetCategory
        );
        expect(hasDifferent).toBe(true);
      }
    });
  });

  it("conta métricas de acerto/erro corretamente", () => {
    let metrics = createEmptyMetrics();

    metrics = registerTrialOutcome(metrics, {
      shouldClick: true,
      didClick: true,
      reactionTimeMs: 420,
    });
    metrics = registerTrialOutcome(metrics, {
      shouldClick: false,
      didClick: false,
    });
    metrics = registerTrialOutcome(metrics, {
      shouldClick: false,
      didClick: true,
    });
    metrics = registerTrialOutcome(metrics, {
      shouldClick: true,
      didClick: false,
    });

    expect(metrics.goCorrect).toBe(1);
    expect(metrics.nogoCorrect).toBe(1);
    expect(metrics.commissionErrors).toBe(1);
    expect(metrics.omissionErrors).toBe(1);
    expect(metrics.reactionTimesMs).toEqual([420]);
  });
});
