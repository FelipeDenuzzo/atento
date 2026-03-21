"use client";

import type { AttentionContainerProps } from "../types";
import { StroopInvertido } from "@/games/stroop-invertido/StroopInvertido";

export type SustainedAttentionMobileContainerProps = AttentionContainerProps & {
  variant?: "stroop";
};

export function SustainedAttentionMobileContainer({
  mode,
  reportContext,
  onComplete,
  variant = "stroop",
}: SustainedAttentionMobileContainerProps) {
  // Versão inicial: reutiliza StroopInvertido até existir um componente mobile dedicado.
  // Mesmo padrão: não inventar props, usar apenas as aceitas pelo componente.

  return (
    <StroopInvertido
      onEnd={(result) => {
        onComplete?.({
          success: true,
          pointsEarned: 0,
          ...result,
        });
      }}
    />
  );
}
