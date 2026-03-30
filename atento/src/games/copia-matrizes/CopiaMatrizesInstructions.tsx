import { InstructionScreen } from "@/components/InstructionScreen";

interface Props {
  onStart: () => void;
}

export default function CopiaMatrizesInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Cópia de Matrizes"
      instructions={
      <p>Este exercício treina sua <strong>atenção sustentada</strong> — a capacidade de manter o foco em uma tarefa repetitiva e detalhada por um período prolongado, sem deixar a precisão cair. Usamos essa habilidade quando precisamos copiar informações com exatidão, preencher formulários ou executar uma tarefa que exige cuidado constante do início ao fim.</p>
      }
      onStart={onStart}
    />
  );
}
