import { describe, expect, it } from "vitest";
import {
  buildRoundResult,
  computeMetrics,
  exportCSV,
  generateRound,
  getItemPool,
} from "./logic";
import { MissingItemConfig } from "./types";

const baseConfig: MissingItemConfig = {
  presentationMode: "side-by-side",
  layoutMode: "grid",
  gridSize: 8,
  itemType: "symbols",
  differenceMode: "mixed",
  differenceCount: 1,
  durationSec: 180,
  roundLimit: 10,
  seed: "seed-1",
  responseMode: "click-difference",
  highContrast: false,
};

describe("achar-o-faltando logic", () => {
  it("gera rodada com total de células esperado", () => {
    const round = generateRound(baseConfig, 1);
    expect(round.itemsA).toHaveLength(64);
    expect(round.itemsB).toHaveLength(64);
    expect(round.differences).toHaveLength(1);
  });

  it("modo missing deixa célula realmente vazia", () => {
    const round = generateRound({ ...baseConfig, differenceMode: "missing" }, 3);
    const diff = round.differences[0];
    expect(diff?.kind).toBe("missing");
    expect(round.itemsB[diff?.index ?? 0]).toBe("");
  });

  it("modo extra usa item novo fora da base", () => {
    const round = generateRound({ ...baseConfig, differenceMode: "extra", itemType: "letters" }, 4);
    const diff = round.differences[0];
    const extra = diff?.expectedItem ?? "";
    expect(diff?.kind).toBe("extra");
    expect(round.itemsA.includes(extra)).toBe(false);
  });

  it("respeita tipos de pool", () => {
    const nums = getItemPool("numbers");
    expect(nums).toContain("0");
    expect(nums).toContain("9");

    const letters = getItemPool("letters");
    expect(letters).toContain("A");
    expect(letters).toContain("Z");
  });

  it("avalia clique com hits e omissões", () => {
    const round = generateRound({ ...baseConfig, differenceCount: 1 }, 2);
    const target = round.differences[0]?.index ?? 0;

    const result = buildRoundResult({
      config: { ...baseConfig, responseMode: "click-difference", differenceCount: 1 },
      round,
      response: {
        markedIndexes: [target],
        selectedItems: [],
        responseTimeMs: 1200,
      },
      nowIso: "2026-03-05T10:00:00.000Z",
    });

    expect(result.hits).toBe(1);
    expect(result.omissions).toBe(0);
    expect(result.falsePositives).toBe(0);
    expect(result.correct).toBe(true);
  });

  it("calcula métricas agregadas", () => {
    const metrics = computeMetrics(
      [
        {
          roundNumber: 1,
          timestampIso: "2026-03-05T10:00:00.000Z",
          gridSize: 8,
          presentationMode: "side-by-side",
          layoutMode: "grid",
          itemType: "symbols",
          differenceMode: "mixed",
          responseMode: "click-difference",
          differenceCount: 1,
          targetItems: ["☆"],
          differencePositions: [4],
          response: "4",
          correct: true,
          hits: 1,
          omissions: 0,
          falsePositives: 0,
          responseTimeMs: 1300,
        },
        {
          roundNumber: 2,
          timestampIso: "2026-03-05T10:00:02.000Z",
          gridSize: 8,
          presentationMode: "side-by-side",
          layoutMode: "grid",
          itemType: "symbols",
          differenceMode: "mixed",
          responseMode: "click-difference",
          differenceCount: 1,
          targetItems: ["★"],
          differencePositions: [12],
          response: "",
          correct: false,
          hits: 0,
          omissions: 1,
          falsePositives: 0,
          responseTimeMs: 2100,
        },
      ],
      30,
    );

    expect(metrics.roundsPlayed).toBe(2);
    expect(metrics.totalHits).toBe(1);
    expect(metrics.totalOmissions).toBe(1);
    expect(metrics.averageResponseMs).toBe(1700);
  });

  it("exporta csv com cabeçalho", () => {
    const csv = exportCSV([
      {
        roundNumber: 1,
        timestampIso: "2026-03-05T10:00:00.000Z",
        gridSize: 8,
        presentationMode: "side-by-side",
        layoutMode: "grid",
        itemType: "symbols",
        differenceMode: "mixed",
        responseMode: "click-difference",
        differenceCount: 1,
        targetItems: ["☆"],
        differencePositions: [8],
        response: "8",
        correct: true,
        hits: 1,
        omissions: 0,
        falsePositives: 0,
        responseTimeMs: 1000,
      },
    ]);

    expect(csv).toContain("timestamp,round,size");
    expect(csv).toContain("\"side-by-side\"");
  });
});
