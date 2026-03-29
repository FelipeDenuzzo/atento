import { InstructionScreen } from '../../components/InstructionScreen';

interface Props {
  onStart: () => void;
}

export default function MapaSimbolosMonitorSomInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Mapa de Símbolos com Monitoramento de Som"
      instructions="Encontre os símbolos enquanto monitora sons específicos."
      onStart={onStart}
    />
  );
}
