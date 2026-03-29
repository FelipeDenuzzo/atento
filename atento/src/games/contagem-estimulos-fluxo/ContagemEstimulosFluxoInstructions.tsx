import { InstructionScreen } from "@/components/InstructionScreen";

interface Props {
  onStart: () => void;
}

export default function ContagemEstimulosFluxoInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Contagem de Estímulos em Fluxo"
      instructions={<p>Conte os estímulos apresentados em sequência.</p>}
      onStart={onStart}
    />
  );
}
