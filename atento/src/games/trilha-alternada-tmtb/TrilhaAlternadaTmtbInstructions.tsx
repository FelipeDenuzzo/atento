import { InstructionScreen } from "@/components/InstructionScreen";

interface Props {
  onStart: () => void;
}

export default function TrilhaAlternadaTmtbInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Trilha Alternada 1->A 2->B"
      instructions={
        <p>
      Este exercício treina a sua <strong>atenção alternada</strong> — a capacidade de mudar o foco
      entre duas tarefas diferentes sem se perder. Usamos essa habilidade no dia a dia quando
      precisamos parar o que estávamos fazendo, atender a outra demanda e depois retomar de onde
      paramos, sem confundir as duas coisas.
      <br />
      Você vai ver números e letras espalhados pela tela. Sua tarefa é
      <strong> conectá-los em ordem, alternando entre os dois</strong>: primeiro um número, depois
      uma letra, depois um número, e assim por diante — seguindo a sequência
      <strong> 1 → A → 2 → B → 3 → C…</strong> Toque nos itens nessa ordem, sem pular nem
      misturar. A cada fase o campo fica maior e os itens mais espalhados, exigindo mais agilidade
      na troca.
      Comece clicando no 1.
    </p>
      }
      onStart={onStart}
    />
  );
}
