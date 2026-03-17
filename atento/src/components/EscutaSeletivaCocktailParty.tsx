import React, { useState } from "react";

// Tipos auxiliares
export type VozAlvo = "masculina" | "feminina";

export interface Trial {
  targetVoice: VozAlvo;
  mascNumbers: number[];
  femNumbers: number[];
  sequence: { voice: VozAlvo; digit: number }[];
  targetSequence: number[];
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
