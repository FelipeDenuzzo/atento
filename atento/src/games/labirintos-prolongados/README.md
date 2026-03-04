# Labirintos Prolongados

## Objetivo

Treinar atenção sustentada através de navegação contínua em labirintos longos.

## Regras

- Leve o marcador do início (A) até o fim (B).
- Controles: setas do teclado ou WASD.
- Movimento é célula a célula.
- O nível termina por vitória (chegar ao fim) ou por tempo esgotado.

## Métricas

- `success`
- `elapsedMs`
- `steps`
- `revisits`
- `shortestPathLength`
- `efficiency`

## Configuração de níveis

Cada nível define:

- `width`/`height`
- `timeLimitSec`
- `minSolutionLength`

## Feature flag

Habilitar com:

`NEXT_PUBLIC_ENABLE_LONG_MAZES=true`

## Arquivos

- `LabirintosProlongadosGame.tsx`
- `levels.ts`
- `types.ts`
- `logic.ts`
- `logic.test.ts`
