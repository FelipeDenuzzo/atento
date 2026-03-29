import { InstructionScreen } from "@/components/InstructionScreen";

interface Props {
  onStart: () => void;
}

export default function ClassificacaoRapidaMemoriaAtualizavelInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Classificação Rápida Memória Atualizável"
      instructions={<p>Classifique rapidamente os itens conforme as regras apresentadas.</p>}
      onStart={onStart}
    />
  );
}
