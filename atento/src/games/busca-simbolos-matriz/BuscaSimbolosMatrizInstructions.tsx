import { InstructionScreen } from '../../components/InstructionScreen';

interface Props {
  onStart: () => void;
}

export default function BuscaSimbolosMatrizInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Busca Símbolos Matriz"
      instructions="Encontre os símbolos indicados na matriz o mais rápido possível."
      onStart={onStart}
    />
  );
}
