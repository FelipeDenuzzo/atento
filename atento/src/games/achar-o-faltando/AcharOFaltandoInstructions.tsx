import { InstructionScreen } from "@/components/InstructionScreen";

interface Props {
  onStart: () => void;
}

export default function AcharOFaltandoInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Achar o Faltando"
      instructions={
        <p>
          Este exercício treina sua <strong>atenção sustentada</strong> — a capacidade de manter o foco durante uma comparação prolongada e detalhada, sem deixar nenhum elemento passar despercebido. Usamos essa habilidade quando precisamos revisar documentos, conferir informações ou identificar inconsistências em situações que exigem observação cuidadosa do início ao fim.
        </p>
      }
      onStart={onStart}
    />
  );
}
