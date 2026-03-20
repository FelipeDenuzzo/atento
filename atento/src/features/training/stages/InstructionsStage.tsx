import React from "react";

export function InstructionsStage({ instructions, onContinue }: { instructions: string; onContinue: () => void }) {
  return (
    <section>
      <h2>Instruções</h2>
      <p>{instructions}</p>
      <button onClick={onContinue}>Continuar</button>
    </section>
  );
}
