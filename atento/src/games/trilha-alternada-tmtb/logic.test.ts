import { describe, expect, it } from "vitest";
import {
  buildAlternatingSequence,
  evaluateClick,
  generateNodeLayout,
} from "./logic";

describe("trilha-alternada-tmtb logic", () => {
  it("gera sequência alternada número-letra", () => {
    const sequence = buildAlternatingSequence({ numbersCount: 3, lettersCount: 3 });
    expect(sequence.map((item) => item.label)).toEqual(["1", "A", "2", "B", "3", "C"]);
  });

  it("avança quando o clique é correto", () => {
    const result = evaluateClick({
      clickedSeqIndex: 4,
      currentSeqIndex: 4,
      penaltyMode: "back-step",
      backStepsOnError: 1,
    });

    expect(result.correct).toBe(true);
    expect(result.nextSeqIndex).toBe(5);
    expect(result.backStepsApplied).toBe(0);
  });

  it("recua um passo no erro com penalização padrão", () => {
    const result = evaluateClick({
      clickedSeqIndex: 7,
      currentSeqIndex: 4,
      penaltyMode: "back-step",
      backStepsOnError: 1,
    });

    expect(result.correct).toBe(false);
    expect(result.nextSeqIndex).toBe(3);
    expect(result.backStepsApplied).toBe(1);
  });

  it("mantém posição no erro quando configurado", () => {
    const result = evaluateClick({
      clickedSeqIndex: 7,
      currentSeqIndex: 4,
      penaltyMode: "keep-position",
      backStepsOnError: 2,
    });

    expect(result.correct).toBe(false);
    expect(result.nextSeqIndex).toBe(4);
    expect(result.backStepsApplied).toBe(0);
  });

  it("gera layout sem sobreposição crítica", () => {
    const sequence = buildAlternatingSequence({ numbersCount: 5, lettersCount: 5 });
    const values = [0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95];
    let cursor = 0;
    const rng = () => {
      const value = values[cursor % values.length] as number;
      cursor += 1;
      return value;
    };

    const nodes = generateNodeLayout({
      items: sequence,
      minDistancePct: 8,
      rng,
    });

    expect(nodes).toHaveLength(sequence.length);
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const distance = Math.hypot(nodes[i]!.xPct - nodes[j]!.xPct, nodes[i]!.yPct - nodes[j]!.yPct);
        expect(distance).toBeGreaterThanOrEqual(8);
      }
    }
  });
});
