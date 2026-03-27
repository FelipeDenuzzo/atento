import { InstructionScreen } from "@/components/InstructionScreen";

interface Props {
  onStart: () => void;
}

export default function VisualSearchHuntInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Visual Search Hunt"
      instructions={<p>Encontre rapidamente o alvo visual entre os distractores.</p>}
      onStart={onStart}
    />
  );
}
