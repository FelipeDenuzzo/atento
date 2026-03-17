import React, { useState } from "react";

// Tipos auxiliares
export type VozAlvo = "masculina" | "feminina";

export interface Trial {
  targetVoice: VozAlvo;
  mascNumbers: number[];
  femNumbers: number[];
      const averageDigitsCorrectPercent =
        phaseMetrics.length > 0
          ? Math.round(
              phaseMetrics.reduce(
                (sum, metric) => sum + metric.averageDigitsCorrectPercent,
                0,
              ) / phaseMetrics.length,
            )
          : 0;

      const phaseTrials = trialHistory.filter(
        (trial) => trial.phase === phase,
      );

      return {
        phase,
        totalTrials,
        correctCount,
        errorCount,
        responseAvg,
        averageDigitsCorrectPercent,
        errorTrend: getErrorTrendLabel(phaseTrials),
      };
    });
  }, [allLevelMetrics, trialHistory]);

  return (
    <div className="mt-4 space-y-4">
      {/* Janela única de explicação e instrução antes do treino */}
      {status === "instructions" && currentTrial && currentTrialIndex === 0 && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-zinc-50 p-6">
          <div>
            <h2 className="text-lg font-bold mb-2">Como funciona o treino?</h2>
            <p className="mb-2">
              Neste treino, você ouvirá uma sequência de <b>6 números</b>, alternando entre uma voz masculina e uma feminina. Sua tarefa é prestar atenção <b>apenas na voz-alvo indicada</b> (masculina ou feminina) e, ao final, digitar os <b>3 números</b> falados por essa voz, ignorando os números da outra voz.
            </p>
            <ul className="list-disc pl-5 text-sm text-zinc-700 mb-2">
              <li>A cada rodada, a voz-alvo será informada antes do início.</li>
              <li>Os números são apresentados um de cada vez, alternando as vozes.</li>
              <li>Digite apenas os números da voz-alvo, na ordem em que foram falados.</li>
            </ul>
            <p className="text-sm text-zinc-600">Use fones de ouvido para melhor desempenho.</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <button
              type="button"
              onClick={playAudioTest}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-800"
            >
              Testar áudio agora
            </button>
            {audioTestError && (
              <span className="text-sm text-amber-700">{audioTestError}</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setStatus("ready")}
            className="h-11 w-full rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
          >
            Iniciar treino
          </button>

          {audioError && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              {audioError}
            </p>
          )}
        </div>
      )}

      {status === "listening" && currentTrial && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-zinc-50 p-6">
          <p className="text-center text-sm text-zinc-600">
            Reproduzindo áudio...
          </p>
          <p
            className="text-center font-extrabold text-zinc-900 tracking-wide"
            style={{ textTransform: "uppercase" }}
          >
            {currentTrial.instruction}
          </p>
          <p className="text-center text-xs text-zinc-500">
            Aguarde o fim da reprodução para digitar a sequência.
          </p>
        </div>
      )}

      {status === "countdown" && currentTrial && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-zinc-50 p-6">
          <p className="text-center text-sm text-zinc-600">Prepare-se</p>
          <p
            className="text-center font-extrabold text-zinc-900 tracking-wide"
            style={{ textTransform: "uppercase" }}
          >
            {currentTrial.instruction}
          </p>
          <p className="text-center text-5xl font-semibold text-zinc-900">
            {countdown}
          </p>
        </div>
      )}

      {status === "answering" && currentTrial && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-zinc-50 p-6">
          <p className="font-semibold text-zinc-900">
            Digite a sequência do canal-alvo
          </p>
          <p
            className="text-sm font-extrabold text-zinc-900 tracking-wide"
            style={{ textTransform: "uppercase" }}
          >
            {currentTrial.instruction}
          </p>

          <input
            ref={answerInputRef}
            autoFocus
            value={answerInput}
            onChange={(event) =>
              setAnswerInput(event.target.value.replace(/\D/g, ""))
            }
            placeholder="Ex.: 274"
            className="w-full rounded-lg border border-black/20 bg-white px-4 py-3 text-lg tracking-[0.2em] text-zinc-900 outline-none focus:border-zinc-700"
          />

          <button
            type="button"
            onClick={confirmAnswer}
            className="h-11 w-full rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
          >
            Confirmar resposta
          </button>
        </div>
      )}

      {status === "feedback" && currentTrial && (
        <div className="space-y-3 rounded-lg border border-black/10 bg-zinc-50 p-6">
          <p
            className={`text-center font-semibold ${
              feedback === "correct" ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {feedback === "correct" ? "✓ Acertou" : "✗ Errou"}
          </p>
          <p className="text-center text-sm text-zinc-700">
            Sequência correta:{" "}
            <strong>{currentTrial.targetSequence.join("")}</strong>
          </p>
          <p className="text-center text-sm text-zinc-700">
            Sua resposta: <strong>{answerInput || "(vazio)"}</strong>
          </p>

          <button
            type="button"
            onClick={goToNextStep}
            className="mt-2 h-11 w-full rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
          >
            Ir para a próxima
          </button>
        </div>
      )}

      {status === "completed" && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-zinc-50 p-6">
          <h3 className="text-xl font-semibold text-zinc-900">
            Jogo concluído!
          </h3>

          <div className="space-y-3">
            {allLevelMetrics.map((metric, index) => (
              <div
                key={index}
                className="rounded-lg border border-black/10 bg-white p-3"
              >
                <p className="text-sm font-medium text-zinc-900">
                  Nível {index + 1} • Fase {metric.phase}
                </p>
                <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-zinc-600">
                  <p>Pontuação: {metric.score}</p>
                  <p>Acurácia: {Math.round(metric.accuracy * 100)}%</p>
                  <p>Acertos: {metric.correctCount}</p>
                  <p>Erros: {metric.errorCount}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border-2 border-zinc-900 bg-white p-4">
            <p className="font-semibold text-zinc-900">Resumo por fase</p>
            <div className="mt-2 grid gap-2 text-sm">
              {summaryByPhase.map((phaseSummary) => (
                <p key={phaseSummary.phase}>
                  Fase {phaseSummary.phase}: {phaseSummary.totalTrials}{" "}
                  tentativas, {phaseSummary.correctCount} acertos,{" "}
                  {phaseSummary.errorCount} erros, tempo médio{" "}
                  {phaseSummary.responseAvg}ms, dígitos corretos médios{" "}
                  {phaseSummary.averageDigitsCorrectPercent}%,{" "}
                  {phaseSummary.errorTrend}
                </p>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={downloadResults}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              Baixar Resultados
            </button>
            <button
              type="button"
              onClick={finishExercise}
              className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
            >
              Continuar
            </button>
          </div>

          <p className="text-xs text-zinc-500">
            Meta sugerida de desempenho:{" "}
            {Math.round(MIN_ACCURACY_TARGET * 100)}% de acerto.
          </p>
        </div>
      )}
    </div>
  );
}
