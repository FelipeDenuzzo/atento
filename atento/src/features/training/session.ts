import { TrainingPlan } from "@/types/game";

export type SessionStage = "intro" | "training" | "result";

export interface TrainingSessionState {
  plan: TrainingPlan;
  activeExercises: string[]; // exercise ids
  currentExerciseIndex: number;
  stage: SessionStage;
  score: number;
  results: any[];
}

// Inicializa o estado da sessão
export function createInitialSessionState(plan: TrainingPlan): TrainingSessionState {
  return {
    plan,
    activeExercises: plan.exercises.map(ex => ex.id),
    currentExerciseIndex: 0,
    stage: "intro",
    score: 0,
    results: [],
  };
}

// Avança para o próximo exercício
export function goToNextExercise(state: TrainingSessionState): TrainingSessionState {
  const nextIndex = state.currentExerciseIndex + 1;
  if (nextIndex < state.activeExercises.length) {
    return { ...state, currentExerciseIndex: nextIndex };
  } else {
    return { ...state, stage: "result" };
  }
}

// Registra resultado e atualiza score
export function registerExerciseResult(state: TrainingSessionState, result: any, points: number): TrainingSessionState {
  return {
    ...state,
    results: [...state.results, result],
    score: state.score + points,
  };
}

// Reinicia a sessão
export function resetSession(state: TrainingSessionState): TrainingSessionState {
  return createInitialSessionState(state.plan);
}
