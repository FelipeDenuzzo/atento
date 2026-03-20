import React from "react";

export function IntroStage({ onStart }: { onStart: () => void }) {
  return (
    <section>
      <h1>Bem-vindo ao Treino de Atenção</h1>
      <p>Prepare-se para iniciar sua sessão de exercícios.</p>
      <button onClick={onStart}>Começar</button>
    </section>
  );
}
