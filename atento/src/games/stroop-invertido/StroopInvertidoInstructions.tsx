import { InstructionScreen } from "@/components/InstructionScreen";

interface Props {
  onStart: () => void;
}

export default function StroopInvertidoInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Cor da palavra"
      instructions={<p>Clique na cor da tinta, <strong>não</strong> na palavra escrita. Mantenha o foco e evite respostas automáticas.
            O treino é aplicado em <strong>várias rodadas</strong>, com diferentes níveis de dificuldade.<br />
            Clique em "Iniciar treino" para começar.
          </p>}
      onStart={onStart}
    />
  );
}
