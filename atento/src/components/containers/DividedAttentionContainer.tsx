import React from "react";

export type DividedAttentionContainerProps = {
  mode: "sequence" | "single";
  reportContext?: import("@/components/AttentionTrainingGame").ReportContext;
  onComplete: (result: { success: boolean; pointsEarned: number }) => void;
};

export function DividedAttentionContainer(
  props: DividedAttentionContainerProps
): JSX.Element {
  return <div>Container de Atenção Dividida</div>;
}
