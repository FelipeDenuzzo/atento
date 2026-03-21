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
      onEnd={(result) => {
        // adapte aqui se necessário para o container
        onComplete?.({
          success: true,
          pointsEarned: 0,
          ...result,
        });
      }}
    />
  );
}
