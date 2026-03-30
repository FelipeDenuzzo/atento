import { InstructionScreen } from '../../components/InstructionScreen';

interface Props {
  onStart: () => void;
}

export default function LabirintosProlongadosInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Labirintos Prolongados"
      instructions={
        <div>
          <p>Este exercício treina sua <strong>atenção sustentada</strong> — a capacidade de manter o foco em uma tarefa por um período prolongado, sem se distrair ou desistir no meio do caminho. Usamos essa habilidade sempre que precisamos concluir algo que exige persistência e concentração contínua, como resolver um problema passo a passo ou seguir um processo longo sem perder o fio.</p>
          <p>Um labirinto vai aparecer na tela. Sua tarefa é <strong>traçar o caminho do ponto de entrada até a saída</strong>, sem passar por caminhos bloqueados. Vá com calma — o que conta aqui não é a velocidade, mas <strong>manter o foco até o final</strong> sem se perder.</p>
          <p>A cada fase, os labirintos ficam maiores, com mais bifurcações e becos sem saída, exigindo uma atenção cada vez mais cuidadosa ao longo de todo o percurso.</p>
        </div>
      }
      onStart={onStart}
    />
  );
}
