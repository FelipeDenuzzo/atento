import { describe, expect, it } from "vitest";
import {
  buildSessionResult,
  computeMetrics,
  createCopyGrid,
  exportCSV,
  generateModelGrid,
} from "./logic";
import { MatrixCopyConfig } from "./types";

const baseConfig: MatrixCopyConfig = {
  itemType: "letters",
  size: 6,
  optionCount: 8,
  durationSec: 180,
  prefillPercent: 15,
  modelVisibleDuringGame: true,
  seed: "seed-123",
};

describe("copia-matrizes logic", () => {
  it("gera matriz modelo com tamanho configurado", () => {
    const model = generateModelGrid(baseConfig);
    expect(model).toHaveLength(6);
    expect(model[0]).toHaveLength(6);
  });

  it("pré-preenche células e trava corretamente", () => {
    const model = generateModelGrid(baseConfig);
    const { copyGrid, locked } = createCopyGrid(model, baseConfig);

    let lockedCount = 0;
    for (let row = 0; row < baseConfig.size; row += 1) {
      for (let col = 0; col < baseConfig.size; col += 1) {
        if (locked[row]?.[col]) {
          lockedCount += 1;
          expect(copyGrid[row]?.[col]).toBe(model[row]?.[col]);
        }
      }
    }

    expect(lockedCount).toBeGreaterThan(0);
  });

  it("calcula métricas de acerto/erro/completude", () => {
    const model = [
      ["A", "B"],
      ["C", "D"],
    ];
    const copy = [
      ["A", "X"],
      ["", "D"],
    ];

    const metrics = computeMetrics({
      modelGrid: model,
      copyGrid: copy,
      actions: 3,
      elapsedMs: 30000,
    });

    expect(metrics.totalCells).toBe(4);
    expect(metrics.correct).toBe(2);
    expect(metrics.errors).toBe(1);
    expect(metrics.filled).toBe(3);
  });

  it("exporta CSV com campos principais", () => {
    const model = generateModelGrid(baseConfig);
    const { copyGrid } = createCopyGrid(model, baseConfig);
    const metrics = computeMetrics({
      modelGrid: model,
      copyGrid,
      actions: 10,
      elapsedMs: 45000,
    });

    const result = buildSessionResult({
      config: baseConfig,
      modelGrid: model,
      copyGrid,
      metrics,
      events: [],
    });

    const csv = exportCSV(result);
    expect(csv).toContain("itemType");
    expect(csv).toContain("modelGrid");
    expect(csv).toContain("copyGrid");
  });
});
