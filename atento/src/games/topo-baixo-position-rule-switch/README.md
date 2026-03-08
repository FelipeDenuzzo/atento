# Topo/Baixo — Position-Rule Switch

Treino de atenção alternada (task switching) em que a posição vertical do estímulo define a regra ativa.

## Regras

- **Topo**: aplica Regra A.
- **Baixo**: aplica Regra B.
- Exemplo padrão:
  - Regra A (cor): azul=`A`, verde=`S`
  - Regra B (forma): quadrado=`K`, retângulo=`L`

## Estrutura

- `TopoBaixoPositionRuleSwitchGame.tsx`: fluxo de fases, loop de trial e UI.
- `logic.ts`: geração de sequência, validação, timeout, métricas e exportações.
- `types.ts`: contratos de configuração, runtime e resultado.
- `logic.test.ts`: testes de sequência, resposta, omissão e métricas.

## Métricas principais

- Acurácia geral.
- RT médio geral e RT médio dos acertos.
- Erro e RT em repetição vs troca.
- Switch cost.
- Comparação de desempenho entre Regra A e Regra B.
