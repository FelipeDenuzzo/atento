import { InstructionScreen } from '@/components/InstructionScreen';

interface Props {
  onStart: () => void;
}

export default function TrilhaAlternadaTmtbMobileInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Trilha Alternada TMT-B (Mobile)"
      instructions={<>
        <p>Alterne entre números e letras na sequência correta o mais rápido possível.</p>
        <p className="mt-1">O próximo alvo fica destacado em azul.</p>
        <p className="mt-1">Se errar, você volta um passo e precisa retomar a trilha corretamente.</p>
      </>}
      onStart={onStart}
    />
  );
}
