"use client";

import type { AttentionContainerProps } from "./types";
import { StroopInvertido } from "@/games/stroop-invertido/StroopInvertido";

export type SustainedAttentionContainerProps = AttentionContainerProps & {
  variant?: "stroop";
};

export function SustainedAttentionContainer(
  { onComplete }: SustainedAttentionContainerProps
): JSX.Element {
  return (
    <StroopInvertido
      basePoints={0}
      startingLevel={0}
      maxLevelHint={0}
      onComplete={(result) => {
        const { correct, totalTrials, accuracy } = result;

        // critério simples de sucesso (ajuste se tiver regra específica)
        const success = accuracy >= 0.5;

        // pontuação baseada em acertos; ajuste se quiser outra fórmula
        const pointsEarned = correct;

        onComplete({
          success,
          pointsEarned,
        });
      }}
    />
  );
}
