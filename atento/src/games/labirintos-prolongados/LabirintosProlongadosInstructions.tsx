import { InstructionScreen } from '../../components/InstructionScreen';

interface Props {
  onStart: () => void;
}

export default function LabirintosProlongadosInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Labirintos Prolongados"
      instructions="Percorra o labirinto até o final o mais rápido possível."
      onStart={onStart}
    />
  );
}
