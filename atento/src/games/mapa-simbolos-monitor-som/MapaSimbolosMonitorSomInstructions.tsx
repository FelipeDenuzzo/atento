import { InstructionScreen } from '../../components/InstructionScreen';

interface Props {
  onStart: () => void;
}

export default function MapaSimbolosMonitorSomInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Mapa de Símbolos com Monitoramento de Som"
      instructions={
        <p>Este exercício treina sua <strong>atenção dividida</strong> — a capacidade de processar duas fontes de informação ao mesmo tempo, uma visual e uma auditiva. No dia a dia, usamos essa habilidade quando precisamos acompanhar o que vemos e o que ouvimos simultaneamente, como ler uma informação enquanto monitoramos sons ao redor.
        </p>
      }
      onStart={onStart}
    />
  );
}
