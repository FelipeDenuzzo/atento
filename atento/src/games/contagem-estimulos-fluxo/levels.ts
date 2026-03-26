import { CountingFlowLevelConfig } from "./types";

export const defaultCountingFlowLevels = (): CountingFlowLevelConfig[] => [
  {
    id: 1,
    name: "Nível 1 - Fácil",
    modality: "visual",
    totalStimuli: 15,
    stimulusDurationMs: 650,
    isiMs: 700,
    targetProbability: 0.25,
    targetVisual: { shape: "circle", color: "red" },
    distractorVisuals: [
      { shape: "circle", color: "blue" },
      { shape: "circle", color: "green" },
      { shape: "square", color: "blue" },
      { shape: "triangle", color: "green" },
    ],
  },
  {
    id: 2,
    name: "Nível 2 - Médio",
    modality: "visual",
    totalStimuli: 25,
    stimulusDurationMs: 550,
    isiMs: 450,
    targetProbability: 0.2,
    targetVisual: { shape: "circle", color: "red" },
    distractorVisuals: [
      { shape: "circle", color: "yellow" },
      { shape: "circle", color: "yellow" },
      { shape: "square", color: "red" },
      { shape: "triangle", color: "red" },
      { shape: "square", color: "yellow" },
    ],
  },
  {
    id: 3,
    name: "Nível 3 - Difícil",
    modality: "visual",
    totalStimuli: 50,
    stimulusDurationMs: 450,
    isiMs: 250,
    targetProbability: 0.15,
    targetVisual: { shape: "circle", color: "red" },
    distractorVisuals: [
      { shape: "circle", color: "yellow" },
      { shape: "square", color: "red" },
      { shape: "triangle", color: "red" },
      { shape: "square", color: "yellow" },
      { shape: "triangle", color: "yellow" },
    ],
  },
];
