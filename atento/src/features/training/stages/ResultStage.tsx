import React from "react";

export function ResultStage({ score, onRestart }: { score: number; onRestart: () => void }) {
  return (
    <section>
      <h2>Resultados</h2>
      <p>Sua pontuação: {score}</p>
      <button onClick={onRestart}>Reiniciar</button>
    </section>
  );
}
