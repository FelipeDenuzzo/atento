export type AttentionType =
  | "seletiva"
  | "sustentada"
  | "dividida"
  | "alternada";

export type ExerciseKind =
  | "quiz"
  | "visual-search"
  | "stroop"
  | "flanker"
  | "go-no-go"
  | "go-no-go-expandido"
  | "filtro-cores-com-som"
  | "counting-flow-task"
  | "long-mazes"
  | "symbol-map"
  | "symbol-matrix-search"
  | "find-missing-item"
  | "copy-matrices"
  | "long-word-search"
  | "radar-tone"
  | "drive-signs"
  | "drive-word-target"
  | "chat-error-vigilance"
  | "symbol-map-sound-monitor"
  | "rapid-classification-updatable-memory"
  | "color-shape-switch"
  | "top-bottom-position-rule-switch"
  | "reversal-go-nogo-switch"
  | "trilha-alternada-tmtb";

type BaseExercise = {
  id: string;
  title: string;
  attentionType: AttentionType;
  kind: ExerciseKind;
  instructions?: string;
  points: number;
};

export type QuizExercise = BaseExercise & {
  kind: "quiz";
  question: string;
  options: string[];
  correctOptionIndex: number;
};

export type VisualSearchExercise = BaseExercise & {
  kind: "visual-search";
  startingLevel: number;
  maxLevelHint: number;
};

export type StroopExercise = BaseExercise & {
  kind: "stroop";
  startingLevel: number;
  maxLevelHint: number;
};

export type FlankerExercise = BaseExercise & {
  kind: "flanker";
  startingLevel: number;
  maxLevelHint: number;
};


export type GoNoGoExpandidoExercise = BaseExercise & {
  kind: "go-no-go-expandido";
  startingLevel: number;
  maxLevelHint: number;
};

export type GoNoGoExercise = BaseExercise & {
  kind: "go-no-go";
  startingLevel: number;
  maxLevelHint: number;
};

export type FiltroCoresComSomExercise = BaseExercise & {
  kind: "filtro-cores-com-som";
  startingLevel: number;
  maxLevelHint: number;
};

export type CountingFlowTaskExercise = BaseExercise & {
  kind: "counting-flow-task";
  startingLevel: number;
  maxLevelHint: number;
};

export type LongMazesExercise = BaseExercise & {
  kind: "long-mazes";
  startingLevel: number;
  maxLevelHint: number;
};

export type SymbolMapExercise = BaseExercise & {
  kind: "symbol-map";
  startingLevel: number;
  maxLevelHint: number;
};

export type SymbolMatrixSearchExercise = BaseExercise & {
  kind: "symbol-matrix-search";
  startingLevel: number;
  maxLevelHint: number;
};

export type FindMissingItemExercise = BaseExercise & {
  kind: "find-missing-item";
  startingLevel: number;
  maxLevelHint: number;
};

export type CopyMatricesExercise = BaseExercise & {
  kind: "copy-matrices";
  startingLevel: number;
  maxLevelHint: number;
};

export type LongWordSearchExercise = BaseExercise & {
  kind: "long-word-search";
  startingLevel: number;
  maxLevelHint: number;
};

export type RadarToneExercise = BaseExercise & {
  kind: "radar-tone";
  startingLevel: number;
  maxLevelHint: number;
};

export type DriveSignsExercise = BaseExercise & {
  kind: "drive-signs";
  startingLevel: number;
  maxLevelHint: number;
};

export type DriveWordTargetExercise = BaseExercise & {
  kind: "drive-word-target";
  startingLevel: number;
  maxLevelHint: number;
};

export type ChatErrorVigilanceExercise = BaseExercise & {
  kind: "chat-error-vigilance";
  startingLevel: number;
  maxLevelHint: number;
};

export type SymbolMapSoundMonitorExercise = BaseExercise & {
  kind: "symbol-map-sound-monitor";
  startingLevel: number;
  maxLevelHint: number;
};

export type RapidClassificationUpdatableMemoryExercise = BaseExercise & {
  kind: "rapid-classification-updatable-memory";
  startingLevel: number;
  maxLevelHint: number;
};

export type ColorShapeSwitchExercise = BaseExercise & {
  kind: "color-shape-switch";
  startingLevel: number;
  maxLevelHint: number;
};

export type TopBottomPositionRuleSwitchExercise = BaseExercise & {
  kind: "top-bottom-position-rule-switch";
  startingLevel: number;
  maxLevelHint: number;
};

export type ReversalGoNoGoSwitchExercise = BaseExercise & {
  kind: "reversal-go-nogo-switch";
  startingLevel: number;
  maxLevelHint: number;
};

export type TrilhaAlternadaTmtbExercise = BaseExercise & {
  kind: "trilha-alternada-tmtb";
  startingLevel: number;
  maxLevelHint: number;
};

export type AttentionExercise =
  | QuizExercise
  | VisualSearchExercise
  | StroopExercise
  | FlankerExercise
  | GoNoGoExercise
  | GoNoGoExpandidoExercise
  | FiltroCoresComSomExercise
  | CountingFlowTaskExercise
  | LongMazesExercise
  | SymbolMapExercise
  | SymbolMatrixSearchExercise
  | FindMissingItemExercise
  | CopyMatricesExercise
  | LongWordSearchExercise
  | RadarToneExercise
  | DriveSignsExercise
  | DriveWordTargetExercise
  | ChatErrorVigilanceExercise
  | SymbolMapSoundMonitorExercise
  | RapidClassificationUpdatableMemoryExercise
  | ColorShapeSwitchExercise
  | TopBottomPositionRuleSwitchExercise
  | ReversalGoNoGoSwitchExercise
  | TrilhaAlternadaTmtbExercise;

export type TrainingPlan = {
  id: string;
  name: string;
  description: string;
  exercises: AttentionExercise[];
};
