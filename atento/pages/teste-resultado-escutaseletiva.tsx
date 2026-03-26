import React from "react";
import { EscutaSeletivaCocktailPartyDesktopGame } from "../src/games/escuta-seletiva-cocktail-party/EscutaSeletivaCocktailPartyDesktopGame";

export default function TesteResultadoEscutaSeletiva() {
  // Simula um resultado de teste
  const fakeResults = [
    {
      trial: 1,
      targetVoice: "male",
      targetSequence: [1, 2, 3],
      distractorSequence: [4, 5, 6],
      fullSequence: [
        { digit: 1, voice: "male" },
        { digit: 4, voice: "female" },
        { digit: 2, voice: "male" },
        { digit: 5, voice: "female" },
        { digit: 3, voice: "male" },
        { digit: 6, voice: "female" },
      ],
      userAnswer: [1, 2, 3],
      correct: true,
      responseTimeMs: 2500,
    },
    {
      trial: 2,
      targetVoice: "female",
      targetSequence: [7, 8, 9],
      distractorSequence: [0, 1, 2],
      fullSequence: [
        { digit: 7, voice: "female" },
        { digit: 0, voice: "male" },
        { digit: 8, voice: "female" },
        { digit: 1, voice: "male" },
        { digit: 9, voice: "female" },
        { digit: 2, voice: "male" },
      ],
      userAnswer: [7, 8, 0],
      correct: false,
      responseTimeMs: 3200,
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#111", color: "#fff", padding: 32 }}>
      <h1>Resultado Simulado - Escuta Seletiva</h1>
      <div style={{ marginTop: 32 }}>
        <pre>{JSON.stringify(fakeResults, null, 2)}</pre>
      </div>
    </div>
  );
}
