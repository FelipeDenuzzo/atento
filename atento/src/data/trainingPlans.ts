import { AttentionType, TrainingPlan } from "@/types/game";
import {
  ENABLE_COLOR_FILTER_WITH_SOUND,
  ENABLE_COUNTING_FLOW_TASK,
  ENABLE_COPY_MATRICES,
  ENABLE_CHAT_ERROR_VIGILANCE,
  ENABLE_DRIVE_WORD_TARGET,
  ENABLE_SYMBOL_MAP_SOUND_MONITOR,
  ENABLE_RAPID_CLASSIFICATION_MEMORY,
  ENABLE_COLOR_SHAPE_SWITCH,
  ENABLE_POSITION_RULE_SWITCH,
  ENABLE_REVERSAL_GO_NOGO_SWITCH,
  ENABLE_TRILHA_ALTERNADA_TMTB,
  ENABLE_LONG_WORD_SEARCH,
  ENABLE_RADAR_TONE,
  ENABLE_MATRIX_SYMBOL_SEARCH,
  ENABLE_FIND_MISSING_ITEM,
  ENABLE_LONG_MAZES,
  ENABLE_SYMBOL_MAP,
} from "@/config/features";

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
      ...(ENABLE_SYMBOL_MAP
        ? [
            {
              id: "mix-5",
              title: "Mapa de Símbolos (Symbol Matching)",
              attentionType: "seletiva" as const,
              kind: "symbol-map" as const,
              instructions:
                "Encontre e marque todos os símbolos-alvo na grade o mais rápido possível.",
              startingLevel: 1,
              maxLevelHint: 4,
              points: 30,
            },
          ]
        : []),
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
        title: "Destaque o alvo - Fase 1",
        attentionType: "seletiva",
        kind: "quiz",
        question: "Qual opção corresponde exatamente ao alvo 'AZUL'?",
        options: ["AZUL", "AZUI", "A Z U L", "AZUL!"],
        correctOptionIndex: 0,
        points: 25,
      },
      {
        id: "sel-2",
        title: "Destaque o alvo - Fase 2",
        attentionType: "seletiva",
        kind: "quiz",
        question: "Qual opção é idêntica a 'B7K2'?",
        options: ["B7K2", "B7KZ", "87K2", "B7K-2"],
        correctOptionIndex: 0,
        points: 25,
      },
      {
        id: "sel-3",
        title: "Destaque o alvo - Fase 3",
        attentionType: "seletiva",
        kind: "quiz",
        question: "Qual item aparece apenas uma vez?",
        options: ["XXQ", "XXQ", "XQX", "XXQ"],
        correctOptionIndex: 2,
        points: 25,
      },
      {
        id: "sel-4",
        title: "Destaque o alvo - Fase 4",
        attentionType: "seletiva",
        kind: "quiz",
        question: "Qual palavra está correta?",
        options: ["ATENSAO", "ATENÇÃO", "ATENCAO", "ATENÇAO"],
        correctOptionIndex: 1,
        points: 25,
      },
      {
        id: "sel-5",
        title: "Destaque o alvo - Fase 5",
        attentionType: "seletiva",
        kind: "quiz",
        question: "Qual sequência contém apenas números pares?",
        options: ["2486", "2469", "2245", "8427"],
        correctOptionIndex: 0,
        points: 25,
      },
      {
        id: "sel-6",
        title: "Destaque o alvo - Fase 6",
        attentionType: "seletiva",
        kind: "quiz",
        question: "Qual código tem todas as letras maiúsculas?",
        options: ["abc123", "ABC123", "Abc123", "aBc123"],
        correctOptionIndex: 1,
        points: 25,
      },
      {
        id: "sel-7",
        title: "Destaque o alvo - Fase 7",
        attentionType: "seletiva",
        kind: "quiz",
        question: "Qual email está escrito corretamente?",
        options: ["usuario@email.com", "usuario.@email.com", "usuario@email,com", "usuario@@email.com"],
        correctOptionIndex: 0,
        points: 25,
      },
      {
        id: "sel-8",
        title: "Destaque o alvo - Fase 8",
        attentionType: "seletiva",
        kind: "quiz",
        question: "Qual imagem não repete nenhuma outra?",
        options: ["●◐◑", "●◐◑", "●◐◐", "●◐◑"],
        correctOptionIndex: 2,
        points: 25,
      },
      {
        id: "sel-9",
        title: "Destaque o alvo - Fase 9",
        attentionType: "seletiva",
        kind: "quiz",
        question: "Qual número começa com 5 e termina com 8?",
        options: ["5678", "5348", "5388", "5008"],
        correctOptionIndex: 2,
        points: 25,
      },
      {
        id: "sel-10",
        title: "Destaque o alvo - Fase 10",
        attentionType: "seletiva",
        kind: "quiz",
        question: "Qual letra aparece 3 vezes?",
        options: ["AABCAADA", "AABBAADA", "AABBAABA", "AABBBAAA"],
        correctOptionIndex: 2,
        points: 25,
      },
      {
        id: "sel-11",
        title: "Destaque o alvo - Fase 11",
        attentionType: "seletiva",
        kind: "quiz",
        question: "Qual padrão é único?",
        options: ["■□■", "■□■", "■□□", "■□■"],
        correctOptionIndex: 2,
        points: 25,
      },
      {
        id: "sel-12",
        title: "Destaque o alvo - Fase 12",
        attentionType: "seletiva",
        kind: "quiz",
        question: "Qual símbolo diferente dos outros?",
        options: ["@ @ ©", "@ @ @", "@ © @", "@ @ @"],
        correctOptionIndex: 1,
        points: 25,
      },
      {
        id: "sel-13",
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
        id: "sel-14",
        title: "Flanker — Seta Central",
        attentionType: "seletiva",
        kind: "flanker",
        instructions:
          "Indique a direcao da seta central ignorando as laterais.",
        startingLevel: 1,
        maxLevelHint: 6,
        points: 30,
      },
      {
        id: "sel-15",
        title: "Stroop Invertido",
        attentionType: "seletiva",
        kind: "stroop",
        instructions:
          "Clique na cor da tinta, nao na palavra escrita.",
        startingLevel: 1,
        maxLevelHint: 8,
        points: 30,
      },
      {
        id: "sel-16",
        title: "Escuta Seletiva (Cocktail Party)",
        attentionType: "seletiva",
        kind: "cocktail-party",
        instructions:
          "Identifique o nome alvo em meio a falas simultaneas.",
        startingLevel: 1,
        maxLevelHint: 12,
        points: 30,
      },
      {
        id: "sel-18",
        title: "Go / No-Go",
        attentionType: "seletiva",
        kind: "go-no-go-expandido",
        instructions:
          "Clique ou pressione ESPAÇO apenas quando aparecer o tipo de item indicado. Não faça nada quando aparecer outro tipo.",
        startingLevel: 1,
        maxLevelHint: 3,
        points: 30,
      },
      ...(ENABLE_COLOR_FILTER_WITH_SOUND
        ? [
            {
              id: "sel-19",
              title: "Filtro de Cores com Som",
              attentionType: "seletiva" as const,
              kind: "filtro-cores-com-som" as const,
              instructions:
                "Clique apenas nas formas da cor anunciada. Ignore as outras cores.",
              startingLevel: 1,
              maxLevelHint: 4,
              points: 30,
            },
          ]
        : []),
      ...(ENABLE_SYMBOL_MAP
        ? [
            {
              id: "sel-20",
              title: "Mapa de Símbolos (Symbol Matching)",
              attentionType: "seletiva" as const,
              kind: "symbol-map" as const,
              instructions:
                "Mantenha o símbolo-alvo em mente e marque todas as ocorrências na grade.",
              startingLevel: 1,
              maxLevelHint: 4,
              points: 30,
            },
          ]
        : []),
    ],
  },
  ...(ENABLE_COUNTING_FLOW_TASK ||
  ENABLE_LONG_MAZES ||
  ENABLE_MATRIX_SYMBOL_SEARCH ||
  ENABLE_FIND_MISSING_ITEM ||
  ENABLE_COPY_MATRICES ||
  ENABLE_LONG_WORD_SEARCH
    ? [
        {
          id: "foco-sustentada",
          name: "Sequência focada",
          description:
            "Exercícios dedicados de atenção sustentada para manter foco contínuo em tarefas prolongadas.",
          exercises: [
            {
              id: "sust-1",
              title: "Contagem de Estímulos em Fluxo",
              attentionType: "sustentada" as const,
              kind: "counting-flow-task" as const,
              instructions:
                "Conte mentalmente quantas vezes o alvo aparece. Não clique durante a sequência; responda apenas ao final.",
              startingLevel: 1,
              maxLevelHint: 3,
              points: 30,
            },
            ...(ENABLE_LONG_MAZES
              ? [
                  {
                    id: "sust-2",
                    title: "Labirintos Prolongados",
                    attentionType: "sustentada" as const,
                    kind: "long-mazes" as const,
                    instructions:
                      "Navegue do início ao fim sem perder o foco no percurso, mantendo atenção contínua por tempo prolongado.",
                    startingLevel: 1,
                    maxLevelHint: 4,
                    points: 30,
                  },
                ]
              : []),
            ...(ENABLE_MATRIX_SYMBOL_SEARCH
              ? [
                  {
                    id: "sust-3",
                    title: "Busca de Símbolos em Matriz",
                    attentionType: "sustentada" as const,
                    kind: "symbol-matrix-search" as const,
                    instructions:
                      "Marque todos os alvos na matriz por varredura sistemática, mantendo atenção contínua durante toda a tarefa.",
                    startingLevel: 1,
                    maxLevelHint: 1,
                    points: 30,
                  },
                ]
              : []),
            ...(ENABLE_FIND_MISSING_ITEM
              ? [
                  {
                    id: "sust-4",
                    title: "Achar o Faltando",
                    attentionType: "sustentada" as const,
                    kind: "find-missing-item" as const,
                    instructions:
                      "Compare duas grades quase iguais e encontre o item faltando ou extra, mantendo varredura visual contínua.",
                    startingLevel: 1,
                    maxLevelHint: 1,
                    points: 30,
                  },
                ]
              : []),
            ...(ENABLE_COPY_MATRICES
              ? [
                  {
                    id: "sust-5",
                    title: "Cópia de Matrizes",
                    attentionType: "sustentada" as const,
                    kind: "copy-matrices" as const,
                    instructions:
                      "Copie a matriz modelo com precisão e constância, mantendo foco contínuo durante toda a rodada.",
                    startingLevel: 1,
                    maxLevelHint: 1,
                    points: 30,
                  },
                ]
              : []),
            ...(ENABLE_LONG_WORD_SEARCH
              ? [
                  {
                    id: "sust-6",
                    title: "Caça-Palavras Longos",
                    attentionType: "sustentada" as const,
                    kind: "long-word-search" as const,
                    instructions:
                      "Encontre palavras longas em grades progressivamente maiores mantendo foco contínuo e precisão até o final.",
                    startingLevel: 1,
                    maxLevelHint: 1,
                    points: 30,
                  },
                ]
              : []),
          ],
        },
      ]
    : []),
  ...(ENABLE_RADAR_TONE || ENABLE_DRIVE_WORD_TARGET || ENABLE_CHAT_ERROR_VIGILANCE || ENABLE_SYMBOL_MAP_SOUND_MONITOR || ENABLE_RAPID_CLASSIFICATION_MEMORY
    ? [
        {
          id: "foco-dividida",
          name: "Sequência focada",
          description:
            "Exercícios dedicados de atenção dividida para sustentar desempenho simultâneo em duas tarefas.",
          exercises: [
            ...(ENABLE_RADAR_TONE
              ? [
                  {
                    id: "div-1",
                    title: "Radar e Tom",
                    attentionType: "dividida" as const,
                    kind: "radar-tone" as const,
                    instructions:
                      "Mantenha o cursor sobre o ponto móvel enquanto responde tons graves/agudos com teclas diferentes.",
                    startingLevel: 1,
                    maxLevelHint: 1,
                    points: 30,
                  },
                ]
              : []),
            ...(ENABLE_DRIVE_WORD_TARGET
              ? [
                  {
                    id: "div-3",
                    title: "Dirija + Palavras-Alvo",
                    attentionType: "dividida" as const,
                    kind: "drive-word-target" as const,
                    instructions:
                      "Mantenha o marcador na faixa e pressione espaço apenas quando a palavra-alvo estiver visível.",
                    startingLevel: 1,
                    maxLevelHint: 1,
                    points: 30,
                  },
                ]
              : []),
            ...(ENABLE_CHAT_ERROR_VIGILANCE
              ? [
                  {
                    id: "div-4",
                    title: "Chat + Vigilância de Erros",
                    attentionType: "dividida" as const,
                    kind: "chat-error-vigilance" as const,
                    instructions:
                      "Responda mensagens do chat enquanto detecta anomalias visuais no fundo com a tecla espaço.",
                    startingLevel: 1,
                    maxLevelHint: 1,
                    points: 30,
                  },
                ]
              : []),
            ...(ENABLE_SYMBOL_MAP_SOUND_MONITOR
              ? [
                  {
                    id: "div-5",
                    title: "Mapa de Símbolos + Monitor de Som",
                    attentionType: "dividida" as const,
                    kind: "symbol-map-sound-monitor" as const,
                    instructions:
                      "Clique rapidamente no símbolo-alvo correto enquanto monitora glitches sonoros com a tecla espaço.",
                    startingLevel: 1,
                    maxLevelHint: 1,
                    points: 30,
                  },
                ]
              : []),
            ...(ENABLE_RAPID_CLASSIFICATION_MEMORY
              ? [
                  {
                    id: "div-6",
                    title: "Classificação Rápida + Memória Atualizável",
                    attentionType: "dividida" as const,
                    kind: "rapid-classification-updatable-memory" as const,
                    instructions:
                      "Classifique rapidamente cada estímulo enquanto atualiza memória ativa para responder checagens pontuais.",
                    startingLevel: 1,
                    maxLevelHint: 1,
                    points: 30,
                  },
                ]
              : []),
          ],
        },
      ]
    : []),
  ...(ENABLE_COLOR_SHAPE_SWITCH || ENABLE_POSITION_RULE_SWITCH || ENABLE_REVERSAL_GO_NOGO_SWITCH || ENABLE_TRILHA_ALTERNADA_TMTB
    ? [
        {
          id: "foco-alternada",
          name: "Sequência focada",
          description:
            "Exercícios dedicados de atenção alternada para alternar regras por contexto e posição.",
          exercises: [
            ...(ENABLE_COLOR_SHAPE_SWITCH
              ? [
                  {
                    id: "alt-1",
                    title: "Cor-ou-Forma (Color/Shape Switch)",
                    attentionType: "alternada" as const,
                    kind: "color-shape-switch" as const,
                    instructions:
                      "Use o cue de fundo para alternar rapidamente entre responder à cor ou à forma do estímulo.",
                    startingLevel: 1,
                    maxLevelHint: 1,
                    points: 30,
                  },
                ]
              : []),
            ...(ENABLE_POSITION_RULE_SWITCH
              ? [
                  {
                    id: "alt-2",
                    title: "Topo/Baixo — Position-Rule Switch",
                    attentionType: "alternada" as const,
                    kind: "top-bottom-position-rule-switch" as const,
                    instructions:
                      "Estímulo no topo ativa Regra A; estímulo embaixo ativa Regra B. Alterne rapidamente entre regras.",
                    startingLevel: 1,
                    maxLevelHint: 1,
                    points: 30,
                  },
                ]
              : []),
            ...(ENABLE_REVERSAL_GO_NOGO_SWITCH
              ? [
                  {
                    id: "alt-3",
                    title: "Reversal Go/No-Go Switch",
                    attentionType: "alternada" as const,
                    kind: "reversal-go-nogo-switch" as const,
                    instructions:
                      "Cue NORMAL ou INVERTIDO define se a estrela exige clique ou inibição. Alterne rapidamente entre regras.",
                    startingLevel: 1,
                    maxLevelHint: 1,
                    points: 30,
                  },
                ]
              : []),
            ...(ENABLE_TRILHA_ALTERNADA_TMTB
              ? [
                  {
                    id: "alt-4",
                    title: "Trilha Alternada 1-A-2-B (TMT-B)",
                    attentionType: "alternada" as const,
                    kind: "trilha-alternada-tmtb" as const,
                    instructions:
                      "Conecte círculos na ordem alternada 1-A-2-B... o mais rápido e corretamente possível.",
                    startingLevel: 1,
                    maxLevelHint: 1,
                    points: 30,
                  },
                ]
              : []),
          ],
        },
      ]
    : []),
];

export const formatAttentionType = (type: AttentionType): string =>
  typeLabel[type];
