import { InstructionScreen } from '../../components/InstructionScreen';

interface Props {
  onStart: () => void;
}

export default function GoNoGoQuickClickInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Go/No-Go Clique Rápido"
      instructions="Responda rapidamente aos estímulos GO e não responda aos NOGO."
      onStart={onStart}
    />
  );
}
