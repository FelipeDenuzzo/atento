"use client";

import { SelectiveAttentionContainer } from "./containers/SelectiveAttentionContainer";
import { SustainedAttentionContainer } from "./containers/SustainedAttentionContainer";
import { AlternatingAttentionContainer } from "./containers/AlternatingAttentionContainer";
import { DividedAttentionContainer } from "./containers/DividedAttentionContainer";

type TrainingMode = "sequence" | "single";

export type ReportContext = {
  mode?: TrainingMode | string;
  scopeLabel?: string;
  attentionTypeLabel?: string;
  participantName?: string;
};

type Props = {
  mode: TrainingMode;
};

type ExerciseId = "stroop-invertido" | "escuta-seletiva" | "flanker" | "visual-search";

export function AttentionTrainingGame() {
  const stage: "intro" | "training" | "result" = "training";
  const activeExercises: ExerciseId[] = ["stroop-invertido"];
  const currentExerciseId = activeExercises[0];

  function renderCurrentExercise() {
    switch (currentExerciseId) {
      case "stroop-invertido":
        return (
          <SustainedAttentionContainer
            mode="single"
            onComplete={() => {}}
          />
        );
      case "escuta-seletiva":
        return (
          <SelectiveAttentionContainer
            mode="single"
            onComplete={() => {}}
          />
        );
      default:
        return null;
    }
  }

  return (
    <main className="p-8">
      {renderCurrentExercise()}
    </main>
  );
}
