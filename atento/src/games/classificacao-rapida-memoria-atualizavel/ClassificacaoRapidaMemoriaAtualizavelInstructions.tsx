import { InstructionScreen } from "@/components/InstructionScreen";

interface Props {
  onStart: () => void;
}

export default function ClassificacaoRapidaMemoriaAtualizavelInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Classificação Rápida Memória Atualizável"
      instructions={
        <div>
          <p>Este exercício treina sua <strong>atenção dividida</strong> — a capacidade de realizar duas tarefas ao mesmo tempo sem abandonar nenhuma delas. Aqui, o desafio é responder rapidamente a estímulos que aparecem na tela enquanto mantém e atualiza uma informação importante na cabeça, pronta para ser usada quando solicitada. Usamos essa habilidade sempre que precisamos executar uma tarefa sem perder o controle do que está acontecendo em paralelo.</p>
          <p style={{marginTop: 16}}>
            <strong>Como responder:</strong><br />
            Pressione <kbd>F</kbd> para classificar à esquerda<br />
            Pressione <kbd>J</kbd> para classificar à direita
          </p>
        </div>
      }
      onStart={onStart}
    />
  );
}
