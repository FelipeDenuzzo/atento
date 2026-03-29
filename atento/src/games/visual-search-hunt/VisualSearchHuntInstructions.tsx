import { InstructionScreen } from "@/components/InstructionScreen";

interface Props {
  onStart: () => void;
}

export default function VisualSearchHuntInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Caça às Figuras"
      instructions={<p>Neste exercício, você vai procurar um símbolo específico em meio a vários outros símbolos espalhados pela tela.
      Antes de começar, você verá qual é o seu alvo — o símbolo que deve encontrar. Durante o jogo, ele aparecerá misturado a outros símbolos parecidos, que servem como distração.
      Seu objetivo é encontrar o alvo e tocar nele o mais rápido que conseguir, sem se deixar enganar pelos outros.
      Com o tempo, os exercícios ficam mais desafiadores: mais itens na tela, distrações mais parecidas com o alvo ou menos tempo disponível.
      </p>}
      onStart={onStart}
    />
  );
}
