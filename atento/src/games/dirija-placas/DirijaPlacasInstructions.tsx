import { InstructionScreen } from '../../components/InstructionScreen';

interface Props {
  onStart: () => void;
}

export default function DirijaPlacasInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Dirija Placas"
      instructions="Dirija-se rapidamente para as placas indicadas."
      onStart={onStart}
    />
  );
}
