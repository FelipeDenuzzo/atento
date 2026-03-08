# Cópia de Matrizes

## Objetivo

Treino de atenção sustentada por monotonia e precisão: copiar uma matriz modelo para uma matriz de resposta, mantendo foco contínuo.

## Fluxo

- Tela inicial com configurações da rodada.
- Execução com modelo à esquerda e cópia à direita.
- Controles de iniciar, pausar/retomar, reiniciar e finalizar.
- Resultado final com métricas e exportação JSON/CSV.

## Funções principais

- `generateModelGrid()` em `logic.ts`
- `renderGrid()` em `CopiaMatrizesGame.tsx`
- `computeMetrics()` em `logic.ts`
- `exportCSV()` em `logic.ts`
- `exportJSON()` em `logic.ts`

## Arquivos

- `CopiaMatrizesGame.tsx`
- `logic.ts`
- `logic.test.ts`
- `types.ts`
