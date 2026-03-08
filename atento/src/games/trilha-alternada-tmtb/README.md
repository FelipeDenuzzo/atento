# Trilha Alternada 1-A-2-B (TMT-B online)

Versão digital do Trail Making Test Parte B para treino de atenção alternada (set-shifting), com sequência número-letra.

## Objetivo

- Clicar na ordem correta: `1 → A → 2 → B → 3 → C ...`
- Manter precisão e velocidade ao alternar entre categorias.

## Fluxo

1. Tela inicial com instruções.
2. Treino curto de familiarização (não válido).
3. Fase válida principal.
4. Resultado final com exportação em TXT/JSON/CSV.

## Regra de erro

- Padrão: `back-step` com recuo de 1 passo.
- Em erro, o jogo recua para o item anterior e exige retomada da trilha.

## Métricas

- Tempo total da fase válida.
- Número total de erros.
- Erros quando o alvo esperado era número.
- Erros quando o alvo esperado era letra.
- Quantidade de recuos aplicados.
- Pontuação final derivada de acurácia e velocidade.
