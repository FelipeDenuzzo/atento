import { InstructionScreen } from "@/components/InstructionScreen";

interface Props {
  onStart: () => void;
}

export default function GoNoGoExpandidoInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Go/No-Go Expandido"
      instructions={<p>Responda apenas aos estímulos corretos, ignorando os demais.</p>}
      onStart={onStart}
    />
  );
}
