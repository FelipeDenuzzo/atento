import React from "react";

export function MenuStage({ onSelect }: { onSelect: (planId: string) => void }) {
  // Placeholder: menu de seleção de plano
  return (
    <section>
      <h2>Escolha um plano de treino</h2>
      {/* Aqui virá a lista de planos */}
      <button onClick={() => onSelect("misto")}>Ciclo misto</button>
    </section>
  );
}
