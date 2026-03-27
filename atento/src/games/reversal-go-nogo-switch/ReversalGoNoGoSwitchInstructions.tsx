import { InstructionScreen } from '../../components/InstructionScreen';

interface Props {
  onStart: () => void;
}

export default function ReversalGoNoGoSwitchInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Reversal Go/No-Go Switch"
      instructions="Alterne entre responder e não responder conforme as regras."
      onStart={onStart}
    />
  );
}
