import { AttentionType, TrainingPlan } from "@/types/game";

const typeLabel: Record<AttentionType, string> = {
  seletiva: "Atenção seletiva",
  sustentada: "Atenção sustentada",
  dividida: "Atenção dividida",
  alternada: "Atenção alternada",
};

export const attentionTypeDescriptions: Record<AttentionType, string> = {
  seletiva: "Focar no estímulo relevante e ignorar distrações.",
  sustentada: "Manter foco estável por tempo contínuo.",
  dividida: "Responder a duas demandas ao mesmo tempo.",
  alternada: "Trocar rapidamente entre regras ou tarefas.",
};

export const trainingPlans: TrainingPlan[] = [
  {
    id: "misto",
    name: "Ciclo misto",
    description:
      "Um exercício por tipo de atenção, em sequência: seletiva, sustentada, dividida e alternada.",
    exercises: [
      {
        id: "mix-1",
        title: "Destaque o alvo",
        attentionType: "seletiva",
        kind: "quiz",
        instructions:
          "Ignore palavras parecidas e escolha apenas o item que corresponde exatamente ao alvo solicitado.",
        question: "Qual opção corresponde exatamente ao alvo 'AZUL'?",
        options: ["AZUL", "AZUI", "A Z U L", "AZUL!"],
        correctOptionIndex: 0,
        points: 25,
      },
      {
        id: "mix-2",
        title: "Stroop Invertido",
        attentionType: "sustentada",
        kind: "stroop",
        instructions:
          "Clique na cor da tinta, não na palavra escrita. Mantenha o foco e evite respostas automáticas.",
        startingLevel: 1,
        maxLevelHint: 8,
        points: 30,
      },
      {
        id: "mix-3",
        title: "Dupla checagem",
        attentionType: "dividida",
        kind: "quiz",
        instructions:
          "Considere duas pistas ao mesmo tempo: cor e forma do item descrito.",
        question:
          "Qual opção atende às duas condições: 'vermelho' e 'triângulo'?",
        options: ["círculo vermelho", "triângulo azul", "triângulo vermelho", "quadrado vermelho"],
        correctOptionIndex: 2,
        points: 25,
      },
      {
        id: "mix-4",
        title: "Troca de regra",
        attentionType: "alternada",
        kind: "quiz",
        instructions:
          "A regra mudou: agora escolha o menor valor, não o maior.",
        question: "Com a nova regra, qual é o menor número?",
        options: ["9", "4", "7", "6"],
        correctOptionIndex: 1,
        points: 25,
      },
    ],
  },
  {
    id: "foco-seletiva",
    name: "Sequência focada",
    description:
      "Vários exercícios seguidos para o mesmo tipo de atenção (seletiva), ideal para bloco de treino específico.",
    exercises: [
      {
        id: "sel-1",
        title: "Caça ao Alvo (Visual Search)",
        attentionType: "seletiva",
        kind: "visual-search",
        instructions:
          "Encontre todos os alvos combinando forma e cor em meio a distratores.",
        startingLevel: 1,
        maxLevelHint: 12,
        points: 30,
      },
      {
        id: "sel-2",
        title: "Alvo exato",
        attentionType: "seletiva",
        kind: "quiz",
        instructions:
          "Escolha apenas a opção idêntica ao modelo.",
        question: "Qual opção é idêntica a 'B7K2'?",
        options: ["B7K2", "B7KZ", "87K2", "B7K-2"],
        correctOptionIndex: 0,
        points: 20,
      },
      {
        id: "sel-3",
        title: "Ruído visual",
        attentionType: "seletiva",
        kind: "quiz",
        instructions:
          "Ignore padrões repetidos e foque no item único.",
        question: "Qual item aparece apenas uma vez?",
        options: ["XXQ", "XXQ", "XQX", "XXQ"],
        correctOptionIndex: 2,
        points: 20,
      },
      {
        id: "sel-4",
        title: "Leitura precisa",
        attentionType: "seletiva",
        kind: "quiz",
        instructions:
          "Observe cada letra com atenção para evitar confusão entre termos próximos.",
        question: "Qual palavra está correta?",
        options: ["ATENSAO", "ATENÇÃO", "ATENCAO", "ATENÇAO"],
        correctOptionIndex: 1,
        points: 20,
      },
      {
        id: "sel-5",
        title: "Último filtro",
        attentionType: "seletiva",
        kind: "quiz",
        instructions:
          "Mantenha o foco e escolha a única opção com todos os dígitos pares.",
        question: "Qual sequência contém apenas números pares?",
        options: ["2486", "2469", "2245", "8427"],
        correctOptionIndex: 0,
        points: 20,
      },
    ],
  },
];

export const formatAttentionType = (type: AttentionType): string =>
  typeLabel[type];