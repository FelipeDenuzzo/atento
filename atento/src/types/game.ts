export type AttentionType =
  | "seletiva"
  | "sustentada"
  | "dividida"
  | "alternada";

export type ExerciseKind = "quiz" | "visual-search";

type BaseExercise = {
  id: string;
  title: string;
  attentionType: AttentionType;
  kind: ExerciseKind;
  instructions: string;
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

export type AttentionExercise = QuizExercise | VisualSearchExercise;

export type TrainingPlan = {
  id: string;
  name: string;
  description: string;
  exercises: AttentionExercise[];
};