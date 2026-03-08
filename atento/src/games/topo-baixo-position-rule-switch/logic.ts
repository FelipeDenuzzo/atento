import type {
  PositionRuleMetrics,
  PositionRuleRoundConfig,
  PositionRuleRoundLog,
  PositionRuleRuntime,
  PositionRuleSessionResult,
  PositionRuleTrial,
  PositionRuleTrialLog,
  RelevantDimension,
  StimulusColor,
  StimulusShape,
  TrialType,
  VerticalPosition,
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
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function classifyTrialType(
  previousPosition: VerticalPosition | null,
  currentPosition: VerticalPosition,
): TrialType {
  if (!previousPosition) return "first";
  return previousPosition === currentPosition ? "repeat" : "switch";
}

function relevantValue(params: {
  dimension: RelevantDimension;
  color: StimulusColor;
  shape: StimulusShape;
}): string {
  if (params.dimension === "color") {
    return params.color;
  }
  return params.shape;
}

function expectedKeyForTrial(params: {
  position: VerticalPosition;
  color: StimulusColor;
  shape: StimulusShape;
  config: PositionRuleRoundConfig;
}): { rule: "A" | "B"; relevantDimension: RelevantDimension; expectedKey: string } {
  const rule = params.position === "top" ? params.config.topRule : params.config.bottomRule;
  const relevantDimension = rule.dimension;

  if (relevantDimension === "color") {
    const key = rule.colorKeyMap[params.color];
    return { rule: rule.id, relevantDimension, expectedKey: key };
  }

  const key = rule.shapeKeyMap[params.shape];
  return { rule: rule.id, relevantDimension, expectedKey: key };
}

export function generatePositionSequence(params: {
  totalTrials: number;
  switchRate: number;
  rng?: () => number;
}): VerticalPosition[] {
  const rng = params.rng ?? Math.random;
  const totalTrials = Math.max(0, params.totalTrials);
  if (totalTrials === 0) return [];

  const switchRate = clamp(params.switchRate, 0.1, 0.9);
  const positions: VerticalPosition[] = [rng() < 0.5 ? "top" : "bottom"];

  while (positions.length < totalTrials) {
    const previous = positions[positions.length - 1] as VerticalPosition;
    const willSwitch = rng() < switchRate;
    const nextPosition = willSwitch
      ? previous === "top"
        ? "bottom"
        : "top"
      : previous;
    positions.push(nextPosition);
  }

  return positions;
}

export function spawnTrial(params: {
  runtime: PositionRuleRuntime;
  atMs: number;
  rng?: () => number;
}): PositionRuleTrial | null {
  const rng = params.rng ?? Math.random;
  const runtime = params.runtime;

  if (runtime.trialIndex >= runtime.config.totalTrials) {
    runtime.activeTrial = null;
    return null;
  }

  const position = runtime.positions[runtime.trialIndex] as VerticalPosition;
  const previous = runtime.trialIndex > 0 ? runtime.positions[runtime.trialIndex - 1] ?? null : null;
  const trialType = classifyTrialType(previous, position);
  const color = randomItem(runtime.config.colors, rng);
  const shape = randomItem(runtime.config.shapes, rng);

  const expected = expectedKeyForTrial({
    position,
    color,
    shape,
    config: runtime.config,
  });

  const fixationMs = Math.round(
    randomBetween(runtime.config.fixationMinMs, runtime.config.fixationMaxMs, rng),
  );

  const shownAtMs = params.atMs + fixationMs;
  const deadlineAtMs = shownAtMs + runtime.config.responseLimitMs;

  const trial: PositionRuleTrial = {
    id: runtime.trialIndex + 1,
    position,
    trialType,
    rule: expected.rule,
    relevantDimension: expected.relevantDimension,
    stimulus: { color, shape },
    expectedKey: expected.expectedKey,
    fixationMs,
    shownAtMs,
    deadlineAtMs,
  };

  runtime.activeTrial = trial;
  runtime.trialIndex += 1;
  return trial;
}

export function startSession(
  config: PositionRuleRoundConfig,
  rng: () => number = Math.random,
): PositionRuleRuntime {
  return {
    config,
    positions: generatePositionSequence({
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
  runtime: PositionRuleRuntime;
  key: string;
  atMs: number;
}): { accepted: boolean; correct: boolean } {
  const trial = params.runtime.activeTrial;
  if (!trial) return { accepted: false, correct: false };
  if (params.atMs < trial.shownAtMs) {
    return { accepted: false, correct: false };
  }

  const pressedKey = normalizeKey(params.key);
  const expectedKey = normalizeKey(trial.expectedKey);
  const correct = pressedKey === expectedKey;

  const log: PositionRuleTrialLog = {
    trialIndex: trial.id,
    position: trial.position,
    rule: trial.rule,
    trialType: trial.trialType,
    relevantDimension: trial.relevantDimension,
    stimulusColor: trial.stimulus.color,
    stimulusShape: trial.stimulus.shape,
    expectedKey,
    pressedKey,
    correct,
    outcome: correct ? "hit" : "error",
    shownAtMs: trial.shownAtMs,
    respondedAtMs: params.atMs,
    reactionMs: Math.max(0, params.atMs - trial.shownAtMs),
    timedOut: false,
  };

  params.runtime.logs.push(log);
  params.runtime.activeTrial = null;
  return { accepted: true, correct };
}

export function resolveTimeout(params: {
  runtime: PositionRuleRuntime;
  atMs: number;
}): { accepted: boolean } {
  const trial = params.runtime.activeTrial;
  if (!trial) return { accepted: false };
  if (params.atMs < trial.deadlineAtMs) return { accepted: false };

  params.runtime.logs.push({
    trialIndex: trial.id,
    position: trial.position,
    rule: trial.rule,
    trialType: trial.trialType,
    relevantDimension: trial.relevantDimension,
    stimulusColor: trial.stimulus.color,
    stimulusShape: trial.stimulus.shape,
    expectedKey: normalizeKey(trial.expectedKey),
    correct: false,
    outcome: "omission",
    shownAtMs: trial.shownAtMs,
    timedOut: true,
  });

  params.runtime.activeTrial = null;
  return { accepted: true };
}

export function computeMetrics(trials: PositionRuleTrialLog[]): PositionRuleMetrics {
  const totalTrials = trials.length;
  const hits = trials.filter((trial) => trial.outcome === "hit").length;
  const errors = trials.filter((trial) => trial.outcome === "error").length;
  const omissions = trials.filter((trial) => trial.outcome === "omission").length;
  const accuracyPercent = totalTrials > 0 ? (hits / totalTrials) * 100 : 0;

  const rtAnswered = trials
    .filter((trial) => (trial.outcome === "hit" || trial.outcome === "error") && trial.reactionMs != null)
    .map((trial) => trial.reactionMs ?? 0);
  const rtCorrect = trials
    .filter((trial) => trial.outcome === "hit" && trial.reactionMs != null)
    .map((trial) => trial.reactionMs ?? 0);

  const repeatTrials = trials.filter((trial) => trial.trialType === "repeat");
  const switchTrials = trials.filter((trial) => trial.trialType === "switch");
  const ruleATrials = trials.filter((trial) => trial.rule === "A");
  const ruleBTrials = trials.filter((trial) => trial.rule === "B");

  const repeatRt = repeatTrials
    .filter((trial) => trial.outcome === "hit" && trial.reactionMs != null)
    .map((trial) => trial.reactionMs ?? 0);
  const switchRt = switchTrials
    .filter((trial) => trial.outcome === "hit" && trial.reactionMs != null)
    .map((trial) => trial.reactionMs ?? 0);

  const repeatErrors = repeatTrials.filter((trial) => trial.outcome !== "hit").length;
  const switchErrors = switchTrials.filter((trial) => trial.outcome !== "hit").length;

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

  const ruleAHits = ruleATrials.filter((trial) => trial.outcome === "hit").length;
  const ruleBHits = ruleBTrials.filter((trial) => trial.outcome === "hit").length;

  const ruleAAccuracyPercent = ruleATrials.length > 0 ? (ruleAHits / ruleATrials.length) * 100 : 0;
  const ruleBAccuracyPercent = ruleBTrials.length > 0 ? (ruleBHits / ruleBTrials.length) * 100 : 0;

  const ruleAMeanReactionMs = mean(
    ruleATrials
      .filter((trial) => trial.outcome === "hit" && trial.reactionMs != null)
      .map((trial) => trial.reactionMs ?? 0),
  );
  const ruleBMeanReactionMs = mean(
    ruleBTrials
      .filter((trial) => trial.outcome === "hit" && trial.reactionMs != null)
      .map((trial) => trial.reactionMs ?? 0),
  );

  const score = clamp(
    accuracyPercent - switchErrorRatePercent * 0.25 - Math.max(0, switchCostMs) / 40,
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
    ruleAAccuracyPercent,
    ruleBAccuracyPercent,
    ruleAMeanReactionMs,
    ruleBMeanReactionMs,
    score,
  };
}

export function closeRound(params: {
  runtime: PositionRuleRuntime;
  roundNumber: number;
  startedAtIso: string;
  endedAtIso: string;
}): PositionRuleRoundLog {
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
  rounds: PositionRuleRoundLog[];
}): PositionRuleSessionResult {
  const elapsedMs = Math.max(0, params.endedAtMs - params.startedAtMs);
  const allTrials = params.rounds.flatMap((round) => round.trials);
  const aggregate = computeMetrics(allTrials);

  const interpretation =
    aggregate.score >= 85
      ? "Excelente alternância de regra com baixo custo de troca."
      : aggregate.score >= 70
        ? "Bom desempenho em alternância, com custo de troca moderado."
        : aggregate.score >= 50
          ? "Desempenho intermediário; pratique mudanças rápidas de regra."
          : "Desempenho baixo; priorize acurácia ao alternar topo e baixo.";

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
    overallRuleAAccuracyPercent: aggregate.ruleAAccuracyPercent,
    overallRuleBAccuracyPercent: aggregate.ruleBAccuracyPercent,
    interpretation,
  };
}

export function exportJSON(result: PositionRuleSessionResult): string {
  return JSON.stringify(result, null, 2);
}

function escapeCsv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function exportCSV(result: PositionRuleSessionResult): string {
  const header = [
    "roundNumber",
    "trialIndex",
    "position",
    "rule",
    "trialType",
    "relevantDimension",
    "stimulusColor",
    "stimulusShape",
    "expectedKey",
    "pressedKey",
    "correct",
    "outcome",
    "timedOut",
    "reactionMs",
  ];

  const rows = result.rounds.flatMap((round) =>
    round.trials.map((trial) => [
      String(round.roundNumber),
      String(trial.trialIndex),
      trial.position,
      trial.rule,
      trial.trialType,
      trial.relevantDimension,
      trial.stimulusColor,
      trial.stimulusShape,
      trial.expectedKey,
      trial.pressedKey ?? "",
      trial.correct ? "true" : "false",
      trial.outcome,
      trial.timedOut ? "true" : "false",
      trial.reactionMs != null ? String(trial.reactionMs) : "",
    ]),
  );

  return [header.join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join("\n");
}

export function exportTXT(result: PositionRuleSessionResult): string {
  const lines: string[] = [];
  lines.push("=" + "=".repeat(60));
  lines.push("RESULTADO - TOPO/BAIXO (POSITION-RULE SWITCH)");
  lines.push("=" + "=".repeat(60));
  lines.push("");
  lines.push(`Pontuação final: ${result.finalScore.toFixed(1)}%`);
  lines.push(`Acurácia geral: ${result.overallAccuracyPercent.toFixed(1)}%`);
  lines.push(`RT médio geral: ${result.overallMeanReactionMs.toFixed(0)} ms`);
  lines.push(`RT médio dos acertos: ${result.overallMeanCorrectReactionMs.toFixed(0)} ms`);
  lines.push(`Switch cost: ${result.overallSwitchCostMs.toFixed(0)} ms`);
  lines.push(`Erro repetição: ${result.overallRepeatErrorRatePercent.toFixed(1)}%`);
  lines.push(`Erro troca: ${result.overallSwitchErrorRatePercent.toFixed(1)}%`);
  lines.push(`Acurácia Regra A: ${result.overallRuleAAccuracyPercent.toFixed(1)}%`);
  lines.push(`Acurácia Regra B: ${result.overallRuleBAccuracyPercent.toFixed(1)}%`);
  lines.push("");
  lines.push(`Interpretação: ${result.interpretation}`);
  return lines.join("\n");
}
