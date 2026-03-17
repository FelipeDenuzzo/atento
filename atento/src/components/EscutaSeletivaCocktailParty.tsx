// Componente principal do treino Escuta Seletiva (Cocktail Party)
export function EscutaSeletivaCocktailParty() {
  // Implementação placeholder para evitar erro de build
  return <div>Treino Escuta Seletiva (Cocktail Party)</div>;
}
import React, { useState } from "react";

// Tipos auxiliares
export type VozAlvo = "masculina" | "feminina";

export interface Trial {
  targetVoice: VozAlvo;
  mascNumbers: number[];
  femNumbers: number[];
  sequence: { voice: VozAlvo; digit: number }[];
  targetSequence: number[];
}
