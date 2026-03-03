# Go/No-Go

Módulo de treino de atenção seletiva e controle inibitório.

## Como habilitar

Este jogo só aparece quando a feature flag está ativa:

```bash
NEXT_PUBLIC_ENABLE_GONOGO_EXPANDIDO=true
```

Exemplo no terminal:

```bash
NEXT_PUBLIC_ENABLE_GONOGO_EXPANDIDO=true npm run dev
```

## Como funciona

O jogador deve clicar (ou pressionar ESPAÇO) apenas quando aparecer o tipo de item indicado no início de cada nível. O tipo alvo é escolhido aleatoriamente entre **FRUTAS** ou **OBJETOS** para cada sessão.

### Progressão de Níveis

- **Nível 1**: 15 itens, 1 item por vez
- **Nível 2**: 25 itens, 1 item por vez
- **Nível 3**: 35 itens, até 3 itens simultâneos (só clique se TODOS forem do tipo alvo)

### Controles

- Clique do mouse
- Tecla ESPAÇO

## Configuração padrão

- Duração aproximada: 7 min (`sessionTargetMinutes`)
- Trials por nível: 15 / 25 / 35
- Proporção Go/No-Go: 60/40, 60/40, 55/45
- Exposição: 1500ms / 1300ms / 1200ms
- ITI: 800ms / 700ms / 600ms
- Feedback: minimalista (vibração para erros)

As configurações ficam em:

- `src/games/go-no-go-expandido/logic.ts`

## Métricas registradas

- Acertos Go e No-Go
- Erros de comissão e omissão
- Tempo de reação médio e mediana
- Nível e configuração do bloco
- Data/hora

Persistência local:

- `localStorage` key: `atento.goNoGoExpandido.logs`
