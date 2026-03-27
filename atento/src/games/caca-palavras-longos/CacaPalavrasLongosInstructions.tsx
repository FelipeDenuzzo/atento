import { InstructionScreen } from "@/components/InstructionScreen";

interface Props {
  onStart: () => void;
}

export default function CacaPalavrasLongosInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Caça Palavras Longos"
      instructions={
        <>
          <p>Encontre todas as palavras na grade mantendo foco contínuo até o fim.</p>
          <p className="mt-2">Selecione a palavra clicando no início e arrastando pela direção correta.</p>
        </>
      }
      onStart={onStart}
    />
  );
}
