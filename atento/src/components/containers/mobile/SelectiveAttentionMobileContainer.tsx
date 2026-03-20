"use client";

import type { AttentionContainerProps } from "../types";
import { EscutaSeletivaCocktailPartyMobileGame } from "@/games/escuta-seletiva-cocktail-party/mobile/EscutaSeletivaCocktailPartyMobileGame";

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
