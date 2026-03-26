import { SymbolMapLevelConfig } from "./types";

// Lista de imagens disponíveis
const symbolImages = Array.from({ length: 28 }, (_, i) => `${18 + i}.png`);

function getRandomSymbols(count: number, exclude: string[] = []): string[] {
  const pool = symbolImages.filter((img) => !exclude.includes(img));
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export const defaultSymbolMapLevels = (): SymbolMapLevelConfig[] => [
  {
    id: 1,
    name: "Nível 1",
    rows: 5,
    cols: 5,
    timeLimitSec: 50,
    targetSymbols: getRandomSymbols(1),
    targetCount: 6,
    distractorSymbols: getRandomSymbols(5, []),
  },
  {
    id: 2,
    name: "Nível 2",
    rows: 6,
    cols: 6,
    timeLimitSec: 45,
    targetSymbols: getRandomSymbols(1),
    targetCount: 8,
    distractorSymbols: getRandomSymbols(5, []),
  },
  {
    id: 3,
    name: "Nível 3",
    rows: 7,
    cols: 7,
    timeLimitSec: 40,
    targetSymbols: getRandomSymbols(1),
    targetCount: 10,
    distractorSymbols: getRandomSymbols(5, []),
  },
  {
    id: 4,
    name: "Nível 4",
    rows: 8,
    cols: 8,
    timeLimitSec: 35,
    targetSymbols: getRandomSymbols(2),
    targetCount: 14,
    distractorSymbols: getRandomSymbols(6, []),
  },
];
