import { describe, expect, it } from "vitest";
import { computeMetrics, generateGrid, handleSelection, placeWords } from "./logic";
import { WordSearchRoundConfig } from "./types";

const config: WordSearchRoundConfig = {
  size: 12,
  words: ["ATENCAO", "FOCO", "CONSTANCIA", "PACIENCIA"],
  allowedDirections: ["H", "V", "D"],
  allowReverse: true,
  seed: "seed-caca-1",
};

describe("caca-palavras-longos logic", () => {
  it("gera grade com palavras posicionadas", () => {
    const round = generateGrid(config);
    expect(round.grid).toHaveLength(12);
    expect(round.placements).toHaveLength(config.words.length);
  });

  it("respeita orientações permitidas", () => {
    const { placements } = placeWords(config);
    const validDirections = new Set(config.allowedDirections);
    expect(placements.every((item) => validDirections.has(item.direction))).toBe(true);
  });

  it("seleção válida marca palavra correta", () => {
    const round = generateGrid(config);
    const placement = round.placements[0];
    if (!placement) throw new Error("placement missing");

    const result = handleSelection({
      grid: round.grid,
      start: { row: placement.startRow, col: placement.startCol },
      end: { row: placement.endRow, col: placement.endCol },
      wordsToFind: config.words,
      foundWords: new Set<string>(),
    });

    expect(result.valid).toBe(true);
    expect(result.word).toBe(placement.word);
  });

  it("seleção inválida não marca palavra", () => {
    const round = generateGrid(config);
    const result = handleSelection({
      grid: round.grid,
      start: { row: 0, col: 0 },
      end: { row: 0, col: 1 },
      wordsToFind: config.words,
      foundWords: new Set<string>(),
    });

    if (result.valid) {
      expect(config.words.includes(result.word ?? "")).toBe(false);
    } else {
      expect(result.valid).toBe(false);
    }
  });

  it("calcula métricas finais consistentes", () => {
    const started = Date.now() - 40000;
    const ended = Date.now();
    const metrics = computeMetrics({
      startedAtMs: started,
      endedAtMs: ended,
      roundLogs: [
        {
          roundNumber: 1,
          size: 12,
          startedAtIso: new Date(started).toISOString(),
          endedAtIso: new Date(ended).toISOString(),
          elapsedMs: 40000,
          wordsTotal: 4,
          wordsFound: 3,
          invalidSelections: 5,
          foundWords: [
            { word: "ATENCAO", foundAtMs: 8000, wrongAttemptsBeforeHit: 1 },
            { word: "FOCO", foundAtMs: 16000, wrongAttemptsBeforeHit: 2 },
            { word: "PACIENCIA", foundAtMs: 28000, wrongAttemptsBeforeHit: 2 },
          ],
        },
      ],
    });

    expect(metrics.wordsFoundTotal).toBe(3);
    expect(metrics.totalInvalidSelections).toBe(5);
    expect(metrics.elapsedMs).toBeGreaterThan(0);
  });
});
