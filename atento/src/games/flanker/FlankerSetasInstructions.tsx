import { InstructionScreen } from "@/components/InstructionScreen";

interface Props {
  onStart: () => void;
}

export default function FlankerSetasInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="A seta certa"
      instructions={
          <p>Foque na <strong>seta central</strong> e indique a direção dela, ignorando as setas laterais. Responda o mais rápido possível, mas sem perder a precisão. O treino é aplicado em <strong>várias rodadas</strong>, com diferentes níveis de dificuldade.</p>
      }
      onStart={onStart}
    />
  );
}
