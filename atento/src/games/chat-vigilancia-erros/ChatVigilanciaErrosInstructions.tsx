import { InstructionScreen } from '../../components/InstructionScreen';

interface Props {
  onStart: () => void;
}

export default function ChatVigilanciaErrosInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Chat Vigilância de Erros"
      instructions={
        <p>Este exercício treina sua <strong>atenção dividida</strong> — a capacidade de realizar duas tarefas ao mesmo tempo sem deixar nenhuma de lado. No dia a dia, usamos essa habilidade em situações como responder alguém enquanto monitoramos o que acontece ao redor, exigindo que o cérebro distribua o foco entre duas demandas diferentes simultaneamente.
        </p>
      }
      onStart={onStart}
    />
  );
}
