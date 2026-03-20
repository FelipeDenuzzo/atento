import { TrainingPlan } from "@/types/game";
import { trainingPlans, attentionTypeDescriptions, formatAttentionType } from "@/data/trainingPlans";

// Retorna o plano de treino pelo id
export function getTrainingPlanById(planId: string): TrainingPlan | undefined {
  return trainingPlans.find(plan => plan.id === planId);
}

// Retorna um exercício pelo id dentro de um plano
export function getExerciseById(plan: TrainingPlan, exerciseId: string) {
  return plan.exercises.find(ex => ex.id === exerciseId);
}

// Retorna o label do tipo de atenção
export function getAttentionTypeLabel(type: string): string {
  return formatAttentionType(type as any);
}

// Retorna a descrição do tipo de atenção
export function getAttentionTypeDescription(type: string): string {
  return attentionTypeDescriptions[type as keyof typeof attentionTypeDescriptions];
}

// Lista todos os exercícios de todos os planos
export function listAllExercises() {
  return trainingPlans.flatMap(plan => plan.exercises);
}

// Verifica se um exercício está habilitado via feature flag (pelo kind)
export function isFeatureEnabled(kind: string): boolean {
  // O controle real está em trainingPlans.ts, mas pode ser expandido aqui se necessário
  return listAllExercises().some(ex => ex.kind === kind);
}
