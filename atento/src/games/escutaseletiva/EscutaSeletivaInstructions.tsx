import { InstructionScreen } from '../../components/InstructionScreen';

interface Props {
  onStart: () => void;
}

export default function EscutaSeletivaInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Escuta Seletiva"
      instructions="Foque nos sons relevantes e ignore os demais."
      onStart={onStart}
    />
  );
}
