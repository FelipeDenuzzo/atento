import type {
  ReversalMetrics,
  ReversalOutcome,
  ReversalRoundConfig,
  ReversalRoundLog,
  ReversalRuntime,
  ReversalSessionResult,
  ReversalTrial,
  ReversalTrialLog,
  RuleMode,
  StimulusKind,
  StimulusShape,
  TrialType,
} from "./types";

const NON_TARGET_SHAPES: StimulusShape[] = ["circle", "square", "triangle"];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(min: number, max: number, rng: () => number): number {
  return min + rng() * (max - min);
}

function randomItem<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)] as T;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function classifyTrialType(previousRule: RuleMode | null, currentRule: RuleMode): TrialType {
  if (!previousRule) return "first";
  return previousRule === currentRule ? "repeat" : "switch";
}

function expectedClickFor(rule: RuleMode, stimulusKind: StimulusKind): boolean {
  if (rule === "normal") {
    return stimulusKind === "target";
  }
  return stimulusKind === "non-target";
}

function classifyOutcome(params: {
  expectedClick: boolean;
  clicked: boolean;
}): { correct: boolean; outcome: ReversalOutcome } {
  if (params.expectedClick && params.clicked) {
    return { correct: true, outcome: "hit" };
  }

  if (!params.expectedClick && !params.clicked) {
    return { correct: true, outcome: "hit" };
  }

  if (params.clicked) {
    return { correct: false, outcome: "commission" };
  }

  return { correct: false, outcome: "omission" };
}

export function generateRuleSequence(params: {
  totalTrials: number;
  switchRate: number;
  rng?: () => number;
}): RuleMode[] {
  const rng = params.rng ?? Math.random;
  const totalTrials = Math.max(0, params.totalTrials);
  if (totalTrials === 0) return [];

  const switchRate = clamp(params.switchRate, 0.1, 0.9);
  const rules: RuleMode[] = [rng() < 0.5 ? "normal" : "inverted"];

  while (rules.length < totalTrials) {
    const previous = rules[rules.length - 1] as RuleMode;
    const willSwitch = rng() < switchRate;
    const nextRule = willSwitch ? (previous === "normal" ? "inverted" : "normal") : previous;
    rules.push(nextRule);
  }

  return rules;
}

export function spawnTrial(params: {
  runtime: ReversalRuntime;
  atMs: number;
  rng?: () => number;
}): ReversalTrial | null {
  const rng = params.rng ?? Math.random;
  const runtime = params.runtime;

  if (runtime.trialIndex >= runtime.config.totalTrials) {
    runtime.activeTrial = null;
    return null;
  }

  const rule = runtime.rules[runtime.trialIndex] as RuleMode;
  const previousRule = runtime.trialIndex > 0 ? runtime.rules[runtime.trialIndex - 1] ?? null : null;
  const trialType = classifyTrialType(previousRule, rule);

  const stimulusKind: StimulusKind =
    rng() < clamp(runtime.config.targetRate, 0.2, 0.8) ? "target" : "non-target";
  const stimulusShape: StimulusShape =
    stimulusKind === "target" ? "star" : randomItem(NON_TARGET_SHAPES, rng);

  const expectedClick = expectedClickFor(rule, stimulusKind);
  const fixationMs = Math.round(
    randomBetween(runtime.config.fixationMinMs, runtime.config.fixationMaxMs, rng),
  );

  const cueEndsAtMs = params.atMs + fixationMs + runtime.config.cueMs;
  const shownAtMs = cueEndsAtMs;
  const deadlineAtMs = shownAtMs + runtime.config.responseLimitMs;

  const trial: ReversalTrial = {
    id: runtime.trialIndex + 1,
    rule,
    trialType,
    stimulusShape,
    stimulusKind,
    expectedClick,
    fixationMs,
    cueEndsAtMs,
    shownAtMs,
    deadlineAtMs,
  };

  runtime.activeTrial = trial;
  runtime.trialIndex += 1;
  return trial;
}

export function startSession(
  config: ReversalRoundConfig,
  rng: () => number = Math.random,
): ReversalRuntime {
  return {
    config,
    rules: generateRuleSequence({
      totalTrials: config.totalTrials,
      switchRate: config.switchRate,
      rng,
    }),
    trialIndex: 0,
    activeTrial: null,
    logs: [],
  };
}

export function handleResponse(params: {
  runtime: ReversalRuntime;
  clicked: boolean;
  atMs: number;
}): { accepted: boolean; correct: boolean; outcome: ReversalOutcome } {
  const trial = params.runtime.activeTrial;
  if (!trial) return { accepted: false, correct: false, outcome: "commission" };
  if (params.atMs < trial.shownAtMs || params.atMs > trial.deadlineAtMs) {
    return { accepted: false, correct: false, outcome: "commission" };
  }

  const evaluated = classifyOutcome({ expectedClick: trial.expectedClick, clicked: params.clicked });

  const log: ReversalTrialLog = {
    trialIndex: trial.id,
    rule: trial.rule,
    trialType: trial.trialType,
    stimulusShape: trial.stimulusShape,
    stimulusKind: trial.stimulusKind,
    expectedClick: trial.expectedClick,
    clicked: params.clicked,
    correct: evaluated.correct,
    outcome: evaluated.outcome,
    shownAtMs: trial.shownAtMs,
    respondedAtMs: params.atMs,
    reactionMs: params.clicked ? Math.max(0, params.atMs - trial.shownAtMs) : undefined,
    timedOut: false,
  };

  params.runtime.logs.push(log);
  params.runtime.activeTrial = null;
  return { accepted: true, correct: evaluated.correct, outcome: evaluated.outcome };
}

export function resolveTimeout(params: {
  runtime: ReversalRuntime;
  atMs: number;
}): { accepted: boolean; correct: boolean; outcome: ReversalOutcome } {
  const trial = params.runtime.activeTrial;
  if (!trial) return { accepted: false, correct: false, outcome: "commission" };
  if (params.atMs < trial.deadlineAtMs) {
    return { accepted: false, correct: false, outcome: "commission" };
  }

  const evaluated = classifyOutcome({ expectedClick: trial.expectedClick, clicked: false });

  params.runtime.logs.push({
    trialIndex: trial.id,
    rule: trial.rule,
    trialType: trial.trialType,
    stimulusShape: trial.stimulusShape,
    stimulusKind: trial.stimulusKind,
    expectedClick: trial.expectedClick,
    clicked: false,
    correct: evaluated.correct,
    outcome: evaluated.outcome,
    shownAtMs: trial.shownAtMs,
    timedOut: true,
  });

  params.runtime.activeTrial = null;
  return { accepted: true, correct: evaluated.correct, outcome: evaluated.outcome };
}

export function computeMetrics(trials: ReversalTrialLog[]): ReversalMetrics {
  const totalTrials = trials.length;
  const hits = trials.filter((trial) => trial.correct).length;
  const commissions = trials.filter((trial) => trial.outcome === "commission").length;
  const omissions = trials.filter((trial) => trial.outcome === "omission").length;
  const accuracyPercent = totalTrials > 0 ? (hits / totalTrials) * 100 : 0;

  const rtAnswered = trials
    .filter((trial) => trial.clicked && trial.reactionMs != null)
    .map((trial) => trial.reactionMs ?? 0);

  const rtCorrect = trials
    .filter((trial) => trial.correct && trial.clicked && trial.reactionMs != null)
    .map((trial) => trial.reactionMs ?? 0);

  const normalTrials = trials.filter((trial) => trial.rule === "normal");
  const invertedTrials = trials.filter((trial) => trial.rule === "inverted");
  const repeatTrials = trials.filter((trial) => trial.trialType === "repeat");
  const switchTrials = trials.filter((trial) => trial.trialType === "switch");

  const normalAccuracyPercent =
    normalTrials.length > 0 ? (normalTrials.filter((trial) => trial.correct).length / normalTrials.length) * 100 : 0;
  const invertedAccuracyPercent =
    invertedTrials.length > 0
      ? (invertedTrials.filter((trial) => trial.correct).length / invertedTrials.length) * 100
      : 0;

  const normalMeanReactionMs = mean(
    normalTrials
      .filter((trial) => trial.clicked && trial.reactionMs != null)
      .map((trial) => trial.reactionMs ?? 0),
  );

  const invertedMeanReactionMs = mean(
    invertedTrials
      .filter((trial) => trial.clicked && trial.reactionMs != null)
      .map((trial) => trial.reactionMs ?? 0),
  );

  const repeatAccuracyPercent =
    repeatTrials.length > 0 ? (repeatTrials.filter((trial) => trial.correct).length / repeatTrials.length) * 100 : 0;
  const switchAccuracyPercent =
    switchTrials.length > 0 ? (switchTrials.filter((trial) => trial.correct).length / switchTrials.length) * 100 : 0;

  const repeatMeanReactionMs = mean(
    repeatTrials
      .filter((trial) => trial.clicked && trial.reactionMs != null)
      .map((trial) => trial.reactionMs ?? 0),
  );

  const switchMeanReactionMs = mean(
    switchTrials
      .filter((trial) => trial.clicked && trial.reactionMs != null)
      .map((trial) => trial.reactionMs ?? 0),
  );

  const switchCostMs =
    repeatMeanReactionMs > 0 && switchMeanReactionMs > 0
      ? switchMeanReactionMs - repeatMeanReactionMs
      : 0;

  const score = clamp(
    accuracyPercent - commissions * 0.25 - omissions * 0.2 - Math.max(0, switchCostMs) / 45,
    0,
    100,
  );

  return {
    totalTrials,
    hits,
    commissions,
    omissions,
    accuracyPercent,
    meanReactionMs: mean(rtAnswered),
    meanCorrectReactionMs: mean(rtCorrect),
    normalAccuracyPercent,
    invertedAccuracyPercent,
    normalMeanReactionMs,
    invertedMeanReactionMs,
    repeatAccuracyPercent,
    switchAccuracyPercent,
    repeatMeanReactionMs,
    switchMeanReactionMs,
    switchCostMs,
    score,
  };
}

export function closeRound(params: {
  runtime: ReversalRuntime;
  roundNumber: number;
  startedAtIso: string;
  endedAtIso: string;
}): ReversalRoundLog {
  if (params.runtime.activeTrial) {
    resolveTimeout({ runtime: params.runtime, atMs: params.runtime.activeTrial.deadlineAtMs + 1 });
  }

  return {
    roundNumber: params.roundNumber,
    roundName: params.runtime.config.name,
    startedAtIso: params.startedAtIso,
    endedAtIso: params.endedAtIso,
    config: params.runtime.config,
    metrics: computeMetrics(params.runtime.logs),
    trials: params.runtime.logs.map((trial) => ({ ...trial })),
  };
}

export function computeFinalMetrics(params: {
  startedAtMs: number;
  endedAtMs: number;
  rounds: ReversalRoundLog[];
}): ReversalSessionResult {
  const elapsedMs = Math.max(0, params.endedAtMs - params.startedAtMs);
  const allTrials = params.rounds.flatMap((round) => round.trials);
  const aggregate = computeMetrics(allTrials);

  const interpretation =
    aggregate.score >= 85
      ? "Excelente flexibilidade cognitiva com bom controle inibitório." 
      : aggregate.score >= 70
        ? "Bom desempenho geral, com pequeno custo de alternância de regra."
        : aggregate.score >= 50
          ? "Desempenho intermediário; treine reversão de regra para reduzir comissões e omissões."
          : "Desempenho baixo; priorize leitura do cue e controle de impulsividade.";

  return {
    startedAtIso: new Date(params.startedAtMs).toISOString(),
    endedAtIso: new Date(params.endedAtMs).toISOString(),
    elapsedMs,
    rounds: params.rounds,
    finalScore: aggregate.score,
    overallAccuracyPercent: aggregate.accuracyPercent,
    overallMeanReactionMs: aggregate.meanReactionMs,
    overallMeanCorrectReactionMs: aggregate.meanCorrectReactionMs,
    overallSwitchCostMs: aggregate.switchCostMs,
    overallNormalAccuracyPercent: aggregate.normalAccuracyPercent,
    overallInvertedAccuracyPercent: aggregate.invertedAccuracyPercent,
    overallCommissionCount: aggregate.commissions,
    overallOmissionCount: aggregate.omissions,
    interpretation,
  };
}

export function exportJSON(result: ReversalSessionResult): string {
  return JSON.stringify(result, null, 2);
}

function escapeCsv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function exportCSV(result: ReversalSessionResult): string {
  const header = [
    "roundNumber",
    "trialIndex",
    "rule",
    "trialType",
    "stimulusKind",
    "stimulusShape",
    "expectedClick",
    "clicked",
    "correct",
    "outcome",
    "timedOut",
    "reactionMs",
  ];

  const rows = result.rounds.flatMap((round) =>
    round.trials.map((trial) => [
      String(round.roundNumber),
      String(trial.trialIndex),
      trial.rule,
      trial.trialType,
      trial.stimulusKind,
      trial.stimulusShape,
      trial.expectedClick ? "true" : "false",
      trial.clicked ? "true" : "false",
      trial.correct ? "true" : "false",
      trial.outcome,
      trial.timedOut ? "true" : "false",
      trial.reactionMs != null ? String(trial.reactionMs) : "",
    ]),
  );

  return [header.join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join("\n");
}

export function exportTXT(result: ReversalSessionResult): string {
  const lines: string[] = [];
  lines.push("=" + "=".repeat(72));
  lines.push("RELATÓRIO DIDÁTICO - REVERSAL GO/NO-GO SWITCH");
  lines.push("=" + "=".repeat(72));
  lines.push("");
  lines.push("Resumo rápido");
  lines.push("- O treino inicial é apenas prática e não entra na validação final.");
  lines.push(`- Pontuação final (fases válidas): ${result.finalScore.toFixed(1)}%.`);
  lines.push(`- Acurácia geral: ${result.overallAccuracyPercent.toFixed(1)}%.`);
  lines.push("");
  lines.push("Como interpretar os indicadores");
  lines.push(`- Tempo de resposta médio: ${result.overallMeanReactionMs.toFixed(0)} ms.`);
  lines.push("  (Menor valor indica resposta mais rápida.)");
  lines.push(`- Tempo médio nos acertos: ${result.overallMeanCorrectReactionMs.toFixed(0)} ms.`);
  lines.push("  (Mostra velocidade quando a decisão foi correta.)");
  lines.push(`- Custo de alternância de regra: ${result.overallSwitchCostMs.toFixed(0)} ms.`);
  lines.push("  (Quanto maior, mais difícil foi trocar de regra.)");
  lines.push(`- Acurácia na regra NORMAL: ${result.overallNormalAccuracyPercent.toFixed(1)}%.`);
  lines.push(`- Acurácia na regra INVERTIDA: ${result.overallInvertedAccuracyPercent.toFixed(1)}%.`);
  lines.push("");
  lines.push("Erros observados");
  lines.push(`- Comissão: ${result.overallCommissionCount}.`);
  lines.push("  (Clique quando era para não clicar.)");
  lines.push(`- Omissão: ${result.overallOmissionCount}.`);
  lines.push("  (Não clicar quando era para clicar.)");
  lines.push("");
  lines.push("Leitura clínica resumida");
  lines.push(`- ${result.interpretation}`);
  lines.push("");
  lines.push("Sugestão prática");
  lines.push("- Em caso de muitos erros por impulso (comissão), priorize pausa breve antes do clique.");
  lines.push("- Em caso de omissões, aumente foco na mudança de regra antes de responder.");
  return lines.join("\n");
}
