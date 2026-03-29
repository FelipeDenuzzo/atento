import { InstructionScreen } from "@/components/InstructionScreen";

interface Props {
  onStart: () => void;
}

export default function FiltroCoresComSomInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Filtro de Cores com Som"
      instructions=
      {
      <p>Este exercício treina a sua <strong>atenção seletiva</strong> — a capacidade de focar em um tipo específico de informação enquanto ignora tudo o que acontece ao redor. Aqui, o desafio é duplo: você recebe pistas pelo ouvido e precisa agir com os olhos, integrando dois sentidos ao mesmo tempo para filtrar o que importa.
</p>
}
      onStart={onStart}
    />
  );
}
