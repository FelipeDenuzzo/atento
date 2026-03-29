import { InstructionScreen } from "@/components/InstructionScreen";

interface Props {
  onStart: () => void;
}

export default function FiltroCoresComSomInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Filtro de Cores com Som"
      instructions={<p>Neste exercício, você vai ver <strong>formas coloridas aparecendo na tela</strong> enquanto ouve <strong>sons ao mesmo tempo</strong>.

Antes de começar, você saberá exatamente o que deve observar — por exemplo, uma cor específica ou uma forma específica. O desafio é focar apenas nisso e <strong>ignorar tudo o que não for o alvo</strong>, seja a cor diferente ou o som que toca ao fundo.

Seu objetivo é identificar e tocar somente nos elementos certos, sem se distrair com os outros estímulos visuais ou sonoros.

Com o tempo, o exercício fica mais exigente: mais cores, mais sons simultâneos ou alvos que mudam, pedindo uma atenção cada vez mais precisa.</p>}
      onStart={onStart}
    />
  );
}
