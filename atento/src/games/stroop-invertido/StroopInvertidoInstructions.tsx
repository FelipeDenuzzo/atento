import { InstructionScreen } from "@/components/InstructionScreen";

interface Props {
  onStart: () => void;
}

export default function StroopInvertidoInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Cor da palavra"
      instructions={<p>Este exercício treina a sua <strong>atenção seletiva</strong> — especificamente a capacidade de ignorar uma informação automática e focar no que realmente foi pedido. O cérebro tende a ler palavras antes de perceber cores, e esse treino trabalha justamente esse conflito, fortalecendo o controle sobre respostas automáticas.
      </p>
      }
      onStart={onStart}
    />
  );
}
