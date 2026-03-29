import React from "react";

interface InstructionScreenProps {
  title: string;
  instructions: React.ReactNode;
  onStart: () => void;
  extraContent?: React.ReactNode;
  startLabel?: string;
}

export function InstructionScreen({
  title,
  instructions,
  onStart,
  extraContent,
  startLabel = "Iniciar treino",
}: InstructionScreenProps) {
  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-zinc-900 text-left">{title}</h2>
      <div className="rounded-lg border border-black/10 bg-zinc-50 p-4 text-sm text-black text-left">
        {instructions}
      </div>
      {extraContent}
      <button
        type="button"
        onClick={onStart}
        className="w-full rounded-lg bg-zinc-900 px-4 py-3 font-semibold text-white hover:bg-zinc-700"
      >
        {startLabel}
      </button>
    </div>
  );
}
