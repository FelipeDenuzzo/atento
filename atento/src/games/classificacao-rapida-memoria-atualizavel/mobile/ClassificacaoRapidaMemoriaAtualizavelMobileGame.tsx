"use client";

import { ClassificacaoRapidaMemoriaAtualizavelGame } from "../ClassificacaoRapidaMemoriaAtualizavelGame";
import type { ReportContext } from "@/components/mobile/MobileAttentionTrainingGame";

type Props = {
  basePoints: number;
  startingLevel: number;
  maxLevelHint: number;
  reportContext?: ReportContext;
  onComplete: (result: { success: boolean; pointsEarned: number }) => void;
};

// Componente mobile: pode ser customizado para UI/UX touch-friendly no futuro
export function ClassificacaoRapidaMemoriaAtualizavelMobileGame(props: Props) {
  // Aqui pode-se adicionar hooks ou wrappers específicos para mobile (ex: scroll, feedback tátil, etc)
  return <ClassificacaoRapidaMemoriaAtualizavelGame {...props} />;
}
