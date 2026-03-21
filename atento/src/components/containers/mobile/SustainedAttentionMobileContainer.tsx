"use client";

import type { AttentionContainerProps } from "../types";
import { StroopInvertido } from "@/games/stroop-invertido/StroopInvertido";

export type SustainedAttentionMobileContainerProps = AttentionContainerProps & {
  variant?: "stroop";
};

export function SustainedAttentionMobileContainer(
  { onComplete, reportContext }: SustainedAttentionMobileContainerProps
): JSX.Element {
  return (
    <StroopInvertido
      basePoints={0}
      startingLevel={0}
      maxLevelHint={0}
      onComplete={(result) => {
        const { correct, totalTrials, accuracy } = result;

        const success = accuracy >= 0.5; // mesmo critério do desktop
        const pointsEarned = correct;    // mesma lógica de pontos

        onComplete({
          success,
          pointsEarned,
        });
      }}
      // se tiver outras props específicas do mobile, mantenha
    />
  );
}
