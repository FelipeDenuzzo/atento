"use client";

import type { ReactNode } from "react";
import { StroopInvertido } from "./StroopInvertido";

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

export function AttentionTrainingGame() {
  return (
    <main className="p-8">
      <p>AttentionTrainingGame mínimo só para compilar.</p>
    </main>
  );
}
