import { InstructionScreen } from "@/components/InstructionScreen";

interface Props {
  onStart: () => void;
}

export default function CacaPalavrasLongosInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title=""
      instructions={
        <p>
          Este exercício treina sua <strong>atenção sustentada</strong> — a capacidade de manter o foco ativo ao longo de uma tarefa extensa, sem deixar a vigilância cair no meio do caminho. Usamos essa habilidade sempre que precisamos revisar um texto longo, conferir uma lista completa ou realizar qualquer tarefa que exija presença constante do início ao fim, sem atalhos.
        </p>
      }
      onStart={onStart}
    />
  );
}
