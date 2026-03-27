import { InstructionScreen } from "@/components/InstructionScreen";

interface Props {
  onStart: () => void;
}

export default function CacaPalavrasLongosInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title=""
      instructions={
        <>
          <p>Encontre todas as palavras na grade mantendo foco contínuo até o fim.</p>
          <p className="mt-2">As rodadas aumentam de dificuldade (12×12 até 20×20), com mais palavras e orientações.</p>
          <p className="mt-2">Selecione a palavra clicando no início e no fim, ou arrastando pela direção correta.</p>
        </>
      }
      onStart={onStart}
    />
  );
}
