import { describe, expect, it } from "vitest";
import {
  generateMaze,
  hasReachedEnd,
  isMazeSolvable,
  isTimeExpired,
  movePlayer,
} from "./logic";
import { MazeLevelConfig } from "./types";

const level: MazeLevelConfig = {
  id: 1,
  name: "Teste",
  width: 15,
  height: 15,
  timeLimitSec: 120,
  minSolutionLength: 10,
};

describe("Labirintos Prolongados - logic", () => {
  it("gera labirinto sempre solucionável", () => {
    const maze = generateMaze(level);
    expect(isMazeSolvable(maze.grid, maze.start, maze.end)).toBe(true);
  });

  it("não atravessa paredes ao mover", () => {
    const grid = [
      [1, 1, 1],
      [1, 0, 1],
      [1, 1, 1],
    ] as const;
    const result = movePlayer(grid.map((row) => [...row]), { x: 1, y: 1 }, "up");
    expect(result.blocked).toBe(true);
    expect(result.position).toEqual({ x: 1, y: 1 });
  });

  it("move apenas para célula vizinha válida", () => {
    const grid = [
      [1, 1, 1, 1],
      [1, 0, 0, 1],
      [1, 1, 1, 1],
    ] as const;
    const result = movePlayer(grid.map((row) => [...row]), { x: 1, y: 1 }, "right");
    expect(result.blocked).toBe(false);
    expect(result.position).toEqual({ x: 2, y: 1 });
  });

  it("detecta vitória ao chegar no fim", () => {
    expect(hasReachedEnd({ x: 5, y: 6 }, { x: 5, y: 6 })).toBe(true);
    expect(hasReachedEnd({ x: 5, y: 6 }, { x: 5, y: 7 })).toBe(false);
  });

  it("timer expira corretamente", () => {
    expect(isTimeExpired(120000, 120)).toBe(true);
    expect(isTimeExpired(119999, 120)).toBe(false);
  });
});
