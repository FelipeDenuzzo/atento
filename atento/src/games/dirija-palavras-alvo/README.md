# Dirija + Palavras-Alvo

Treino de atenção dividida visual-visual com duas tarefas simultâneas:

- **Tarefa A (contínua):** manter o marcador dentro de uma faixa móvel horizontal.
- **Tarefa B (eventual):** pressionar `Espaço` quando a palavra-alvo estiver visível.

## Estrutura

- `DirijaPalavrasAlvoGame.tsx`: interface, loop de frame e fluxo de fases.
- `logic.ts`: regras puras e funções de atualização/exportação.
- `types.ts`: contratos de configuração, runtime e resultados.
- `logic.test.ts`: validação de fluxo, faixa, respostas e métricas.

## Funções principais

- `startRound()`
- `stopRound()`
- `updateFrame()`
- `updateBandAndMarker()`
- `spawnWordBlock()`
- `updateWordBlocks()`
- `handleKeyDown()`
- `computeMetrics()`
- `exportJSON()`
- `exportCSV()`

## Saída final

- Percentual de tempo dentro da faixa.
- Tempo dentro/fora em segundos.
- Total de blocos, total de alvos, acertos, falsos positivos e omissões.
- Taxa de acerto e dual score médio.
- Exportação em `.txt`, JSON e CSV.
