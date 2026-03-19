import React from "react";

export type SustainedAttentionContainerProps = {
  mode: "sequence" | "single";
  reportContext?: import("@/components/AttentionTrainingGame").ReportContext;
  onComplete: (result: { success: boolean; pointsEarned: number }) => void;
};

export function SustainedAttentionContainer(
  props: SustainedAttentionContainerProps
): JSX.Element {
  return <div>Container de Atenção Sustentada</div>;
}
