import { InstructionScreen } from "@/components/InstructionScreen";

interface Props {
  onStart: () => void;
}

export default function TopoBaixoPositionRuleSwitchInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Topo-Baixo Position Rule Switch"
      instructions={<p>Alterne entre as regras de posição conforme indicado.</p>}
      onStart={onStart}
    />
  );
}
