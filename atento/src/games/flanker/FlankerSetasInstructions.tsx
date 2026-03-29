import { InstructionScreen } from "@/components/InstructionScreen";

interface Props {
  onStart: () => void;
}

export default function FlankerSetasInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Flanker de Setas"
      instructions={
        <>
          <p>Foque na seta central e indique a direção dela, ignorando as setas laterais.</p>
          <p>Responda o mais rápido possível, mas sem perder a precisão.</p>
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
