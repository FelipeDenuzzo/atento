# Classificação Rápida + Memória Atualizável

Treino de atenção dividida com duas tarefas simultâneas via teclado:

- **Tarefa A (classificação rápida):** responder imediatamente ao estímulo atual pela regra da fase.
- **Tarefa B (memória atualizável):** manter informação ativa e responder checagens pontuais.

## Arquivos

- `ClassificacaoRapidaMemoriaAtualizavelGame.tsx`: interface, loop e fluxo por fases.
- `logic.ts`: regras puras de estímulo, memória, checagem e pontuação.
- `types.ts`: contratos de configuração, runtime e resultados.
- `logic.test.ts`: testes unitários dos fluxos principais.

## Funções principais

- `startSession()`
- `spawnStimulus()`
- `validateClassificationAnswer()`
- `updateMemoryState()`
- `triggerMemoryCheck()`
- `validateMemoryCheckAnswer()`
- `computeScores()`
- `exportTXT()`
- `exportJSON()`
- `exportCSV()`

## Score

- Classificação: acurácia + bônus leve de velocidade com penalidade por erro/omissão.
- Memória: acerto nas checagens + bônus leve de velocidade com penalidade por erro.
- Final: **50% classificação + 50% memória**.
