"use client";

import type { AttentionContainerProps } from "../types";
import { EscutaSeletivaCocktailPartyMobileGame } from "@/games/escutaseletiva/mobile/EscutaSeletivaCocktailPartyMobileGame";

export type SelectiveAttentionMobileContainerProps = AttentionContainerProps & {
  variant?: "simples" | "cocktail-party";
};

export function SelectiveAttentionMobileContainer({
  mode,
  reportContext,
  onComplete,
  variant = "simples",
}: SelectiveAttentionMobileContainerProps) {
  return (
    <EscutaSeletivaCocktailPartyMobileGame />
  );
}
