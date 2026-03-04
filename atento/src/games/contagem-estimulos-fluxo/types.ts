export type CountingFlowModality = "visual" | "audio";

export type VisualShape = "circle" | "square" | "triangle";

export type VisualStimulus = {
  shape: VisualShape;
  color: "red" | "blue" | "green" | "yellow";
};

export type CountingFlowLevelConfig = {
  id: number;
  name: string;
  modality: CountingFlowModality;
  totalStimuli: number;
  stimulusDurationMs: number;
  isiMs: number;
  targetProbability: number;
  targetVisual: VisualStimulus;
  distractorVisuals: VisualStimulus[];
};

export type CountingFlowStimulus = {
  index: number;
  isTarget: boolean;
  modality: CountingFlowModality;
  visual?: VisualStimulus;
};

export type CountingFlowResult = {
  actualTargetCount: number;
  playerAnswer: number;
  absoluteError: number;
  estimationDirection: "exact" | "under" | "over";
};

export type CountingFlowSessionLog = {
  dateIso: string;
  levelId: number;
  levelName: string;
  config: {
    modality: CountingFlowModality;
    totalStimuli: number;
    stimulusDurationMs: number;
    isiMs: number;
    targetProbability: number;
  };
  result: CountingFlowResult;
};
