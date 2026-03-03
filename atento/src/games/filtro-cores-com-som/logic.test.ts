import { describe, expect, it } from "vitest";
import { getNextTargetColor, hitTestShape, shouldSpawnShape } from "./logic";
import { FallingShape } from "./types";

describe("filtro cores com som logic", () => {
  it("troca cor alvo sem repetir quando ha alternativas", () => {
    const colors = ["red", "green", "blue"] as const;
    const next = getNextTargetColor([...colors], "red", () => 0.2);
    expect(next).not.toBe("red");
  });

  it("identifica hit na forma correta", () => {
    const shapes: FallingShape[] = [
      {
        id: "shape-1",
        x: 50,
        y: 50,
        size: 20,
        colorId: "red",
        kind: "circle",
        isCaptured: false,
        spawnedAt: 0,
      },
    ];

    const hit = hitTestShape(shapes, { x: 55, y: 55 });
    expect(hit?.id).toBe("shape-1");
  });

  it("respeita limite maximo de formas", () => {
    const shapes: FallingShape[] = Array.from({ length: 3 }, (_, index) => ({
      id: `shape-${index}`,
      x: 0,
      y: 0,
      size: 10,
      colorId: "green",
      kind: "square",
      isCaptured: false,
      spawnedAt: 0,
    }));

    expect(shouldSpawnShape(shapes, 3)).toBe(false);
    expect(shouldSpawnShape(shapes, 4)).toBe(true);
  });
});
