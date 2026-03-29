import { InstructionScreen } from "@/components/InstructionScreen";

interface Props {
  onStart: () => void;
}

export default function RadarTonoInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Radar e Tom"
      instructions={
        <div>
          <p>Este exercício treina sua <strong>atenção dividida</strong> — a capacidade de monitorar duas coisas ao mesmo tempo, distribuindo o foco entre elas sem perder nenhuma das duas. Usamos essa habilidade no dia a dia em situações como dirigir enquanto ouvimos alguém falar, ou cozinhar enquanto acompanhamos uma conversa.</p>
          <p>Você terá <strong>duas tarefas simultâneas</strong>:</p>
          <p>
            🎯 <strong>Tarefa visual</strong> → mantenha o cursor sobre o ponto em movimento no radar o maior tempo possível
            <br />
            🔊 <strong>Tarefa auditiva</strong> → ouça os tons que tocam e pressione a tecla correta para cada um — grave ou agudo
          </p>
          <p>Sua pontuação combina o <strong>tempo que ficou sobre o alvo</strong> com os <strong>acertos nos tons</strong>. Abandonar uma tarefa para se dedicar só à outra reduz sua pontuação. O desafio aumenta a cada fase.</p>
        </div>
      }
      onStart={onStart}
    />
  );
}
