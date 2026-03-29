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
            Este exercício treina sua <strong>atenção alternada</strong> — a capacidade de
            mudar rapidamente de regra, usando a mesma figura, conforme a situação muda.
            No dia a dia, fazemos isso quando, dependendo do contexto, ora seguimos uma
            regra, ora outra, sem nos confundir.
          </p>

          <p>
            Em cada rodada, aparece uma figura simples no centro da tela. Ela sempre tem
            duas características ao mesmo tempo: uma <strong>cor</strong> (por exemplo,
            azul ou verde) e uma <strong>forma</strong> (quadrado ou retângulo). Essa
            figura pode surgir na parte <strong>superior</strong> ou na parte{" "}
            <strong>inferior</strong> da área central.
          </p>

          <p>
            A <strong>posição</strong> da figura define qual regra você deve usar:
            quando a figura aparece na parte <strong>superior</strong>, você deve prestar
            atenção apenas na <strong>COR</strong>; quando aparece na parte{" "}
            <strong>inferior</strong>, você deve prestar atenção apenas na{" "}
            <strong>FORMA</strong>. Pense na posição como um “filtro” que escolhe se você
            olha para a cor ou para a forma.
          </p>

          <p>
            Abaixo do campo de figuras, você verá dois painéis fixos: um para a parte
            superior e outro para a parte inferior. Em cada painel, a tela mostra, em
            destaque, se a regra ativa é <strong>COR</strong> ou <strong>FORMA</strong> e
            quais <strong>teclas</strong> correspondem a cada opção (por exemplo, qual
            tecla apertar para azul ou verde, qual tecla apertar para quadrado ou
            retângulo). Esses painéis são atualizados de acordo com a sessão e mostram
            sempre o mapeamento correto.
          </p>

          <p>
            Em cada tentativa, siga estes passos: primeiro, veja se a figura apareceu na
            parte <strong>superior</strong> ou <strong>inferior</strong> da tela; depois,
            olhe para o painel correspondente e note se a regra ali é{" "}
            <strong>COR</strong> ou <strong>FORMA</strong>. Use essa regra como filtro:
            se for COR, ignore a forma; se for FORMA, ignore a cor. Por fim, aperte a
            tecla indicada no painel o mais rápido possível, sem perder a precisão.
          </p>
        </>
      }
      onStart={onStart}
    />
  );
}