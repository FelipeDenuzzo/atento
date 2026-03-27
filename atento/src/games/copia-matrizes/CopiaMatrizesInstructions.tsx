import { InstructionScreen } from "@/components/InstructionScreen";

interface Props {
  onStart: () => void;
}

export default function CopiaMatrizesInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Cópia de Matrizes"
      instructions={<p>Copie a matriz apresentada o mais rápido e corretamente possível.</p>}
      onStart={onStart}
    />
  );
}
