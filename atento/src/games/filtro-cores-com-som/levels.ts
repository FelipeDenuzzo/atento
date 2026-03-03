import { ColorId, LevelConfig } from "./types";

export const COLOR_LABEL: Record<ColorId, string> = {
  red: "Vermelho",
  green: "Verde",
  blue: "Azul",
  yellow: "Amarelo",
  purple: "Roxo",
};

export const COLOR_HEX: Record<ColorId, string> = {
  red: "#ef4444",
  green: "#22c55e",
  blue: "#3b82f6",
  yellow: "#facc15",
  purple: "#a855f7",
};

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: "Nivel 1",
    durationMs: 20000,
    availableColors: ["red", "green"],
    initialTargetColor: "green",
    colorChangeIntervalMs: 25000,
    spawnIntervalMs: 900,
    maxSimultaneousShapes: 6,
    fallSpeed: 60,
  },
  {
    id: 2,
    name: "Nivel 2",
    durationMs: 30000,
    availableColors: ["red", "green", "blue"],
    initialTargetColor: "red",
    colorChangeIntervalMs: 15000,
    spawnIntervalMs: 750,
    maxSimultaneousShapes: 8,
    fallSpeed: 85,
  },
  {
    id: 3,
    name: "Nivel 3",
    durationMs: 40000,
    availableColors: ["red", "green", "blue", "yellow"],
    initialTargetColor: "blue",
    colorChangeIntervalMs: 10000,
    spawnIntervalMs: 650,
    maxSimultaneousShapes: 10,
    fallSpeed: 110,
  },
  {
    id: 4,
    name: "Nivel 4",
    durationMs: 60000,
    availableColors: ["red", "green", "blue", "yellow", "purple"],
    initialTargetColor: "yellow",
    colorChangeIntervalMs: 8000,
    spawnIntervalMs: 550,
    maxSimultaneousShapes: 12,
    fallSpeed: 130,
  },
];
