import { InstructionScreen } from '../../components/InstructionScreen';

interface Props {
  onStart: () => void;
}

export default function MapaDeSimbolosInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Mapa de Símbolos"
      instructions="Encontre todos os símbolos indicados no mapa."
      onStart={onStart}
    />
  );
}
