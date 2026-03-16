"use client";

import { GoNoGoExpandidoGame } from "../GoNoGoExpandidoGame";
import type { ReportContext } from "@/components/mobile/MobileAttentionTrainingGame";

type Props = {
  basePoints: number;
  startingLevel: number;
  maxLevelHint: number;
  reportContext?: ReportContext;
  onComplete: (result: { success: boolean; pointsEarned: number }) => void;
};

// Componente mobile: já utiliza o GoNoGoExpandidoGame, que agora está responsivo.
export function GoNoGoExpandidoMobileGame(props: Props) {
  return <GoNoGoExpandidoGame {...props} />;
}
