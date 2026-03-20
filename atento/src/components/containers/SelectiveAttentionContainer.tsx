"use client";

import type { AttentionContainerProps } from "./types";
import { EscutaSeletivaCocktailParty } from "@/games/escutaseletiva/EscutaSeletivaCocktailParty";

export type SelectiveAttentionContainerProps = AttentionContainerProps & {
  variant?: "simples" | "cocktail-party";
};

export function SelectiveAttentionContainer({
  mode,
  reportContext,
  onComplete,
  variant = "simples",
}: SelectiveAttentionContainerProps) {
  return (
    <EscutaSeletivaCocktailParty />
  );
}
