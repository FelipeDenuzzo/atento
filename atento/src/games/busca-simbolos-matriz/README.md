# Busca de Símbolos em Matriz

## Objetivo

Treinar atenção sustentada em tarefa de cancelamento visual (varredura em grade) com estímulos repetitivos por tempo prolongado.

## Fluxo

- Tela inicial da rodada: exibe o alvo (com ou sem símbolos de contexto, conforme a rodada).
- Execução: marcação de células por clique sem feedback imediato de acerto/erro.
- Pausa: bloqueia entrada e cronômetro.
- Resultado por rodada e resultado final: hits, omissões, comissões, tempo, taxa, precisão e recall.

## Rodadas padrão (fixas)

1. `8x8` - `30s` - alvo visível durante o jogo - sem símbolos semelhantes
2. `10x10` - `35s` - alvo apenas na tela inicial - sem símbolos semelhantes
3. `15x15` - `45s` - alvo visível durante o jogo - sem símbolos semelhantes
4. `18x18` - `50s` - alvo apenas na tela inicial - sem símbolos semelhantes
5. `20x20` - `60s` - alvo visível durante o jogo - com símbolos semelhantes
6. `22x22` - `60s` - alvo apenas na tela inicial - com símbolos semelhantes

No modo com símbolos semelhantes, todos os símbolos permanecem na mesma cor e somente o alvo recebe contorno vermelho.

## Feature flag

Habilitar com:

`NEXT_PUBLIC_ENABLE_MATRIX_SYMBOL_SEARCH=true`

## Arquivos

- `BuscaSimbolosMatrizGame.tsx`
- `logic.ts`
- `logic.test.ts`
- `types.ts`
