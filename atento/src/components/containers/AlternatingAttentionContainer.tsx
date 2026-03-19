import React from "react";

export type AlternatingAttentionContainerProps = {
  mode: "sequence" | "single";
  reportContext?: import("@/components/AttentionTrainingGame").ReportContext;
  onComplete: (result: { success: boolean; pointsEarned: number }) => void;
};

export function AlternatingAttentionContainer(
  props: AlternatingAttentionContainerProps
): JSX.Element {
  return <div>Container de Atenção Alternada</div>;
}
