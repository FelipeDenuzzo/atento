import { InstructionScreen } from '../../components/InstructionScreen';

interface Props {
  onStart: () => void;
}

export default function EscutaSeletivaCocktailPartyInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Escuta Seletiva Cocktail Party"
      instructions="Foque na voz-alvo e ignore as demais vozes."
      onStart={onStart}
    />
  );
}
