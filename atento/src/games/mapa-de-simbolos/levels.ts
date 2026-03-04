import { SymbolMapLevelConfig } from "./types";

export const defaultSymbolMapLevels = (): SymbolMapLevelConfig[] => [
  {
    id: 1,
    name: "Nível 1",
    rows: 5,
    cols: 5,
    timeLimitSec: 50,
    targetSymbols: ["☆"],
    targetCount: 6,
    distractorSymbols: ["●", "■", "▲", "✚", "◆"],
  },
  {
    id: 2,
    name: "Nível 2",
    rows: 6,
    cols: 6,
    timeLimitSec: 45,
    targetSymbols: ["★"],
    targetCount: 8,
    distractorSymbols: ["☆", "✦", "✧", "✩", "✪"],
  },
  {
    id: 3,
    name: "Nível 3",
    rows: 7,
    cols: 7,
    timeLimitSec: 40,
    targetSymbols: ["○"],
    targetCount: 10,
    distractorSymbols: ["◯", "◉", "●", "◌", "◎"],
  },
  {
    id: 4,
    name: "Nível 4",
    rows: 8,
    cols: 8,
    timeLimitSec: 35,
    targetSymbols: ["△", "▲"],
    targetCount: 14,
    distractorSymbols: ["▽", "▼", "◮", "◭", "▵", "▴"],
  },
];
