# Contagem de Estímulos em Fluxo

## Objetivo

Treinar atenção sustentada com contagem mental de alvos em sequência contínua de estímulos.

## Como funciona

- O alvo é apresentado antes de iniciar (ex.: círculo vermelho).
- Durante o fluxo, o jogador não responde a cada estímulo.
- Ao final, informa quantas vezes o alvo apareceu.
- O sistema compara a resposta com o total real e calcula o erro absoluto.

## Parâmetros por nível

- `modality`: visual (estrutura pronta para auditivo)
- `totalStimuli`
- `stimulusDurationMs`
- `isiMs`
- `targetProbability`
- `targetVisual`
- `distractorVisuals`

## Métricas salvas

- `levelId`
- `actualTargetCount`
- `playerAnswer`
- `absoluteError`
- `estimationDirection`

## Feature flag

Habilite com:

`NEXT_PUBLIC_ENABLE_COUNTING_FLOW_TASK=true`

## Arquivos

- `ContagemEstimulosFluxoGame.tsx`
- `levels.ts`
- `logic.ts`
- `logic.test.ts`
- `types.ts`
