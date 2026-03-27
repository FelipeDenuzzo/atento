import React from "react";

interface ResultScreenProps {
  title: string;
  children: React.ReactNode;
  onDownloadTxt: () => void;
  onContinue: () => void;
  continueLabel?: string;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  title,
  children,
  onDownloadTxt,
  onContinue,
  continueLabel = "Próximo treino",
}) => (
  <div className="max-w-lg mx-auto p-6 bg-white rounded-xl shadow space-y-6 text-center">
    <h2 className="text-2xl font-bold text-zinc-900">{title}</h2>
    <div className="my-4">{children}</div>
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
