import type {
  AnomalyEvent,
  AnomalyType,
  ChatErrorRoundConfig,
  ChatErrorRoundLog,
  ChatErrorRoundMetrics,
  ChatErrorRoundRuntime,
  ChatErrorSessionResult,
  ChatMessageEvent,
  ChatOption,
} from "./types";

type MessageTemplate = {
  prompt: string;
  options: Array<{ id: string; text: string; correct?: boolean }>;
};

const MESSAGE_BANK: MessageTemplate[] = [
  {
    prompt: "Cliente: A entrega chega hoje ou amanhã?",
    options: [
      { id: "a", text: "Chega hoje até 18h.", correct: true },
      { id: "b", text: "Não sei, talvez próxima semana." },
      { id: "c", text: "Você pode cancelar sem motivo." },
      { id: "d", text: "Mande seu CPF no chat público." },
    ],
  },
  {
    prompt: "Equipe: O relatório precisa de revisão final.",
    options: [
      { id: "a", text: "Perfeito, envio a revisão agora.", correct: true },
      { id: "b", text: "Não vou revisar nada." },
      { id: "c", text: "Deixa para o mês que vem." },
    ],
  },
  {
    prompt: "Usuário: Esqueci minha senha, o que faço?",
    options: [
      { id: "a", text: "Use o link ‘Esqueci minha senha’.", correct: true },
      { id: "b", text: "Me diga sua senha antiga aqui." },
      { id: "c", text: "Não há como recuperar." },
    ],
  },
  {
    prompt: "Time: Reunião foi adiada para 16h.",
    options: [
      { id: "a", text: "Entendido, atualizo a agenda para 16h.", correct: true },
      { id: "b", text: "Ignorar aviso e manter horário." },
      { id: "c", text: "Cancelar todas as reuniões." },
    ],
  },
  {
    prompt: "Cliente: Posso trocar o item sem custo?",
    options: [
      { id: "a", text: "Sim, dentro do prazo de troca informado.", correct: true },
      { id: "b", text: "Troca só pagando multa imediata." },
      { id: "c", text: "Não existe política de troca." },
    ],
  },
  {
    prompt: "Cliente: Meu pagamento foi aprovado?",
    options: [
      { id: "a", text: "Vou confirmar no sistema e te aviso agora.", correct: true },
      { id: "b", text: "Não precisa confirmar nada." },
      { id: "c", text: "Refaça a compra três vezes." },
    ],
  },
  {
    prompt: "Equipe: Pode enviar o resumo da reunião?",
    options: [
      { id: "a", text: "Sim, envio o resumo em seguida.", correct: true },
      { id: "b", text: "Não vou compartilhar o resumo." },
      { id: "c", text: "Apago a ata para simplificar." },
    ],
  },
  {
    prompt: "Usuário: O app está lento, o que faço primeiro?",
    options: [
      { id: "a", text: "Atualize o app e reinicie para testar.", correct: true },
      { id: "b", text: "Ignore, isso passa sozinho." },
      { id: "c", text: "Desinstale sem backup." },
    ],
  },
  {
    prompt: "Cliente: Vocês atendem no fim de semana?",
    options: [
      { id: "a", text: "Atendemos nos horários informados na central.", correct: true },
      { id: "b", text: "Nunca atendemos nenhum dia." },
      { id: "c", text: "Só por mensagem privada pessoal." },
    ],
  },
  {
    prompt: "Gestor: Preciso da versão final até 17h.",
    options: [
      { id: "a", text: "Combinado, entrego a versão final até 17h.", correct: true },
      { id: "b", text: "Vou entregar quando lembrar." },
      { id: "c", text: "Não há necessidade de prazo." },
    ],
  },
  {
    prompt: "Cliente: Como acompanho meu pedido?",
    options: [
      { id: "a", text: "Use o código de rastreio no painel de pedidos.", correct: true },
      { id: "b", text: "Não existe rastreio disponível." },
      { id: "c", text: "Acompanhe apenas por telefone fixo." },
    ],
  },
  {
    prompt: "Equipe: Houve mudança no escopo do projeto.",
    options: [
      { id: "a", text: "Registro a mudança e atualizo o plano.", correct: true },
      { id: "b", text: "Ignoro para manter como estava." },
      { id: "c", text: "Apago o histórico do projeto." },
    ],
  },
  {
    prompt: "Usuário: Recebi erro ao anexar arquivo.",
    options: [
      { id: "a", text: "Verifique formato e tamanho permitidos.", correct: true },
      { id: "b", text: "Anexe qualquer arquivo sem limite." },
      { id: "c", text: "Desative antivírus e tente novamente." },
    ],
  },
  {
    prompt: "Cliente: Posso alterar o endereço de entrega?",
    options: [
      { id: "a", text: "Sim, se o pedido ainda não foi despachado.", correct: true },
      { id: "b", text: "Não, nunca é possível alterar." },
      { id: "c", text: "Só alteramos mediante foto do cartão." },
    ],
  },
  {
    prompt: "Time: O deploy falhou no ambiente de teste.",
    options: [
      { id: "a", text: "Investigo logs e informo causa e correção.", correct: true },
      { id: "b", text: "Publico em produção mesmo assim." },
      { id: "c", text: "Reinicio sem checar nada." },
    ],
  },
  {
    prompt: "Cliente: Como solicitar reembolso?",
    options: [
      { id: "a", text: "Abra solicitação no painel e acompanhe o status.", correct: true },
      { id: "b", text: "Reembolso só por mensagem em rede social." },
      { id: "c", text: "Não aceitamos nenhuma solicitação." },
    ],
  },
  {
    prompt: "Equipe: Pode revisar esse texto antes de publicar?",
    options: [
      { id: "a", text: "Sim, reviso e retorno com ajustes.", correct: true },
      { id: "b", text: "Publica sem revisar mesmo." },
      { id: "c", text: "Substitui por texto aleatório." },
    ],
  },
  {
    prompt: "Usuário: Não recebi o código de verificação.",
    options: [
      { id: "a", text: "Verifique spam e solicite novo envio.", correct: true },
      { id: "b", text: "Não temos código de verificação." },
      { id: "c", text: "Use qualquer código antigo." },
    ],
  },
  {
    prompt: "Cliente: Posso emitir segunda via da nota?",
    options: [
      { id: "a", text: "Sim, ela está disponível no histórico do pedido.", correct: true },
      { id: "b", text: "Só emitimos por telefone pessoal." },
      { id: "c", text: "Notas não podem ser reemitidas." },
    ],
  },
  {
    prompt: "Gestor: Priorizem correções críticas hoje.",
    options: [
      { id: "a", text: "Perfeito, vou priorizar os itens críticos.", correct: true },
      { id: "b", text: "Prefiro deixar para a próxima sprint." },
      { id: "c", text: "Ignoro e foco em tarefas menores." },
    ],
  },
  {
    prompt: "Cliente: Há desconto para pagamento à vista?",
    options: [
      { id: "a", text: "Consultei: as condições estão na página de pagamento.", correct: true },
      { id: "b", text: "Inventei um desconto agora para você." },
      { id: "c", text: "Desconto só para compras sem nota." },
    ],
  },
  {
    prompt: "Equipe: Precisamos alinhar prioridade com suporte.",
    options: [
      { id: "a", text: "Agendo alinhamento e compartilho decisões.", correct: true },
      { id: "b", text: "Cada time segue sem alinhamento." },
      { id: "c", text: "Removemos o canal de suporte." },
    ],
  },
  {
    prompt: "Usuário: Minha sessão caiu durante o uso.",
    options: [
      { id: "a", text: "Faça login novamente e confirme sua conexão.", correct: true },
      { id: "b", text: "Use a conta de outro usuário." },
      { id: "c", text: "Ignore alertas de segurança." },
    ],
  },
  {
    prompt: "Cliente: O item veio com defeito, e agora?",
    options: [
      { id: "a", text: "Vamos abrir a troca com prioridade.", correct: true },
      { id: "b", text: "Não tratamos defeitos após entrega." },
      { id: "c", text: "Tente consertar por conta própria." },
    ],
  },
];

function randomBetween(min: number, max: number, rng: () => number): number {
  return min + rng() * (max - min);
}

function pickAnomalyType(rng: () => number): AnomalyType {
  const roll = rng();
  if (roll < 0.34) return "prohibited-icon";
  if (roll < 0.67) return "bar-color";
  return "alert-flash";
}

function buildMessage(
  id: number,
  atMs: number,
  config: ChatErrorRoundConfig,
  rng: () => number,
): ChatMessageEvent {
  const template = MESSAGE_BANK[Math.floor(rng() * MESSAGE_BANK.length)] ?? MESSAGE_BANK[0];
  const desiredOptions = Math.max(
    2,
    Math.min(template.options.length, Math.round(randomBetween(config.chatOptionsMin, config.chatOptionsMax, rng))),
  );

  const correct = template.options.find((item) => item.correct) ?? template.options[0];
  const distractors = template.options.filter((item) => !item.correct);

  const shuffledDistractors = [...distractors].sort(() => rng() - 0.5).slice(0, Math.max(0, desiredOptions - 1));
  const selected = [correct, ...shuffledDistractors].sort(() => rng() - 0.5);

  const options: ChatOption[] = selected.map((item) => ({
    id: item.id,
    text: item.text,
    isCorrect: Boolean(item.correct),
  }));

  return {
    id,
    prompt: template.prompt,
    options,
    appearedAtMs: atMs,
    deadlineAtMs: atMs + config.chatResponseWindowMs,
  };
}

function computeRoundMetrics(round: ChatErrorRoundLog): ChatErrorRoundMetrics {
  const chatTotal = round.messages.length;
  const chatAnswered = round.messages.filter((message) => message.answeredAtMs != null).length;
  const chatCorrect = round.messages.filter((message) => message.isCorrect === true).length;
  const chatIncorrect = round.messages.filter((message) => message.answeredAtMs != null && message.isCorrect === false).length;
  const chatTimeouts = round.messages.filter((message) => message.timeout).length;

  const chatRtList = round.messages
    .filter((message) => message.responseTimeMs != null)
    .map((message) => message.responseTimeMs ?? 0);

  const chatAccuracyPercent = chatTotal > 0 ? (chatCorrect / chatTotal) * 100 : 0;
  const chatMeanResponseMs =
    chatRtList.length > 0
      ? chatRtList.reduce((sum, value) => sum + value, 0) / chatRtList.length
      : 0;

  const anomalyTotal = round.anomalies.length;
  const anomalyDetected = round.anomalies.filter((anomaly) => anomaly.detectedAtMs != null).length;
  const anomalyMissed = round.anomalies.filter((anomaly) => anomaly.missed).length;
  const anomalyReactionList = round.anomalies
    .filter((anomaly) => anomaly.reactionMs != null)
    .map((anomaly) => anomaly.reactionMs ?? 0);

  const anomalyDetectionRatePercent =
    anomalyTotal > 0 ? (anomalyDetected / anomalyTotal) * 100 : 0;
  const anomalyMeanReactionMs =
    anomalyReactionList.length > 0
      ? anomalyReactionList.reduce((sum, value) => sum + value, 0) / anomalyReactionList.length
      : 0;

  const conflictCount = round.anomalies.filter((anomaly) => anomaly.conflictWithActiveMessage).length;

  const dualScore = chatAccuracyPercent * 0.55 + anomalyDetectionRatePercent * 0.45;

  return {
    durationMs: round.config.durationMs,
    chatTotal,
    chatAnswered,
    chatCorrect,
    chatIncorrect,
    chatTimeouts,
    chatAccuracyPercent,
    chatMeanResponseMs,
    anomalyTotal,
    anomalyDetected,
    anomalyMissed,
    anomalyDetectionRatePercent,
    anomalyMeanReactionMs,
    falseAlarms: round.anomalies.reduce((sum, anomaly) => sum + anomaly.falseAlarmCountWhileActive, 0),
    conflictCount,
    dualScore,
  };
}

export function startRound(
  config: ChatErrorRoundConfig,
  rng: () => number = Math.random,
): ChatErrorRoundRuntime {
  const nextMessageAtMs = Math.round(randomBetween(800, 1800, rng));
  const nextAnomalyAtMs = Math.round(randomBetween(config.anomalyIntervalMinMs, config.anomalyIntervalMaxMs, rng));

  return {
    config,
    nextMessageAtMs,
    nextAnomalyAtMs,
    messageSeq: 1,
    anomalySeq: 1,
    currentMessage: null,
    activeAnomaly: null,
    messages: [],
    anomalies: [],
    falseAlarms: 0,
  };
}

export function spawnChatMessage(
  runtime: ChatErrorRoundRuntime,
  atMs: number,
  rng: () => number = Math.random,
): ChatMessageEvent {
  const message = buildMessage(runtime.messageSeq, atMs, runtime.config, rng);
  runtime.messageSeq += 1;
  runtime.currentMessage = message;
  runtime.messages.push(message);

  const interval = randomBetween(
    runtime.config.messageIntervalMinMs,
    runtime.config.messageIntervalMaxMs,
    rng,
  );
  runtime.nextMessageAtMs = atMs + Math.round(interval);

  return message;
}

export function handleChatResponse(params: {
  runtime: ChatErrorRoundRuntime;
  optionId: string;
  atMs: number;
}): { accepted: boolean; correct: boolean } {
  const message = params.runtime.currentMessage;
  if (!message) {
    return { accepted: false, correct: false };
  }

  if (message.answeredAtMs != null) {
    return { accepted: false, correct: false };
  }

  const option = message.options.find((item) => item.id === params.optionId);
  if (!option) {
    return { accepted: false, correct: false };
  }

  message.answeredAtMs = params.atMs;
  message.selectedOptionId = option.id;
  message.isCorrect = option.isCorrect;
  message.responseTimeMs = Math.max(0, params.atMs - message.appearedAtMs);
  params.runtime.currentMessage = null;

  return { accepted: true, correct: option.isCorrect };
}

export function spawnAnomaly(
  runtime: ChatErrorRoundRuntime,
  atMs: number,
  rng: () => number = Math.random,
): AnomalyEvent {
  const anomaly: AnomalyEvent = {
    id: runtime.anomalySeq,
    type: pickAnomalyType(rng),
    startedAtMs: atMs,
    expiresAtMs: atMs + runtime.config.anomalyVisibleMs,
    falseAlarmCountWhileActive: 0,
    conflictWithActiveMessage: runtime.currentMessage != null,
  };

  runtime.anomalySeq += 1;
  runtime.activeAnomaly = anomaly;
  runtime.anomalies.push(anomaly);

  const interval = randomBetween(
    runtime.config.anomalyIntervalMinMs,
    runtime.config.anomalyIntervalMaxMs,
    rng,
  );
  runtime.nextAnomalyAtMs = atMs + Math.round(interval);

  return anomaly;
}

export function handleAnomalyKeyPress(params: {
  runtime: ChatErrorRoundRuntime;
  atMs: number;
}): { detected: boolean; falseAlarm: boolean } {
  const active = params.runtime.activeAnomaly;
  if (!active) {
    params.runtime.falseAlarms += 1;
    return { detected: false, falseAlarm: true };
  }

  if (params.atMs > active.expiresAtMs) {
    params.runtime.falseAlarms += 1;
    return { detected: false, falseAlarm: true };
  }

  if (active.detectedAtMs != null) {
    active.falseAlarmCountWhileActive += 1;
    params.runtime.falseAlarms += 1;
    return { detected: false, falseAlarm: true };
  }

  active.detectedAtMs = params.atMs;
  active.reactionMs = Math.max(0, params.atMs - active.startedAtMs);
  params.runtime.activeAnomaly = null;
  return { detected: true, falseAlarm: false };
}

export function updateRuntime(
  runtime: ChatErrorRoundRuntime,
  elapsedMs: number,
  rng: () => number = Math.random,
): void {
  if (runtime.activeAnomaly && elapsedMs > runtime.activeAnomaly.expiresAtMs) {
    if (runtime.activeAnomaly.detectedAtMs == null) {
      runtime.activeAnomaly.missed = true;
    }
    runtime.activeAnomaly = null;
  }

  if (!runtime.currentMessage && elapsedMs >= runtime.nextMessageAtMs && elapsedMs < runtime.config.durationMs) {
    spawnChatMessage(runtime, elapsedMs, rng);
  }

  if (!runtime.activeAnomaly && elapsedMs >= runtime.nextAnomalyAtMs && elapsedMs < runtime.config.durationMs) {
    spawnAnomaly(runtime, elapsedMs, rng);
  }
}

export function buildRoundLog(params: {
  runtime: ChatErrorRoundRuntime;
  roundNumber: number;
  startedAtIso: string;
  endedAtIso: string;
}): ChatErrorRoundLog {
  const base: ChatErrorRoundLog = {
    roundNumber: params.roundNumber,
    roundName: params.runtime.config.name,
    startedAtIso: params.startedAtIso,
    endedAtIso: params.endedAtIso,
    config: params.runtime.config,
    metrics: {
      durationMs: params.runtime.config.durationMs,
      chatTotal: 0,
      chatAnswered: 0,
      chatCorrect: 0,
      chatIncorrect: 0,
      chatTimeouts: 0,
      chatAccuracyPercent: 0,
      chatMeanResponseMs: 0,
      anomalyTotal: 0,
      anomalyDetected: 0,
      anomalyMissed: 0,
      anomalyDetectionRatePercent: 0,
      anomalyMeanReactionMs: 0,
      falseAlarms: params.runtime.falseAlarms,
      conflictCount: 0,
      dualScore: 0,
    },
    messages: params.runtime.messages,
    anomalies: params.runtime.anomalies,
  };

  base.metrics = {
    ...computeRoundMetrics(base),
    falseAlarms: params.runtime.falseAlarms,
  };

  return base;
}

export function computeMetrics(params: {
  startedAtMs: number;
  endedAtMs: number;
  rounds: ChatErrorRoundLog[];
}): ChatErrorSessionResult {
  const elapsedMs = Math.max(0, params.endedAtMs - params.startedAtMs);

  const averageDualScore =
    params.rounds.length > 0
      ? params.rounds.reduce((sum, item) => sum + item.metrics.dualScore, 0) / params.rounds.length
      : 0;

  const averageChatAccuracyPercent =
    params.rounds.length > 0
      ? params.rounds.reduce((sum, item) => sum + item.metrics.chatAccuracyPercent, 0) / params.rounds.length
      : 0;

  const averageAnomalyDetectionPercent =
    params.rounds.length > 0
      ? params.rounds.reduce((sum, item) => sum + item.metrics.anomalyDetectionRatePercent, 0) / params.rounds.length
      : 0;

  const split = Math.max(1, Math.floor(params.rounds.length / 2));
  const firstHalf = params.rounds.slice(0, split);
  const lastHalf = params.rounds.slice(-split);

  const firstHalfDualScore =
    firstHalf.length > 0
      ? firstHalf.reduce((sum, item) => sum + item.metrics.dualScore, 0) / firstHalf.length
      : 0;

  const lastHalfDualScore =
    lastHalf.length > 0
      ? lastHalf.reduce((sum, item) => sum + item.metrics.dualScore, 0) / lastHalf.length
      : 0;

  const trendSummary =
    lastHalfDualScore > firstHalfDualScore
      ? "Melhora no final da sessão."
      : lastHalfDualScore < firstHalfDualScore
        ? "Queda no final da sessão."
        : "Desempenho estável ao longo da sessão.";

  return {
    startedAtIso: new Date(params.startedAtMs).toISOString(),
    endedAtIso: new Date(params.endedAtMs).toISOString(),
    elapsedMs,
    rounds: params.rounds,
    averageDualScore,
    averageChatAccuracyPercent,
    averageAnomalyDetectionPercent,
    firstHalfDualScore,
    lastHalfDualScore,
    trendSummary,
  };
}

function escapeCsv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function exportJSON(result: ChatErrorSessionResult): string {
  return JSON.stringify(result, null, 2);
}

export function exportCSV(result: ChatErrorSessionResult): string {
  const headers = [
    "startedAt",
    "endedAt",
    "elapsedMs",
    "averageDualScore",
    "averageChatAccuracyPercent",
    "averageAnomalyDetectionPercent",
    "firstHalfDualScore",
    "lastHalfDualScore",
    "trendSummary",
    "rounds",
  ];

  const row = [
    result.startedAtIso,
    result.endedAtIso,
    String(result.elapsedMs),
    result.averageDualScore.toFixed(2),
    result.averageChatAccuracyPercent.toFixed(2),
    result.averageAnomalyDetectionPercent.toFixed(2),
    result.firstHalfDualScore.toFixed(2),
    result.lastHalfDualScore.toFixed(2),
    result.trendSummary,
    JSON.stringify(result.rounds),
  ];

  return [headers.join(","), row.map(escapeCsv).join(",")].join("\n");
}
