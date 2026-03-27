import { InstructionScreen } from "@/components/InstructionScreen";

interface Props {
  onStart: () => void;
}

export function RadarTonoInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Radar Tono"
      instructions={<p>Identifique rapidamente o tom apresentado no radar.</p>}
      onStart={onStart}
    />
  );
}
