"use client";

import type { AttentionContainerProps } from "./types";
import { StroopInvertido } from "@/components/StroopInvertido";

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
        // adapta para o formato esperado pelo container
        onComplete({
          success: result.success ?? true,
          pointsEarned: result.pointsEarned ?? 0,
        });
      }}
    />
  );
}
