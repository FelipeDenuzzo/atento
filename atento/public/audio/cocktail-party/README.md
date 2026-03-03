# Áudios esperados - Escuta Seletiva (Cocktail Party)

Coloque nesta pasta os arquivos usados pelo minijogo `EscutaSeletivaCocktailParty`.

## Estrutura esperada

### Vozes (números de 0 a 9)
- `0_masc.mp3` ... `9_masc.mp3`
- `0_femi.mp3` ... `9_femi.mp3`

### Ruído de fundo (fase 3)
- `ruido_festa_1.mp3`
- `ruido_festa_2.mp3`

## Observações
- Os nomes devem bater exatamente com o esperado no código.
- Caminho público no app: `/audio/cocktail-party/<nome-do-arquivo>.mp3`.
- Se algum arquivo não existir, o jogo mostra aviso de áudio indisponível para aquela rodada.
- Não é esperado nenhum arquivo de instrução do tipo `instrucao_foco_feminina.mp3`.
