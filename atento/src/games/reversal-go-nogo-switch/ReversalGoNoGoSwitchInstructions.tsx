import { InstructionScreen } from '../../components/InstructionScreen';

interface Props {
  onStart: () => void;
}

export default function ReversalGoNoGoSwitchInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Inversão Responde/Não Responde"
      instructions={
        <p>Um estímulo vai aparecer na tela junto com uma regra: 
          <strong>NORMAL</strong> ou <strong>INVERTIDO</strong>. Na regra NORMAL, clique apenas quando aparecer o alvo. 
          Na regra INVERTIDO, clique quando <strong>NÃO</strong> aparecer o alvo — a lógica se inverte completamente. 
          <strong>Fique atento à regra antes de responder</strong>, pois ela pode mudar a qualquer momento.</p>
      }
      onStart={onStart}
    />
  );
}
