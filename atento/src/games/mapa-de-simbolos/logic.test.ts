import { describe, expect, it } from "vitest";
import {
  buildLevelResult,
  evaluateCellClick,
  generateBoard,
  isRoundCompleted,
} from "./logic";
import { SymbolMapLevelConfig } from "./types";

const sampleLevel: SymbolMapLevelConfig = {
  id: 1,
  name: "Teste",
  rows: 6,
  cols: 6,
  timeLimitSec: 40,
  targetSymbols: ["☆"],
  targetCount: 8,
  distractorSymbols: ["●", "■", "▲"],
};

describe("Mapa de Símbolos - logic", () => {
  it("gera grade com quantidade exata de alvos", () => {
    const board = generateBoard(sampleLevel, () => 0.2);
    const totalTargets = board.filter((cell) => cell.isTarget).length;
    expect(board).toHaveLength(sampleLevel.rows * sampleLevel.cols);
    expect(totalTargets).toBe(sampleLevel.targetCount);
  });

  it("regra de clique em alvo não marcado e repetido", () => {
    const board = generateBoard(sampleLevel, () => 0.3);
    const target = board.find((cell) => cell.isTarget);
    if (!target) throw new Error("target not found");

    const first = evaluateCellClick(board, target.id);
    expect(first.outcome).toBe("hit");
    expect(first.foundIncrement).toBe(1);

    const second = evaluateCellClick(first.updatedCells, target.id);
    expect(second.outcome).toBe("already-found");
    expect(second.foundIncrement).toBe(0);
  });

  it("regra de clique em distrator conta erro", () => {
    const board = generateBoard(sampleLevel, () => 0.6);
    const distractor = board.find((cell) => !cell.isTarget);
    if (!distractor) throw new Error("distractor not found");

    const result = evaluateCellClick(board, distractor.id);
    expect(result.outcome).toBe("miss");
    expect(result.missIncrement).toBe(1);
  });

  it("encerra com sucesso ao encontrar todos os alvos", () => {
    const board = generateBoard(sampleLevel, () => 0.4);
    const totalTargets = board.filter((cell) => cell.isTarget).length;

    const completion = isRoundCompleted({
      targetsFound: totalTargets,
      totalTargets,
      elapsedMs: 1000,
      timeLimitSec: sampleLevel.timeLimitSec,
    });

    expect(completion.completed).toBe(true);
    expect(completion.success).toBe(true);
  });

  it("encerra por tempo com resultado parcial", () => {
    const board = generateBoard(sampleLevel, () => 0.5);
    const totalTargets = board.filter((cell) => cell.isTarget).length;

    const completion = isRoundCompleted({
      targetsFound: 1,
      totalTargets,
      elapsedMs: sampleLevel.timeLimitSec * 1000,
      timeLimitSec: sampleLevel.timeLimitSec,
    });

    expect(completion.completed).toBe(true);
    expect(completion.success).toBe(false);

    const result = buildLevelResult({
      level: sampleLevel,
      timeElapsedMs: sampleLevel.timeLimitSec * 1000,
      board,
      targetsFound: 1,
      misses: 3,
      completed: false,
    });
    expect(result.targetsFound).toBe(1);
    expect(result.misses).toBe(3);
  });
});
