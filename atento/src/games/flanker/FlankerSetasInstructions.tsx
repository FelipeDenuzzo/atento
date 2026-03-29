import { InstructionScreen } from "@/components/InstructionScreen";

interface Props {
  onStart: () => void;
}

export default function FlankerSetasInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="A seta certa"
      instructions={
<p>Este exercício treina a sua <strong>atenção seletiva</strong> — a capacidade de focar no que importa e ignorar informações ao redor que tentam te confundir. No dia a dia, usamos essa habilidade quando precisamos seguir uma instrução específica em meio a muitas outras informações chegando ao mesmo tempo.
</p>
      }
      onStart={onStart}
    />
  );
}
