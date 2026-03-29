import { InstructionScreen } from "@/components/InstructionScreen";

interface Props {
  onStart: () => void;
}

export default function DirijaPalavrasAlvoInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Dirija Palavras Alvo"
      instructions={<p>Aqui você treina a atenção dividida, ou seja, sua capacidade de manter o controle de uma tarefa contínua enquanto detecta palavras específicas que aparecem na tela. Você precisa, ao mesmo tempo, “dirigir” um marcador dentro de uma faixa móvel e ficar atento às palavras que caem dos lados para apertar o espaço apenas quando aparecer a palavra‑alvo. À medida que as fases avançam, a faixa fica mais instável, a área verde fica menor e as palavras aparecem mais rápido, aumentando o desafio de dividir o foco sem perder a precisão
        
      </p>
      }
      onStart={onStart}
    />
  );
}
