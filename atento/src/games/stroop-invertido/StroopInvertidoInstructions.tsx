import { InstructionScreen } from "@/components/InstructionScreen";

interface Props {
  onStart: () => void;
}

export function StroopInvertidoInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Stroop Invertido"
      instructions={
        <>
          <p>Clique na cor da tinta, não na palavra escrita. Mantenha o foco e evite respostas automáticas.</p>
          <div className="mt-3 rounded-lg border border-black/10 bg-zinc-50 p-3">
            O treino é aplicado em <strong>várias rodadas</strong>, com diferentes níveis de dificuldade.<br />
            Clique em "Iniciar treino" para começar.
          </div>
        </>
      }
      onStart={onStart}
    />
  );
}
