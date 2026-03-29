import { InstructionScreen } from "@/components/InstructionScreen";

interface Props {
  onStart: () => void;
}

export default function FiltroCoresComSomInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Filtro de Cores com Som"
      instructions={<p>Filtre os estímulos de acordo com a cor e o som apresentados.</p>}
      onStart={onStart}
    />
  );
}
