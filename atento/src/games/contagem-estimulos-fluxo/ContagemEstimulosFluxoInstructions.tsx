import { InstructionScreen } from "@/components/InstructionScreen";

interface Props {
  onStart: () => void;
}

export default function ContagemEstimulosFluxoInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Contagem de Estímulos em Fluxo"
      instructions={
        <>
          <p>
            Este exercício treina sua <strong>atenção sustentada</strong> — a capacidade de manter o foco em uma tarefa por um período prolongado, sem deixar a atenção escapar. Usamos essa habilidade quando precisamos acompanhar algo do início ao fim sem interrupção, como assistir a uma aula, ouvir uma instrução longa ou monitorar uma situação que exige vigilância contínua.
          </p>
          <br />
          <p>
            Uma sequência de sons ou imagens vai aparecer em ritmo constante. Sua tarefa é <strong>contar mentalmente</strong> quantas vezes o estímulo-alvo aparece ao longo de todo o fluxo — e informar o total ao final.
          </p>
          <p>
            O estímulo-alvo estará indicado antes de começar. <strong>Não clique durante o fluxo</strong> — apenas conte. Ao final da sequência, você será solicitado a informar o número que contou.
          </p>
          <p>
            A cada fase, o fluxo fica mais longo, o ritmo mais rápido e os estímulos mais parecidos entre si, exigindo foco contínuo do início ao fim.
          </p>
        </>
      }
      onStart={onStart}
    />
  );
}
