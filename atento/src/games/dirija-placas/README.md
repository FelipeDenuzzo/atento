# Dirija + Placas

Treino de atenção dividida com duas tarefas simultâneas:

- **Tarefa A (contínua):** manter o carro dentro da faixa usando `←/→` ou `A/D`.
- **Tarefa B (eventual):** pressionar `Espaço` apenas quando a placa-alvo estiver visível.

## Estrutura

- `DirijaPlacasGame.tsx`: interface e loop principal de jogo.
- `logic.ts`: regras puras de atualização, eventos e métricas.
- `types.ts`: contratos de configuração, runtime e resultado.
- `logic.test.ts`: testes unitários de fluxo e regras principais.

## Regras resumidas

- Cada sessão tem 4 fases com progressão de dificuldade.
- O jogo não pausa para responder às placas.
- Métricas detalhadas aparecem apenas no final da última fase.
- Exportações disponíveis: `.txt`, JSON e CSV.

## Métricas finais

- Percentual e tempo na faixa.
- Alvos apresentados, acertos, falsos positivos, omissões.
- Taxa de acerto de placas.
- Dual score combinado e tendência início/fim.
