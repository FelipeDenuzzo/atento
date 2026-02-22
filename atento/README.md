# ATENTO

Aplicação web para treino de atenção com foco em quatro tipos:

- seletiva
- sustentada
- dividida
- alternada (shifting)

## O que já está pronto

- apresentação inicial do jogo
- dois formatos de treino:
	- ciclo misto (um exercício por tipo)
	- sequência focada (vários exercícios do mesmo tipo)
- orientações antes de cada exercício e mudança de tipo
- pontuação total ao final da sessão

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS

## Estrutura base

- `src/app` páginas e layout
- `src/components/AttentionTrainingGame.tsx` fluxo principal do jogo
- `src/data/trainingPlans.ts` dados dos exercícios e planos de treino
- `src/types/game.ts` tipos de domínio

## Rodar localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

## Publicar no GitHub

Dentro da pasta do projeto:

```bash
git init
git add .
git commit -m "chore: estrutura inicial do projeto ATENTO"
git branch -M main
git remote add origin <URL_DO_REPOSITORIO>
git push -u origin main
```
