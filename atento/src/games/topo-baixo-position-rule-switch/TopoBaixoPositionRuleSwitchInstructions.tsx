import { InstructionScreen } from "@/components/InstructionScreen";

interface Props {
  onStart: () => void;
}

export default function TopoBaixoPositionRuleSwitchInstructions({ onStart }: Props) {
  return (
    <InstructionScreen
      title="Superior-Inferior — Troca de Regra"
      instructions={
        <>
          <p>
            Este exercício treina sua <strong>atenção alternada</strong> — a capacidade de mudar rapidamente de regra, usando a mesma figura, conforme a situação muda. No dia a dia, fazemos isso quando, dependendo do contexto, ora seguimos uma regra, ora outra, sem nos confundir.
          </p>
          <p>
            Em cada rodada, aparece uma figura com <strong>duas características ao mesmo tempo</strong>: uma <strong>cor</strong> (azul ou verde) e uma <strong>forma</strong> (quadrado ou retângulo). Ela pode surgir na parte <strong>superior</strong> ou <strong>inferior</strong> da tela.
          </p>
          <p>A <strong>posição</strong> define a regra:</p>
          <p>
            ⬆️ Figura no <strong>topo</strong> → preste atenção apenas na <strong>COR</strong>, ignore a forma
            <br />
            ⬇️ Figura <strong>embaixo</strong> → preste atenção apenas na <strong>FORMA</strong>, ignore a cor
          </p>
          <p>
            Abaixo do campo de figuras, dois painéis mostram a regra ativa (<strong>COR</strong> ou <strong>FORMA</strong>) e as <strong>teclas correspondentes</strong> para cada opção. Eles são atualizados automaticamente e mostram sempre o mapeamento correto.
          </p>
          <p>Em cada tentativa:</p>
          <p>
            1️⃣ Veja se a figura está no <strong>topo</strong> ou <strong>embaixo</strong>
            <br />
            2️⃣ Consulte o painel correspondente
            <br />
            3️⃣ Aperte a tecla indicada o mais rápido que conseguir, sem perder a precisão
          </p>
        </>
      }
      onStart={onStart}
    />
  );
}