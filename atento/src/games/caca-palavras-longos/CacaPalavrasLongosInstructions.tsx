import { InstructionScreen } from "@/components/InstructionScreen";

interface Props {
  onStart: () => void;
}

export default function CacaPalavrasLongosInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Caça Palavras Longos"
      instructions={<p>Encontre todas as palavras escondidas na matriz.</p>}
      onStart={onStart}
    />
  );
}
