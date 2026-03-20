import type { ReportContext } from "@/components/AttentionTrainingGame";

export type AttentionContainerProps = {
  mode: "sequence" | "single";
  reportContext?: ReportContext;
  onComplete: (result: { success: boolean; pointsEarned: number }) => void;
};
