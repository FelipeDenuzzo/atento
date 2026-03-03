# Filtro de Cores com Som

Jogo de atencao seletiva com pista auditiva. O jogador deve clicar apenas nas formas da cor-alvo anunciada, ignorando as demais.

## Como habilitar

Defina a feature flag:

```bash
NEXT_PUBLIC_ENABLE_COLOR_FILTER_WITH_SOUND=true
```

## Regras

- Formas coloridas caem do topo da tela.
- O alvo muda em intervalos configuraveis com instrucao sonora.
- Clique somente na cor-alvo atual.

## Configuracao de niveis

Os parametros por nivel estao em:

- `src/games/filtro-cores-com-som/levels.ts`

## Persistencia

Resultados sao salvos em:

- `localStorage` key: `atento.filtroCoresComSom.logs`
