import { InstructionScreen } from '../../components/InstructionScreen';

interface Props {
  onStart: () => void;
}

export default function CorOuFormaSwitchInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Cor ou Forma"
      instructions={
        <>
        <p>Este exercício treina sua <strong>atenção alternada</strong> — a capacidade de mudar rapidamente de regra quando o contexto muda, sem se perder. Usamos essa habilidade sempre que precisamos alternar entre dois modos de pensar ou agir, como quando mudamos de assunto numa conversa ou trocamos de tarefa no trabalho.</p>

 Como jogar

<p>Em cada rodada, uma figura colorida vai aparecer na tela junto com uma <strong>indicação de regra</strong>: ora você deve responder pela <strong>COR</strong>, ora pela <strong>FORMA</strong>. A regra pode mudar a qualquer momento, então leia a indicação antes de responder.


⬛ Regra <strong>COR</strong> → identifique a cor da figura e pressione a tecla correspondente

🔷 Regra <strong>FORMA</strong> → identifique a forma da figura e pressione a tecla correspondente


Responda o mais rápido que conseguir. A cada fase, as trocas de regra ficam mais frequentes.
</p>
</>
      }
      onStart={onStart}
    />
  );
}
