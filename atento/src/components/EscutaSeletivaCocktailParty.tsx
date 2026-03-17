import React, { useState } from "react";

interface EscutaSeletivaCocktailPartyProps {
  onComplete?: (report: any) => void;
  mobile?: boolean;
}

// Estrutura dos dados de cada rodada
interface Trial {
  targetVoice: "masc" | "femi";
  mascNumbers: number[];
  femiNumbers: number[];
  sequence: { digit: number; voice: "masc" | "femi" }[];
  targetSequence: number[];
}

function gerarTrial(): Trial {
  const targetVoice = Math.random() < 0.5 ? "masc" : "femi";
  const mascNumbers = Array.from({ length: 3 }, () => Math.floor(Math.random() * 10));
  const femiNumbers = Array.from({ length: 3 }, () => Math.floor(Math.random() * 10));
  // Alterna as vozes: masc, femi, masc, femi, masc, femi
  const sequence = Array.from({ length: 6 }, (_, i) => {
    const voice = i % 2 === 0 ? "masc" : "femi";
    return {
      digit: voice === "masc" ? mascNumbers[Math.floor(i / 2)] : femiNumbers[Math.floor(i / 2)],
      voice,
    };
  });
  const targetSequence = targetVoice === "masc" ? mascNumbers : femiNumbers;
  return { targetVoice, mascNumbers, femiNumbers, sequence, targetSequence };
}

export const EscutaSeletivaCocktailParty: React.FC<EscutaSeletivaCocktailPartyProps> = ({ onComplete, mobile }) => {
  const [step, setStep] = useState<"instrucoes" | "teste-audio" | "rodada" | "resposta" | "feedback" | "finalizado">("instrucoes");
  const [trial, setTrial] = useState<Trial | null>(null);
  const [userInput, setUserInput] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [report, setReport] = useState<any[]>([]);

  // Placeholder para tocar áudio (substituir por lógica real)
  function playAudio(sequence: { digit: number; voice: "masc" | "femi" }[], cb: () => void) {
    // Aqui você implementaria a lógica de tocar os arquivos de áudio corretos
    // e chamar cb() ao final. Por enquanto, simula com timeout.
    setTimeout(cb, 2000 + sequence.length * 500);
  }

  function iniciarRodada() {
    const t = gerarTrial();
    setTrial(t);
    setStep("rodada");
    playAudio(t.sequence, () => setStep("resposta"));
  }

  function handleResponder() {
    if (!trial) return;
    const resposta = userInput.split("").map(Number).filter(n => !isNaN(n));
    const correta = resposta.length === 3 && resposta.every((n, i) => n === trial.targetSequence[i]);
    setFeedback(correta ? "Acertou!" : `Errou. Resposta correta: ${trial.targetSequence.join("")}`);
    setReport(r => [...r, {
      trial,
      resposta,
      correta,
      tempo: 0 // TODO: medir tempo
    }]);
    setStep("feedback");
  }

  function proximaRodada() {
    setUserInput("");
    setFeedback(null);
    iniciarRodada();
  }

  function finalizar() {
    setStep("finalizado");
    if (onComplete) onComplete(report);
  }

  // Responsividade: layout simples para mobile/desktop
  const containerClass = mobile ? "p-2 text-base" : "p-8 text-lg";

  return (
    <div className={containerClass}>
      {step === "instrucoes" && (
        <div>
          <h2 className="font-bold mb-2">Escuta Seletiva (Cocktail Party)</h2>
          <p className="mb-4">
            Neste treino, você ouvirá uma sequência de 6 números, alternando entre uma voz masculina e uma feminina. Sua tarefa é prestar atenção apenas na voz-alvo indicada (masculina ou feminina) e, ao final, digitar os 3 números falados por essa voz, ignorando os números da outra voz.<br />
            A voz-alvo será informada antes de cada rodada. Recomenda-se o uso de fones de ouvido.
          </p>
          <button className="btn btn-primary" onClick={() => setStep("teste-audio")}>Testar áudio</button>
        </div>
      )}
      {step === "teste-audio" && (
        <div>
          <p className="mb-2">Clique para ouvir um exemplo de áudio:</p>
          <button className="btn btn-secondary mb-4" onClick={() => alert("Áudio de teste!")}>Tocar áudio de teste</button>
          <br />
          <button className="btn btn-primary" onClick={iniciarRodada}>Iniciar treino</button>
        </div>
      )}
      {step === "rodada" && trial && (
        <div>
          <p className="mb-2">Voz-alvo: <b>{trial.targetVoice === "masc" ? "Masculina" : "Feminina"}</b></p>
          <p className="mb-2">Aguarde, ouvindo a sequência...</p>
          {/* Aqui pode ter uma animação de "tocando" */}
        </div>
      )}
      {step === "resposta" && trial && (
        <div>
          <p className="mb-2">Digite os 3 números falados pela voz-alvo ({trial.targetVoice === "masc" ? "Masculina" : "Feminina"}):</p>
          <input
            className="input input-bordered mb-2"
            type="text"
            maxLength={3}
            value={userInput}
            onChange={e => setUserInput(e.target.value.replace(/[^0-9]/g, ""))}
            autoFocus
          />
          <br />
          <button className="btn btn-primary" onClick={handleResponder} disabled={userInput.length !== 3}>Responder</button>
        </div>
      )}
      {step === "feedback" && (
        <div>
          <p className="mb-2">{feedback}</p>
          <button className="btn btn-secondary mr-2" onClick={proximaRodada}>Próxima rodada</button>
          <button className="btn btn-outline" onClick={finalizar}>Finalizar treino</button>
        </div>
      )}
      {step === "finalizado" && (
        <div>
          <h3 className="font-bold mb-2">Relatório do treino</h3>
          <pre className="bg-zinc-100 p-2 rounded text-xs overflow-x-auto max-h-64">{JSON.stringify(report, null, 2)}</pre>
          <button className="btn btn-primary mt-4" onClick={() => window.location.reload()}>Reiniciar</button>
        </div>
      )}
    </div>
  );
};
