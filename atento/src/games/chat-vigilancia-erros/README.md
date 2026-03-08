# Chat Simulado + Vigilância de Erros

Treino de atenção dividida com duas tarefas simultâneas:

- **Tarefa A (chat):** responder mensagens curtas escolhendo opção adequada.
- **Tarefa B (vigilância):** detectar anomalias visuais no fundo e responder com `Espaço`.

## Estrutura

- `ChatVigilanciaErrosGame.tsx`: UI e fluxo por fases.
- `logic.ts`: regras puras de mensagens, anomalias e métricas.
- `types.ts`: contratos de runtime, eventos e resultados.
- `logic.test.ts`: testes de fluxo, resposta e consolidação.

## Funções principais

- `startRound()`
- `spawnChatMessage()`
- `handleChatResponse()`
- `spawnAnomaly()`
- `handleAnomalyKeyPress()`
- `computeMetrics()`
- `exportJSON()`
- `exportCSV()`

## Resultado final

- Acerto e tempo de resposta do chat.
- Taxa de detecção e tempo de reação para anomalias.
- Falsos alarmes, omissões e conflitos temporais.
- Dual score combinado e tendência início/fim.
