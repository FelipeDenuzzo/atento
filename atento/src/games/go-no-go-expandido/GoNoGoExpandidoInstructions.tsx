import { InstructionScreen } from "@/components/InstructionScreen";

interface Props {
  onStart: () => void;
}

export default function GoNoGoExpandidoInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Go/No-Go"
      instructions={
      <p>Este exercício treina o seu <strong>controle da atenção</strong> — a capacidade de reagir rapidamente ao que importa e, ao mesmo tempo, segurar o impulso de responder ao que não deve. Essa habilidade é usada no dia a dia sempre que precisamos agir com rapidez, mas sem nos precipitar.
      </p>
      }
      onStart={onStart}
    />
  );
}
