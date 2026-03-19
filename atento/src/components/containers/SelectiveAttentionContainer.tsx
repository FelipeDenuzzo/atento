import React from "react";

export type SelectiveAttentionContainerProps = {
  mode: "sequence" | "single";
  reportContext?: import("@/components/AttentionTrainingGame").ReportContext;
  onComplete: (result: { success: boolean; pointsEarned: number }) => void;
};

export function SelectiveAttentionContainer(
  props: SelectiveAttentionContainerProps
): JSX.Element {
  return <div>Container de Atenção Seletiva</div>;
}
