import { InstructionScreen } from '../../components/InstructionScreen';

interface Props {
  onStart: () => void;
}

export default function EscutaSeletivaCocktailPartyInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Escuta Seletiva"
      instructions={
        <p>Neste exercício, você vai ouvir <strong>mais de uma voz ou som ao mesmo tempo</strong> e precisará prestar atenção apenas em um deles.

Antes de começar, você saberá qual é a voz ou o som que deve acompanhar — por exemplo, uma voz específica falando palavras ou números. As outras vozes e sons ao redor são <strong>distrações que devem ser ignoradas</strong>.

Seu objetivo é <strong>identificar e registrar apenas o que vem da fonte certa</strong>, como se você estivesse em uma conversa em meio a um ambiente barulhento.

O desafio aumenta progressivamente: as vozes ficam mais parecidas, o volume das distrações aumenta ou o ritmo das informações acelera.
</p>
}
      onStart={onStart}
    />
  );
}
