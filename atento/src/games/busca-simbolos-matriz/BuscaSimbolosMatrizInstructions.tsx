import { InstructionScreen } from '../../components/InstructionScreen';

interface Props {
  onStart: () => void;
}

export default function BuscaSimbolosMatrizInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Busca Símbolos Matriz"
      instructions={
        <div>
<p>Este exercício treina sua <strong>atenção sustentada</strong> — a capacidade de manter o foco em uma varredura sistemática por um período prolongado, sem deixar a atenção escapar. Usamos essa habilidade quando precisamos revisar um documento longo, conferir uma lista extensa ou inspecionar algo com cuidado do começo ao fim.</p>



<p>Uma grade grande com números ou símbolos vai aparecer na tela. Sua tarefa é <strong>localizar e marcar todos os alvos</strong> espalhados pela grade, varrendo linha por linha sem pular nenhuma posição. O alvo estará indicado antes de começar.</p>



<p>Não há atalho — é preciso percorrer toda a grade com atenção constante. A cada fase, a grade fica maior e os alvos mais parecidos com os outros itens, exigindo uma concentração cada vez mais precisa e duradoura.</p>
        </div>
      }
      onStart={onStart}
    />
  );
}
