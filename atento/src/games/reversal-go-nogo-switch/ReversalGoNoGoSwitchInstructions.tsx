import { InstructionScreen } from '../../components/InstructionScreen';

interface Props {
  onStart: () => void;
}

export default function ReversalGoNoGoSwitchInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Inversão Responde/Não Responde"
      instructions={
        <div>
          <p>Este exercício treina sua <strong>atenção alternada</strong> — especificamente a capacidade de inverter uma regra que já estava funcionando e adotar o comportamento oposto. Fazemos isso no dia a dia quando uma situação conhecida muda de lógica e precisamos nos adaptar rapidamente, sem agir no piloto automático.</p>
          <p>Um estímulo vai aparecer na tela junto com uma indicação de regra: <strong>NORMAL</strong> ou <strong>INVERTIDO</strong>.</p>
          <p>
            ✅ Regra <strong>NORMAL</strong> → clique quando aparecer o alvo, não clique nos outros
            <br />
            EXEMPLO: 🔄 Regra <strong>INVERTIDO</strong> → clique quando <strong>não</strong> aparecer o alvo, não clique quando ele aparecer
          </p>
          <p>Leia sempre a regra antes de responder — ela pode mudar a qualquer momento. Responder pela regra errada conta como erro.</p>
        </div>
      }
      onStart={onStart}
    />
  );
}
