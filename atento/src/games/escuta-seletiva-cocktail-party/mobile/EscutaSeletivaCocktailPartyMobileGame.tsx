"use client";

import type { ReportContext } from "@/components/mobile/MobileAttentionTrainingGame";

type Props = {
  onBack?: () => void;
  onComplete?: (report?: ReportContext) => void;
};

export function EscutaSeletivaCocktailPartyMobileGame(_: Props) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <p className="text-sm text-zinc-700">
        Este treino foi removido temporariamente da versão mobile.
      </p>
    </div>
  );
}
