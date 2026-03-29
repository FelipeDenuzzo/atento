import { InstructionScreen } from '../../components/InstructionScreen';

interface Props {
  onStart: () => void;
}

export default function MapaDeSimbolosInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Mapa de Símbolos"
      instructions={
        <p>Neste exercício, você vai ver uma <strong>grade com vários símbolos</strong> e precisará encontrar ou combinar os que correspondem a um modelo mostrado antes.

Antes de começar, você verá quais são os símbolos-alvo — aqueles que deve localizar ou associar corretamente dentro da grade. Os outros símbolos ao redor são <strong>distrações visuais</strong> que tornam a busca mais difícil.

Seu objetivo é <strong>encontrar os símbolos certos com precisão</strong>, sem se perder na quantidade de informação visual na tela.

O exercício fica mais desafiador com o tempo: grades maiores, símbolos mais parecidos entre si ou menos tempo disponível para responder.
</p>
      }
      onStart={onStart}
    />
  );
}
