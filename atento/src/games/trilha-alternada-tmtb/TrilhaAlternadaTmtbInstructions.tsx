import { InstructionScreen } from "@/components/InstructionScreen";

interface Props {
  onStart: () => void;
}

export default function TrilhaAlternadaTmtbInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Trilha Alternada TMT-B"
      instructions={<p>Alterne entre números e letras na sequência correta o mais rápido possível.</p>}
      onStart={onStart}
    />
  );
}
