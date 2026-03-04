import { describe, expect, it } from "vitest";
import {
  buildResultText,
  computeMetrics,
  generateMatrix,
  getDistractorPool,
  NUMBER_STIMULI,
  SYMBOL_STIMULI,
  toggleCellMark,
} from "./logic";
import { MatrixConfig } from "./types";

const baseConfig: MatrixConfig = {
  size: 10,
  stimulusType: "numbers",
  target: "7",
  targetDensity: 0.15,
  durationSec: 420,
  seed: "abc",
  difficulty: "normal",
};

describe("busca-simbolos-matriz logic", () => {
  it("gera grade com contagem de alvos esperada", () => {
    const cells = generateMatrix(baseConfig);
    const targets = cells.filter((cell) => cell.isTarget).length;
    expect(cells).toHaveLength(100);
    expect(targets).toBe(15);
  });

  it("mantém distratores do mesmo tipo", () => {
    const numberDistractors = getDistractorPool(baseConfig);
    expect(numberDistractors.every((item) => NUMBER_STIMULI.includes(item))).toBe(true);

    const symbolConfig: MatrixConfig = {
      ...baseConfig,
      stimulusType: "symbols",
      target: "☆",
    };

    const symbolDistractors = getDistractorPool(symbolConfig);
    expect(symbolDistractors.every((item) => SYMBOL_STIMULI.includes(item))).toBe(true);
  });

  it("alterna marcação da célula", () => {
    const cells = generateMatrix(baseConfig);
    const firstId = cells[0]?.id;
    if (!firstId) throw new Error("expected first cell");

    const afterFirstToggle = toggleCellMark(cells, firstId);
    const toggled = afterFirstToggle.find((cell) => cell.id === firstId);
    expect(toggled?.marked).toBe(true);

    const afterSecondToggle = toggleCellMark(afterFirstToggle, firstId);
    const toggledAgain = afterSecondToggle.find((cell) => cell.id === firstId);
    expect(toggledAgain?.marked).toBe(false);
  });

  it("calcula métricas clássicas de cancelamento", () => {
    const cells = [
      { id: "1", value: "7", isTarget: true, marked: true },
      { id: "2", value: "7", isTarget: true, marked: false },
      { id: "3", value: "3", isTarget: false, marked: true },
      { id: "4", value: "5", isTarget: false, marked: false },
    ];

    const metrics = computeMetrics(cells, 120);
    expect(metrics.hits).toBe(1);
    expect(metrics.omissions).toBe(1);
    expect(metrics.commissions).toBe(1);
    expect(metrics.precision).toBe(0.5);
    expect(metrics.recall).toBe(0.5);
  });

  it("gera txt com campos principais", () => {
    const cells = generateMatrix(baseConfig);
    const metrics = computeMetrics(cells, 420);
    const txt = buildResultText(baseConfig, metrics);
    expect(txt).toContain("RESULTADO - BUSCA DE SÍMBOLOS EM MATRIZ");
    expect(txt).toContain("Hits");
    expect(txt).toContain("Omissões");
    expect(txt).toContain("Comissões");
  });
});
