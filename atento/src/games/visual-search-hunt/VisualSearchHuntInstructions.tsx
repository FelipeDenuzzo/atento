import { InstructionScreen } from "@/components/InstructionScreen";

interface Props {
  onStart: () => void;
}

export default function VisualSearchHuntInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Caça às Figuras"
      instructions={
      <p>Este exercício treina a sua <strong>atenção seletiva</strong> — a capacidade de encontrar o que importa em meio a muita informação ao mesmo tempo. No dia a dia, usamos essa habilidade quando procuramos um produto numa prateleira cheia, um rosto numa multidão ou um item numa lista longa. Com o treino, esse filtro mental fica mais ágil e preciso.
      </p>
      }
      onStart={onStart}
    />
  );
}
