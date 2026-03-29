import { InstructionScreen } from '../../components/InstructionScreen';

interface Props {
  onStart: () => void;
}

export default function EscutaSeletivaCocktailPartyInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Escuta Seletiva"
      instructions={
        <p>Este exercício treina a sua <strong>atenção seletiva auditiva</strong> — a capacidade de focar em uma voz ou som específico em meio a outros sons acontecendo ao mesmo tempo. É a mesma habilidade que usamos quando tentamos acompanhar uma conversa em um ambiente barulhento, como um restaurante cheio ou uma reunião agitada.</p>
      }
      onStart={onStart}
    />
  );
}
