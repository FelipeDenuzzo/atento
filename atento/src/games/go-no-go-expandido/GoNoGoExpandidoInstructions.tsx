import { InstructionScreen } from "@/components/InstructionScreen";

interface Props {
  onStart: () => void;
}

export default function GoNoGoExpandidoInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Go/No-Go"
      instructions={<p>Neste exercício, você vai reagir rapidamente ao que aparece na tela — mas atenção: <strong>nem sempre deve clicar</strong>.

Antes de começar, você saberá qual estímulo pede uma ação (o sinal de <strong>"vai"</strong>) e qual pede que você fique parado (o sinal de <strong>"não vai"</strong>). Durante o jogo, eles aparecem um de cada vez, em sequência rápida.

Seu objetivo é <strong>clicar quando ver o sinal certo</strong> e <strong>resistir ao impulso de clicar</strong> quando aparecer o sinal errado.

O desafio aumenta gradualmente: os estímulos aparecem mais rápido, ou os sinais de "não vai" ficam mais frequentes, exigindo mais controle e atenção.
</p>}
      onStart={onStart}
    />
  );
}
