import { InstructionScreen } from "@/components/InstructionScreen";

interface Props {
  onStart: () => void;
}

export default function AcharOFaltandoInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Achar o Faltando"
      instructions={
        <>
          <p>Compare as duas grades (ou listas) que aparecem na tela.</p>
          <p>
            Elas são quase iguais, mas existe uma diferença: em uma delas <strong>falta</strong> um item ou existe um item <strong>a mais</strong>.
          </p>
          <p>Sua tarefa é encontrar essa diferença e marcar onde ela está.</p>
          <p>Vá com calma e confira linha por linha (ou coluna por coluna) até ter certeza.</p>
          <div className="mt-3 rounded-lg border border-black/10 bg-zinc-50 p-3">
            O treino é aplicado em <strong>10 rodadas progressivas</strong>, com dificuldade crescente.<br />
            Você só precisa iniciar e seguir até o final.
          </div>
        </>
      }
      onStart={onStart}
    />
  );
}
