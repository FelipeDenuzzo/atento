import { InstructionScreen } from '../../components/InstructionScreen';

interface Props {
  onStart: () => void;
}

export default function MapaDeSimbolosInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Mapa de Símbolos"
      instructions={
       <p>Este exercício treina a sua <strong>atenção seletiva</strong> — especificamente a capacidade de varrer um campo visual cheio de informações e identificar apenas o que importa. Usamos essa habilidade quando procuramos um número numa lista, uma palavra num texto longo ou um item específico numa página cheia de opções.
       </p>
      }
      onStart={onStart}
    />
  );
}
