import React from "react";

interface ResultScreenProps {
  title: string;
  result?: any; // objeto de resultado do treino (opcional para retrocompatibilidade)
  onDownloadTxt: () => void;
  onContinue: () => void;
  continueLabel?: string;
  children?: React.ReactNode;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  title,
  result,
  onDownloadTxt,
  onContinue,
  continueLabel = "Próximo treino",
  children,
}) => (
  <div className="max-w-lg mx-auto p-6 bg-white rounded-xl shadow space-y-6 text-center">
    <h2 className="text-2xl font-bold text-zinc-900">{title}</h2>
    {/* Exibe métricas padrão se result for passado */}
    {result && (
      <div className="my-4 grid gap-3 sm:grid-cols-2">
        {result.finalScore !== undefined && (
          <div>
            <p className="text-xs text-zinc-500">Pontuação</p>
            <p className="font-semibold text-zinc-900">{result.finalScore.toFixed(1)}%</p>
          </div>
        )}
        {result.overallAccuracyPercent !== undefined && (
          <div>
            <p className="text-xs text-zinc-500">Acurácia</p>
            <p className="font-semibold text-zinc-900">{result.overallAccuracyPercent.toFixed(1)}%</p>
          </div>
        )}
        {result.totalTimeSeconds !== undefined && (
          <div>
            <p className="text-xs text-zinc-500">Tempo total</p>
            <p className="font-semibold text-zinc-900">{result.totalTimeSeconds.toFixed(2)} s</p>
          </div>
        )}
        {result.errorsTotal !== undefined && (
          <div>
            <p className="text-xs text-zinc-500">Erros totais</p>
            <p className="font-semibold text-zinc-900">{result.errorsTotal}</p>
          </div>
        )}
        {result.interpretation && (
          <div className="sm:col-span-2">
            <p className="text-xs text-zinc-500">Interpretação</p>
            <p className="font-semibold text-zinc-900">{result.interpretation}</p>
          </div>
        )}
        {/* ...adicione outras métricas padrão conforme necessário */}
      </div>
    )}
    {/* Espaço para dados customizados do DEV */}
    {children && <div className="my-4">{children}</div>}
    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      <button
        onClick={onDownloadTxt}
        className="flex-1 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
      >
        Baixar resultados (.txt)
      </button>
      <button
        onClick={onContinue}
        className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
      >
        {continueLabel}
      </button>
    </div>
  </div>
);
