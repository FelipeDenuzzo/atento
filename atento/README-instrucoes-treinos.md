# Padrão para Telas de Instrução dos Treinos

## Objetivo
Padronizar e facilitar a criação/edição das telas iniciais (instruções) de cada treino, garantindo consistência visual e de experiência.

---

## 1. Componente base reutilizável

Crie/edite instruções usando o componente base:

```tsx
import { InstructionScreen } from "@/components/InstructionScreen";

export function NomeDoTreinoInstructions({ onStart }) {
  return (
    <InstructionScreen
      title="Título do Treino"
      instructions={<p>Texto de instrução...</p>}
      onStart={onStart}
    />
  );
}
```

Props disponíveis:
- `title`: string — Título do treino
- `instructions`: ReactNode — Texto ou JSX com as instruções
- `onStart`: função chamada ao clicar em "Iniciar treino"
- `extraContent?`: ReactNode — conteúdo opcional extra
- `startLabel?`: string — texto opcional do botão

---

## 2. Localização dos arquivos

Cada treino deve ter seu componente de instrução em:
```
src/games/nome-do-treino/NomeDoTreinoInstructions.tsx
```

---

## 3. Como adicionar um novo treino
1. Crie o componente de instrução conforme o exemplo acima.
2. Adicione o mapeamento do `kind` para o componente de instrução no container principal (`AttentionTrainingGame`).
3. Remova qualquer título/instrução duplicado do componente do jogo.

---

## 4. Checklist de revisão
- [ ] Só há um título na tela inicial
- [ ] O botão de iniciar e as instruções aparecem corretamente
- [ ] Não há duplicidade de informações
- [ ] Layout e estilos seguem o padrão do InstructionScreen

---

## 5. Exemplo de uso
```tsx
export function AcharOFaltandoInstructions({ onStart }) {
  return (
    <InstructionScreen
      title="Achar o Faltando"
      instructions={<p>Compare as duas grades...</p>}
      onStart={onStart}
    />
  );
}
```

---

Mantenha este padrão para facilitar manutenção e evolução do projeto.
