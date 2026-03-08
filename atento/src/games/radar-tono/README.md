# Radar + Tono

Treino de atenção dividida em dupla tarefa visual + auditiva.

## Objetivo

Manter o cursor sobre um ponto móvel no radar enquanto responde tons graves/agudos com teclas diferentes.

## Fluxo

- Fases fixas progressivas (sem configuração manual).
- Durante a fase: foco total nas duas tarefas, sem métricas intermediárias.
- Entre fases: transição simples.
- Resultado consolidado apenas ao final da última fase.

## Funções de lógica

- `startRound()`
- `updateRadar()`
- `scheduleTones()`
- `handleKeyPress()`
- `computeMetrics()`
- `exportJSON()`
- `exportCSV()`

## Arquivos

- `RadarTonoGame.tsx`
- `logic.ts`
- `types.ts`
- `logic.test.ts`
