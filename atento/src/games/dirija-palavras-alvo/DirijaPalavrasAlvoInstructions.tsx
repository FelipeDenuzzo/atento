import { InstructionScreen } from "@/components/InstructionScreen";

interface Props {
  onStart: () => void;
}

export default function DirijaPalavrasAlvoInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Dirija Palavras Alvo"
      instructions={<p>Dirija-se rapidamente para as palavras-alvo indicadas.</p>}
      onStart={onStart}
    />
  );
}
