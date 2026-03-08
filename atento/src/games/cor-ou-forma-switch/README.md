# Cor-ou-Forma (Color/Shape Switch)

Treino de atenção alternada (task switching): o participante alterna entre responder COR e responder FORMA conforme o cue visual.

## Regras

- Fundo azul: responder **COR** (`J` vermelho, `K` azul)
- Fundo cinza: responder **FORMA** (`A` círculo, `S` quadrado)

A regra alterna por blocos pseudoaleatórios de 1 a 3 trials.

## Estrutura

- `CorOuFormaSwitchGame.tsx`: fluxo das fases, trial loop e UI
- `logic.ts`: geração da sequência, validação, métricas e export
- `types.ts`: tipos de trial/runtime/sessão
- `logic.test.ts`: testes de sequência, validação, omissão e métricas

## Métricas

- Acurácia total
- RT médio
- RT médio em repetição vs troca
- Erro em repetição vs troca
- Switch cost
