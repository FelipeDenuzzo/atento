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

function gerarTrial(): Trial {
  const targetVoice: VozAlvo = Math.random() < 0.5 ? "masculina" : "feminina";
  const mascNumbers = Array.from({ length: 3 }, () => Math.floor(Math.random() * 10));
  const femNumbers = Array.from({ length: 3 }, () => Math.floor(Math.random() * 10));
  const sequence: { voice: VozAlvo; digit: number }[] = [];
  for (let i = 0; i < 3; i++) {
    sequence.push({ voice: "masculina", digit: mascNumbers[i] });
    sequence.push({ voice: "feminina", digit: femNumbers[i] });
  }
  const targetSequence = sequence
    .filter((item) => item.voice === targetVoice)
    .map((item) => item.digit);
  return { targetVoice, mascNumbers, femNumbers, sequence, targetSequence };
}

export function EscutaSeletivaCocktailParty() {
  const [step, setStep] = useState<"intro" | "trial" | "feedback" | "result">("intro");
  const [trial, setTrial] = useState<Trial | null>(null);
  const [userInput, setUserInput] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  function iniciarTrial() {
    const novoTrial = gerarTrial();
    setTrial(novoTrial);
    setUserInput("");
    setFeedback(null);
    setStep("trial");
  }

  function checarResposta() {
    if (!trial) return;
    const resposta = userInput.split("").map(Number);
    const correta =
      resposta.length === 3 &&
      resposta.every((num, idx) => num === trial.targetSequence[idx]);
    setFeedback(correta ? "Acertou!" : "Errou.");
    setHistory([
      ...history,
      {
        trial,
        resposta: userInput,
        correta,
        data: new Date().toISOString(),
      },
    ]);
    setStep("feedback");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-900 text-white p-4">
      {step === "intro" && (
        <div className="max-w-md text-center">
          <h2 className="text-lg font-bold mb-2">Treino: Escuta Seletiva (Cocktail Party)</h2>
          <p className="mb-4">
            Neste treino, você ouvirá uma sequência de 6 números, alternando entre uma voz masculina e uma feminina. Sua tarefa é prestar atenção apenas na voz-alvo indicada (masculina ou feminina) e, ao final, digitar os 3 números falados por essa voz, ignorando os números da outra voz.<br />
            <b>A voz-alvo será informada antes de cada rodada.</b> Recomenda-se o uso de fones de ouvido.
          </p>
          <button className="bg-blue-600 px-4 py-2 rounded" onClick={iniciarTrial}>
            Iniciar
          </button>
        </div>
      )}
      {step === "trial" && trial && (
        <div className="max-w-md text-center">
          <div className="mb-2 font-semibold">
            Voz-alvo: <span className="uppercase">{trial.targetVoice}</span>
          </div>
          <div className="mb-4">(Aqui será reproduzida a sequência de áudio)</div>
          <input
            className="text-black px-2 py-1 rounded"
            type="text"
            maxLength={3}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="Digite os 3 números da voz-alvo"
            autoFocus
          />
          <button
            className="ml-2 bg-green-600 px-3 py-1 rounded"
            onClick={checarResposta}
            disabled={userInput.length !== 3}
          >
            Enviar
          </button>
        </div>
      )}
      {step === "feedback" && feedback && trial && (
        <div className="max-w-md text-center">
          <div className="mb-2 font-semibold">{feedback}</div>
          <div className="mb-2">
            Números corretos: <b>{trial.targetSequence.join(" ")}</b>
          </div>
          <button className="bg-blue-600 px-4 py-2 rounded" onClick={iniciarTrial}>
            Próxima rodada
          </button>
          <button
            className="ml-2 bg-gray-600 px-4 py-2 rounded"
            onClick={() => setStep("result")}
          >
            Finalizar treino
          </button>
        </div>
      )}
      {step === "result" && (
        <div className="max-w-md text-center">
          <h3 className="text-lg font-bold mb-2">Relatório do Treino</h3>
          <ul className="mb-4 text-left">
            {history.map((h, idx) => (
              <li key={idx} className="mb-1">
                <b>Voz-alvo:</b> {h.trial.targetVoice} | <b>Correta:</b> {h.trial.targetSequence.join(" ")} | <b>Resposta:</b> {h.resposta} | <b>{h.correta ? "✔️" : "❌"}</b>
              </li>
            ))}
          </ul>
          <button className="bg-blue-600 px-4 py-2 rounded" onClick={() => setStep("intro")}>Reiniciar</button>
        </div>
      )}
    </div>
  );
}
