import { InstructionScreen } from '../../components/InstructionScreen';

interface Props {
  onStart: () => void;
}

export default function ChatVigilanciaErrosInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Chat Vigilância de Erros"
      instructions="Monitore e corrija os erros apresentados no chat."
      onStart={onStart}
    />
  );
}
