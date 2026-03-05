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
  | "cocktail-party"
  | "go-no-go"
  | "go-no-go-expandido"
  | "filtro-cores-com-som"
  | "counting-flow-task"
  | "long-mazes"
  | "symbol-map"
  | "symbol-matrix-search"
  | "find-missing-item";

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

export type CocktailPartyExercise = BaseExercise & {
  kind: "cocktail-party";
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

export type AttentionExercise =
  | QuizExercise
  | VisualSearchExercise
  | StroopExercise
  | FlankerExercise
  | CocktailPartyExercise
  | GoNoGoExercise
  | GoNoGoExpandidoExercise
  | FiltroCoresComSomExercise
  | CountingFlowTaskExercise
  | LongMazesExercise
  | SymbolMapExercise
  | SymbolMatrixSearchExercise
  | FindMissingItemExercise;

export type TrainingPlan = {
  id: string;
  name: string;
  description: string;
  exercises: AttentionExercise[];
};
