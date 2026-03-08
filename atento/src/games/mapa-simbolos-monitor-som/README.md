# Mapa de Símbolos + Monitor de Som

Treino de atenção dividida em duas tarefas simultâneas:

- **Tarefa visual:** matching rápido de símbolo-alvo em grade.
- **Tarefa auditiva:** monitoramento contínuo de som com detecção de glitch.

## Arquivos

- `MapaSimbolosMonitorSomGame.tsx`: interface e fluxo por fases.
- `logic.ts`: regras puras, estados de rodada e pontuação.
- `types.ts`: contratos de dados.
- `logic.test.ts`: testes de fluxo e score.

## Funções principais

- `startSession()`
- `spawnVisualRound()`
- `validateSymbolClick()`
- `startContinuousAudio()`
- `scheduleGlitches()`
- `handleGlitchResponse()`
- `computeScores()`
- `exportTXT()`
- `exportJSON()`
- `exportCSV()`

## Score

- Visual: acurácia + velocidade com penalidade por omissão.
- Auditivo: detecção + tempo de reação com penalidade por falso alarme.
- Final: **50% visual + 50% auditivo**.
