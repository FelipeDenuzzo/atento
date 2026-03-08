# Caça-Palavras Longos

## Objetivo

Treino de atenção sustentada com tarefa prolongada de busca visual: localizar palavras em grades grandes mantendo constância de foco e precisão.

## Fluxo

- Intro com instruções e início do treino.
- Rodadas progressivas fixas (12x12, 14x14, 18x18, 20x20).
- Seleção de palavras por início/fim (clique e arrasto suportados).
- Resultado final agregado com métricas de desempenho e exportação TXT/JSON/CSV.

## Funções principais (logic)

- `generateGrid()`
- `placeWords()`
- `handleSelection()`
- `computeMetrics()`
- `exportCSV()`
- `exportJSON()`

## Arquivos

- `CacaPalavrasLongosGame.tsx`
- `logic.ts`
- `types.ts`
- `logic.test.ts`
