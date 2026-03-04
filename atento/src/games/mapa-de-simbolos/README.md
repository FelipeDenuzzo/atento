# Mapa de Símbolos (Symbol Matching)

## Objetivo

Treinar atenção seletiva visual e varredura sistemática ao encontrar todos os símbolos-alvo em uma grade com distratores.

## Regras

- O(s) símbolo(s)-alvo aparecem no topo.
- Clique em todas as ocorrências do alvo na grade.
- Clique em distrator conta erro.
- Clique repetido em alvo já encontrado é neutro.
- A fase termina ao encontrar todos os alvos ou por tempo esgotado.

## Progressão

- Nível 1: 5x5, 1 alvo, símbolos distintos.
- Nível 2: 6x6, 1 alvo, similaridade maior.
- Nível 3: 7x7, 1 alvo, mais carga visual e menos tempo.
- Nível 4: 8x8, 2 alvos simultâneos.

## Métricas

- Tempo gasto
- Total de alvos
- Alvos encontrados
- Erros
- Precisão
- Resultado por alvo (no nível de 2 alvos)

## Feature flag

Ativar com:

`NEXT_PUBLIC_ENABLE_SYMBOL_MAP=true`

## Arquivos

- `MapaDeSimbolosGame.tsx`
- `levels.ts`
- `logic.ts`
- `logic.test.ts`
- `types.ts`
