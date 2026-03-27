import { InstructionScreen } from '../../components/InstructionScreen';

interface Props {
  onStart: () => void;
}

export default function CorOuFormaSwitchInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Cor ou Forma Switch"
      instructions="Alterne entre responder pela cor ou pela forma conforme indicado."
      onStart={onStart}
    />
  );
}
