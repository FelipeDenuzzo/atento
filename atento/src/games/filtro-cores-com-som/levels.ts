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
  // Fase 1: alvo por forma
  {
    id: 1,
    name: "Nivel 1 (Forma)",
    durationMs: 20000,
    availableColors: ["red", "green", "blue", "yellow", "purple"],
    availableShapes: ["círculo", "quadrado", "triângulo"],
    targetMode: "shape",
    initialTarget: "círculo",
    targetChangeIntervalMs: 25000,
    spawnIntervalMs: 900,
    maxSimultaneousShapes: 6,
    fallSpeed: 60,
  },
  // Fase 2: alvo por cor
  {
    id: 2,
    name: "Nivel 2 (Cor)",
    durationMs: 30000,
    availableColors: ["red", "green", "blue", "yellow", "purple"],
    availableShapes: ["círculo", "quadrado", "triângulo"],
    targetMode: "color",
    initialTarget: "red",
    targetChangeIntervalMs: 15000,
    spawnIntervalMs: 750,
    maxSimultaneousShapes: 8,
    fallSpeed: 85,
  },
  // Fase 3: alvo por forma
  {
    id: 3,
    name: "Nivel 3 (Forma)",
    durationMs: 40000,
    availableColors: ["red", "green", "blue", "yellow", "purple"],
    availableShapes: ["círculo", "quadrado", "triângulo"],
    targetMode: "shape",
    initialTarget: "triângulo",
    targetChangeIntervalMs: 10000,
    spawnIntervalMs: 650,
    maxSimultaneousShapes: 10,
    fallSpeed: 110,
  },
  // Fase 4: alvo por cor
  {
    id: 4,
    name: "Nivel 4 (Cor)",
    durationMs: 60000,
    availableColors: ["red", "green", "blue", "yellow", "purple"],
    availableShapes: ["círculo", "quadrado", "triângulo"],
    targetMode: "color",
    initialTarget: "purple",
    targetChangeIntervalMs: 8000,
    spawnIntervalMs: 550,
    maxSimultaneousShapes: 12,
    fallSpeed: 130,
  },
  // Fase 5: alvo por cor E forma específica
  {
    id: 5,
    name: "Nivel 5 (Cor e Forma: Círculo Azul)",
    durationMs: 40000,
    availableColors: ["blue"],
    availableShapes: ["círculo"],
    targetMode: "shape-color",
    initialTarget: "círculo-azul",
    targetChangeIntervalMs: 40000,
    spawnIntervalMs: 600,
    maxSimultaneousShapes: 10,
    fallSpeed: 120,
  },
  // Fase 6: alvo por cor E forma específica
  {
    id: 6,
    name: "Nivel 6 (Cor e Forma: Quadrado Vermelho)",
    durationMs: 40000,
    availableColors: ["red"],
    availableShapes: ["quadrado"],
    targetMode: "shape-color",
    initialTarget: "quadrado-vermelho",
    targetChangeIntervalMs: 40000,
    spawnIntervalMs: 600,
    maxSimultaneousShapes: 10,
    fallSpeed: 120,
  },
];
