import type {
  ColorShapeSwitchRoundConfig,
  ColorShapeSwitchRoundLog,
  ColorShapeSwitchRuntime,
  ColorShapeSwitchSessionResult,
  StimulusColor,
  StimulusShape,
  SwitchMetrics,
  SwitchRule,
  SwitchTrial,
  SwitchTrialLog,
  TrialType,
} from "./types";

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
  return values.reduce((sum, item) => sum + item, 0) / values.length;
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

export function classifyTrialType(previousRule: SwitchRule | null, currentRule: SwitchRule): TrialType {
  if (!previousRule) return "initial";
  return previousRule === currentRule ? "repeat" : "switch";
}

export function generateRuleSequence(params: {
  totalTrials: number;
  blockMin: 1;
  blockMax: 3;
  rng?: () => number;
}): SwitchRule[] {
  const rng = params.rng ?? Math.random;
  const rules: SwitchRule[] = [];

  let currentRule: SwitchRule = rng() < 0.5 ? "color" : "shape";
  while (rules.length < params.totalTrials) {
    const blockSize = Math.floor(randomBetween(params.blockMin, params.blockMax + 1, rng));
    for (let index = 0; index < blockSize && rules.length < params.totalTrials; index += 1) {
      rules.push(currentRule);
    }
    currentRule = currentRule === "color" ? "shape" : "color";
  }

  return rules;
}

export function spawnTrial(params: {
  runtime: ColorShapeSwitchRuntime;
  atMs: number;
  rng?: () => number;
}): SwitchTrial | null {
  const rng = params.rng ?? Math.random;
  const { runtime } = params;

  if (runtime.trialIndex >= runtime.config.totalTrials) {
    runtime.activeTrial = null;
    return null;
  }

  const rule = runtime.rules[runtime.trialIndex] as SwitchRule;
  const previousRule = runtime.trialIndex > 0 ? runtime.rules[runtime.trialIndex - 1] ?? null : null;
  const trialType = classifyTrialType(previousRule, rule);
  const color = randomItem(runtime.config.colors, rng);
  const shape = randomItem(runtime.config.shapes, rng);
  const expectedKey =
    rule === "color"
      ? runtime.config.keyMap.color[color]
      : runtime.config.keyMap.shape[shape];

  const fixationMs = Math.round(
    randomBetween(runtime.config.fixationMinMs, runtime.config.fixationMaxMs, rng),
  );

  const shownAtMs = params.atMs + fixationMs;
  const deadlineAtMs = shownAtMs + runtime.config.responseLimitMs;

  const trial: SwitchTrial = {
    id: runtime.trialIndex + 1,
    rule,
    trialType,
    color,
    shape,
    expectedKey,
    fixationMs,
    shownAtMs,
    deadlineAtMs,
  };

  runtime.activeTrial = trial;
  runtime.trialIndex += 1;
  return trial;
}

export function startSession(
  config: ColorShapeSwitchRoundConfig,
  rng: () => number = Math.random,
): ColorShapeSwitchRuntime {
  return {
    config,
    rules: generateRuleSequence({
      totalTrials: config.totalTrials,
      blockMin: config.ruleBlockMin,
      blockMax: config.ruleBlockMax,
      rng,
    }),
    trialIndex: 0,
    activeTrial: null,
    logs: [],
  };
}

export function handleResponse(params: {
  runtime: ColorShapeSwitchRuntime;
  key: string;
  atMs: number;
}): { accepted: boolean; correct: boolean; outcome?: "hit" | "error" } {
  const trial = params.runtime.activeTrial;
  if (!trial) return { accepted: false, correct: false };

  if (params.atMs < trial.shownAtMs) {
    return { accepted: false, correct: false };
  }

  const responseKey = normalizeKey(params.key);
  const expectedKey = normalizeKey(trial.expectedKey);
  const correct = responseKey === expectedKey;

  const log: SwitchTrialLog = {
    trialIndex: trial.id,
    rule: trial.rule,
    trialType: trial.trialType,
    color: trial.color,
    shape: trial.shape,
    expectedKey,
    responseKey,
    shownAtMs: trial.shownAtMs,
    respondedAtMs: params.atMs,
    reactionMs: Math.max(0, params.atMs - trial.shownAtMs),
    outcome: correct ? "hit" : "error",
  };

  params.runtime.logs.push(log);
  params.runtime.activeTrial = null;
  return { accepted: true, correct, outcome: log.outcome === "hit" ? "hit" : "error" };
}

export function resolveOmission(params: {
  runtime: ColorShapeSwitchRuntime;
  atMs: number;
}): { accepted: boolean } {
  const trial = params.runtime.activeTrial;
  if (!trial) return { accepted: false };
  if (params.atMs < trial.deadlineAtMs) return { accepted: false };

  params.runtime.logs.push({
    trialIndex: trial.id,
    rule: trial.rule,
    trialType: trial.trialType,
    color: trial.color,
    shape: trial.shape,
    expectedKey: normalizeKey(trial.expectedKey),
    shownAtMs: trial.shownAtMs,
    outcome: "omission",
  });
  params.runtime.activeTrial = null;
  return { accepted: true };
}

export function computeSwitchMetrics(trials: SwitchTrialLog[]): SwitchMetrics {
  const totalTrials = trials.length;
  const hits = trials.filter((item) => item.outcome === "hit").length;
  const errors = trials.filter((item) => item.outcome === "error").length;
  const omissions = trials.filter((item) => item.outcome === "omission").length;
  const accuracyPercent = totalTrials > 0 ? (hits / totalTrials) * 100 : 0;

  const rtAnswered = trials
    .filter((item) => (item.outcome === "hit" || item.outcome === "error") && item.reactionMs != null)
    .map((item) => item.reactionMs ?? 0);

  const rtCorrect = trials
    .filter((item) => item.outcome === "hit" && item.reactionMs != null)
    .map((item) => item.reactionMs ?? 0);

  const repeatTrials = trials.filter((item) => item.trialType === "repeat");
  const switchTrials = trials.filter((item) => item.trialType === "switch");

  const repeatRt = repeatTrials
    .filter((item) => item.outcome === "hit" && item.reactionMs != null)
    .map((item) => item.reactionMs ?? 0);

  const switchRt = switchTrials
    .filter((item) => item.outcome === "hit" && item.reactionMs != null)
    .map((item) => item.reactionMs ?? 0);

  const repeatErrors = repeatTrials.filter((item) => item.outcome !== "hit").length;
  const switchErrors = switchTrials.filter((item) => item.outcome !== "hit").length;

  const repeatErrorRatePercent =
    repeatTrials.length > 0 ? (repeatErrors / repeatTrials.length) * 100 : 0;
  const switchErrorRatePercent =
    switchTrials.length > 0 ? (switchErrors / switchTrials.length) * 100 : 0;

  const repeatMeanReactionMs = mean(repeatRt);
  const switchMeanReactionMs = mean(switchRt);
  const switchCostMs =
    repeatMeanReactionMs > 0 && switchMeanReactionMs > 0
      ? switchMeanReactionMs - repeatMeanReactionMs
      : 0;

  const score = clamp(
    accuracyPercent - switchErrorRatePercent * 0.3 - Math.max(0, switchCostMs) / 35,
    0,
    100,
  );

  return {
    totalTrials,
    hits,
    errors,
    omissions,
    accuracyPercent,
    meanReactionMs: mean(rtAnswered),
    meanCorrectReactionMs: mean(rtCorrect),
    repeatMeanReactionMs,
    switchMeanReactionMs,
    repeatErrorRatePercent,
    switchErrorRatePercent,
    switchCostMs,
    score,
  };
}

export function closeRound(params: {
  runtime: ColorShapeSwitchRuntime;
  roundNumber: number;
  startedAtIso: string;
  endedAtIso: string;
}): ColorShapeSwitchRoundLog {
  if (params.runtime.activeTrial) {
    resolveOmission({ runtime: params.runtime, atMs: params.runtime.activeTrial.deadlineAtMs + 1 });
  }

  return {
    roundNumber: params.roundNumber,
    roundName: params.runtime.config.name,
    startedAtIso: params.startedAtIso,
    endedAtIso: params.endedAtIso,
    config: params.runtime.config,
    metrics: computeSwitchMetrics(params.runtime.logs),
    trials: params.runtime.logs.map((item) => ({ ...item })),
  };
}

export function computeFinalMetrics(params: {
  startedAtMs: number;
  endedAtMs: number;
  rounds: ColorShapeSwitchRoundLog[];
}): ColorShapeSwitchSessionResult {
  const elapsedMs = Math.max(0, params.endedAtMs - params.startedAtMs);
  const allTrials = params.rounds.flatMap((item) => item.trials);
  const aggregate = computeSwitchMetrics(allTrials);

  const interpretation =
    aggregate.score >= 85
      ? "Excelente flexibilidade cognitiva e baixo custo de troca."
      : aggregate.score >= 70
        ? "Bom desempenho, com custo de troca moderado."
        : aggregate.score >= 50
          ? "Desempenho intermediário; pratique alternância com foco na precisão."
          : "Desempenho baixo; reduza o ritmo e priorize acurácia em trocas de regra.";

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
    overallRepeatErrorRatePercent: aggregate.repeatErrorRatePercent,
    overallSwitchErrorRatePercent: aggregate.switchErrorRatePercent,
    interpretation,
  };
}

export function exportJSON(result: ColorShapeSwitchSessionResult): string {
  return JSON.stringify(result, null, 2);
}

function escapeCsv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function exportCSV(result: ColorShapeSwitchSessionResult): string {
  const header = [
    "roundNumber",
    "trialIndex",
    "rule",
    "trialType",
    "color",
    "shape",
    "expectedKey",
    "responseKey",
    "outcome",
    "reactionMs",
  ];

  const rows = result.rounds.flatMap((round) =>
    round.trials.map((trial) => [
      String(round.roundNumber),
      String(trial.trialIndex),
      trial.rule,
      trial.trialType,
      trial.color,
      trial.shape,
      trial.expectedKey,
      trial.responseKey ?? "",
      trial.outcome,
      trial.reactionMs != null ? String(trial.reactionMs) : "",
    ]),
  );

  return [header.join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join("\n");
}

export function exportTXT(result: ColorShapeSwitchSessionResult): string {
  const lines: string[] = [];
  lines.push("=" + "=".repeat(60));
  lines.push("RESULTADO - COR-OU-FORMA (ATENÇÃO ALTERNADA)");
  lines.push("=" + "=".repeat(60));
  lines.push("");
  lines.push(`Pontuação final: ${result.finalScore.toFixed(1)}%`);
  lines.push(`Acurácia geral: ${result.overallAccuracyPercent.toFixed(1)}%`);
  lines.push(`RT médio geral (todas respostas): ${result.overallMeanReactionMs.toFixed(0)} ms`);
  lines.push(`RT médio dos acertos: ${result.overallMeanCorrectReactionMs.toFixed(0)} ms`);
  lines.push(`Switch cost (RT): ${result.overallSwitchCostMs.toFixed(0)} ms`);
  lines.push(`Erro em repetição: ${result.overallRepeatErrorRatePercent.toFixed(1)}%`);
  lines.push(`Erro em troca: ${result.overallSwitchErrorRatePercent.toFixed(1)}%`);
  lines.push("");
  lines.push(`Interpretação: ${result.interpretation}`);
  return lines.join("\n");
}
