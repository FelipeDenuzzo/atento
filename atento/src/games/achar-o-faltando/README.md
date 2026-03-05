# Achar o Faltando

## Objetivo

Comparar duas grades (ou listas) muito parecidas e encontrar o item faltando ou extra, mantendo foco contínuo em tarefa repetitiva de comparação visual.

## Fluxo

- Tela inicial com configurações completas da sessão.
- Rodadas de comparação em modo lado a lado ou alternância A/B.
- Resposta por clique direto na diferença ou por seleção de item.
- Feedback resumido por rodada com destaque breve das diferenças.
- Resultado final com métricas e exportação em JSON/CSV.

## Configurações

- Modo de apresentação: `side-by-side` ou `alternating`.
- Formato: `list` (1 coluna) ou `grid` (`8x8`, `10x10`, `12x12`).
- Tipo de item: `numbers`, `letters`, `symbols`.
- Tipo de diferença: `missing`, `extra`, `mixed`.
- Quantidade de diferenças por rodada: `1`, `2`, `3`.
- Duração total: `60` a `240` segundos.
- Quantidade de rodadas: padrão `10`.
- Seed opcional para reprodutibilidade.

## Funções principais

- `generateRound()` em `logic.ts`
- `computeMetrics()` em `logic.ts`
- `exportCSV()` em `logic.ts`

## Arquivos

- `AcharOFaltandoGame.tsx`
- `logic.ts`
- `logic.test.ts`
- `types.ts`
