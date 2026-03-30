import type {
  ClassificationEvent,
  ClassificationMetrics,
  ClassificationMode,
  ClassificationOutcome,
  MemoryCheck,
  MemoryMetrics,
  MemoryMode,
  RapidMemoryRoundConfig,
  RapidMemoryRoundLog,
  RapidMemoryRoundMetrics,
  RapidMemoryRoundRuntime,
  RapidMemorySessionResult,
  Stimulus,
} from "./types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(min: number, max: number, rng: () => number): number {
  return min + rng() * (max - min);
}

function normalizeKey(key: string): string {
  return key.trim().toLowerCase();
}

function isVowel(value: string): boolean {
  return ["A", "E", "I", "O", "U"].includes(value.toUpperCase());
}

function sampleUnique<T>(pool: T[], count: number, rng: () => number): T[] {
  const clone = [...pool];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const temp = clone[i];
    clone[i] = clone[j] as T;
    clone[j] = temp as T;
  }
  return clone.slice(0, Math.max(0, Math.min(count, clone.length)));
}

function scheduleNextMemoryCheck(
  runtime: RapidMemoryRoundRuntime,
  atMs: number,
  rng: () => number,
): void {
  const interval = randomBetween(
    runtime.config.memoryCheckMinIntervalMs,
    runtime.config.memoryCheckMaxIntervalMs,
    rng,
  );
  runtime.nextMemoryCheckAtMs = atMs + Math.round(interval);
}

function classifyValue(
  mode: ClassificationMode,
  value: string,
): { category: "left" | "right"; isMemoryTarget: boolean } {
  if (mode === "number") {
    const numberValue = Number(value);
    const isEven = numberValue % 2 === 0;
    return {
      category: isEven ? "left" : "right",
      isMemoryTarget: isEven,
    };
  }

  const vowel = isVowel(value);
  return {
    category: vowel ? "left" : "right",
    isMemoryTarget: vowel,
  };
}

function buildPromptForCheck(
  runtime: RapidMemoryRoundRuntime,
  correctValue: string,
): string {
  if (runtime.config.memoryMode === "last-targets") {
    return "Qual foi o penúltimo alvo?";
  }

  if (runtime.config.classificationMode === "number") {
    return "Quantas vezes o número 7 apareceu desde a última checagem?";
  }

  return "Quantas vogais apareceram desde a última checagem?";
}

function buildLastTargetsOptions(
  runtime: RapidMemoryRoundRuntime,
  correctValue: string,
  rng: () => number,
): string[] {
  const alternatives = runtime.config.alternativesCount;

  const pool = runtime.config.classificationMode === "number"
    ? ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]
    : [
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
        "G",
        "H",
        "I",
        "J",
        "K",
        "L",
        "M",
        "N",
        "O",
        "P",
        "Q",
        "R",
        "S",
        "T",
        "U",
        "V",
        "W",
        "X",
        "Y",
        "Z",
      ];

  const distractors = sampleUnique(
    pool.filter((value) => value !== correctValue),
    Math.max(0, alternatives - 1),
    rng,
  );

  const merged = [correctValue, ...distractors];
  return sampleUnique(merged, merged.length, rng);
}

function buildCounterOptions(
  runtime: RapidMemoryRoundRuntime,
  correctCount: number,
  rng: () => number,
): string[] {
  const alternatives = runtime.config.alternativesCount;
  const nearby = [
    correctCount,
    Math.max(0, correctCount - 1),
    Math.max(0, correctCount + 1),
    Math.max(0, correctCount + 2),
    Math.max(0, correctCount - 2),
    Math.max(0, correctCount + 3),
    Math.max(0, correctCount - 3),
  ];

  const uniqueValues = Array.from(new Set(nearby));
  const distractors = sampleUnique(
    uniqueValues.filter((value) => value !== correctCount),
    Math.max(0, alternatives - 1),
    rng,
  );

  const merged = [correctCount, ...distractors].map((value) => String(value));
  return sampleUnique(merged, merged.length, rng);
}

function classifyScore(
  metrics: Omit<ClassificationMetrics, "score">,
  visibleMs: number,
): number {
  if (metrics.total <= 0) return 0;
  const accuracy = metrics.hits / metrics.total;
  const errorRate = metrics.errors / metrics.total;
  const omissionRate = metrics.omissions / metrics.total;

  const speedFactor =
    metrics.meanReactionMs > 0
      ? 1 - clamp((metrics.meanReactionMs - 220) / Math.max(1, visibleMs - 220), 0, 1)
      : 0;

  return clamp(accuracy * 100 - errorRate * 18 - omissionRate * 22 + speedFactor * 10, 0, 100);
}

function memoryScore(metrics: Omit<MemoryMetrics, "score">): number {
  if (metrics.totalChecks <= 0) return 0;
  const accuracy = metrics.hits / metrics.totalChecks;
  const errorRate = metrics.errors / metrics.totalChecks;
  const speedFactor =
    metrics.meanReactionMs > 0
      ? 1 - clamp((metrics.meanReactionMs - 350) / 1450, 0, 1)
      : 0;

  return clamp(accuracy * 100 - errorRate * 18 + speedFactor * 10, 0, 100);
}

function ensureStimulusOmission(runtime: RapidMemoryRoundRuntime, atMs: number): void {
  const active = runtime.activeStimulus;
  if (!active) return;
  if (atMs < active.deadlineMs) return;

  runtime.classificationEvents.push({
    stimulusId: active.id,
    value: active.value,
    expectedCategory: active.category,
    expectedKey:
      active.category === "left"
        ? normalizeKey(runtime.config.keyMap.left)
        : normalizeKey(runtime.config.keyMap.right),
    shownAtMs: active.shownAtMs,
    deadlineMs: active.deadlineMs,
    outcome: "omission",
  });

  runtime.activeStimulus = null;
  runtime.nextStimulusAtMs = atMs + runtime.config.interStimulusMs;
}

function checkClassificationTotals(events: ClassificationEvent[]): {
  total: number;
  hits: number;
  errors: number;
  omissions: number;
  meanReactionMs: number;
} {
  const total = events.length;
  const hits = events.filter((event) => event.outcome === "hit").length;
  const errors = events.filter((event) => event.outcome === "error").length;
  const omissions = events.filter((event) => event.outcome === "omission").length;

  const rtList = events
    .filter((event) => event.outcome !== "omission" && event.reactionMs != null)
    .map((event) => event.reactionMs ?? 0);

  const meanReactionMs =
    rtList.length > 0 ? rtList.reduce((sum, value) => sum + value, 0) / rtList.length : 0;

  return { total, hits, errors, omissions, meanReactionMs };
}

function checkMemoryTotals(checks: MemoryCheck[]): {
  totalChecks: number;
  hits: number;
  errors: number;
  meanReactionMs: number;
} {
  const answered = checks.filter((check) => check.answeredAtMs != null);
  const totalChecks = answered.length;
  const hits = answered.filter((check) => check.correct).length;
  const errors = answered.filter((check) => check.correct === false).length;

  const rtList = answered
    .filter((check) => check.reactionMs != null)
    .map((check) => check.reactionMs ?? 0);

  const meanReactionMs =
    rtList.length > 0 ? rtList.reduce((sum, value) => sum + value, 0) / rtList.length : 0;

  return { totalChecks, hits, errors, meanReactionMs };
}

export function startSession(
  config: RapidMemoryRoundConfig,
  rng: () => number = Math.random,
): RapidMemoryRoundRuntime {
  const runtime: RapidMemoryRoundRuntime = {
    config,
    activeStimulus: null,
    activeMemoryCheck: null,
    nextStimulusAtMs: 0,
    nextMemoryCheckAtMs: 0,
    stimulusSeq: 1,
    memoryCheckSeq: 1,
    memoryState:
      config.memoryMode === "last-targets"
        ? { mode: "last-targets", recentTargets: [] }
        : { mode: "mental-counter", counterSinceLastCheck: 0 },
    classificationEvents: [],
    memoryChecks: [],
    stimuliShown: 0,
  };

  scheduleNextMemoryCheck(runtime, 0, rng);
  return runtime;
}

export function spawnStimulus(
  runtime: RapidMemoryRoundRuntime,
  atMs: number,
  rng: () => number = Math.random,
): Stimulus | null {
  if (runtime.activeMemoryCheck) return null;

  ensureStimulusOmission(runtime, atMs);

  if (runtime.activeStimulus || atMs < runtime.nextStimulusAtMs) {
    return null;
  }

  const value =
    runtime.config.classificationMode === "number"
      ? String(Math.floor(rng() * 10))
      : String.fromCharCode(65 + Math.floor(rng() * 26));

  const { category, isMemoryTarget } = classifyValue(runtime.config.classificationMode, value);

  const stimulus: Stimulus = {
    id: runtime.stimulusSeq,
    value,
    category,
    isMemoryTarget,
    shownAtMs: atMs,
    deadlineMs: atMs + runtime.config.stimulusVisibleMs,
  };

  runtime.stimulusSeq += 1;
  runtime.stimuliShown += 1;
  runtime.activeStimulus = stimulus;

  return stimulus;
}

export function validateClassificationAnswer(params: {
  runtime: RapidMemoryRoundRuntime;
  key: string;
  atMs: number;
}): { accepted: boolean; correct: boolean; outcome?: ClassificationOutcome } {
  const { runtime, key, atMs } = params;
  const normalizedKey = normalizeKey(key);

  const validLeft = normalizeKey(runtime.config.keyMap.left);
  const validRight = normalizeKey(runtime.config.keyMap.right);
  if (normalizedKey !== validLeft && normalizedKey !== validRight) {
    return { accepted: false, correct: false };
  }

  ensureStimulusOmission(runtime, atMs);
  const active = runtime.activeStimulus;
  if (!active) {
    return { accepted: false, correct: false };
  }

  const expectedKey =
    active.category === "left"
      ? normalizeKey(runtime.config.keyMap.left)
      : normalizeKey(runtime.config.keyMap.right);

  const correct = normalizedKey === expectedKey;
  runtime.classificationEvents.push({
    stimulusId: active.id,
    value: active.value,
    expectedCategory: active.category,
    expectedKey,
    shownAtMs: active.shownAtMs,
    deadlineMs: active.deadlineMs,
    respondedAtMs: atMs,
    responseKey: normalizedKey,
    reactionMs: Math.max(0, atMs - active.shownAtMs),
    outcome: correct ? "hit" : "error",
  });

  updateMemoryState(runtime, active);

  runtime.activeStimulus = null;
  runtime.nextStimulusAtMs = atMs + runtime.config.interStimulusMs;

  return { accepted: true, correct, outcome: correct ? "hit" : "error" };
}

export function updateMemoryState(
  runtime: RapidMemoryRoundRuntime,
  stimulus: Stimulus,
): void {
  if (runtime.memoryState.mode === "last-targets") {
    if (stimulus.isMemoryTarget) {
      runtime.memoryState.recentTargets = [
        ...runtime.memoryState.recentTargets,
        stimulus.value,
      ].slice(-2);
    }
    return;
  }

  if (runtime.config.classificationMode === "number") {
    if (stimulus.value === "7") {
      runtime.memoryState.counterSinceLastCheck += 1;
    }
    return;
  }

  if (isVowel(stimulus.value)) {
    runtime.memoryState.counterSinceLastCheck += 1;
  }
}

export function triggerMemoryCheck(
  runtime: RapidMemoryRoundRuntime,
  atMs: number,
  rng: () => number = Math.random,
): MemoryCheck | null {
  if (runtime.activeMemoryCheck || atMs < runtime.nextMemoryCheckAtMs) {
    return null;
  }

  // Sorteio do tipo de checagem: 0 = último, 1 = penúltimo, 2 = contagem
  const checkType = Math.floor(rng() * 3);
  let prompt = "";
  let options: string[] = [];
  let correctValue = "";

  // Coletar todos os alvos apresentados desde a última checagem
  const presentedTargets = runtime.memoryState.mode === "last-targets"
    ? [...runtime.memoryState.recentTargets]
    : [];
  // Para contagem, coletar todos os estímulos apresentados desde a última checagem
  const allStimuli = runtime.classificationEvents
    .filter(e => e.outcome === "hit" || e.outcome === "error")
    .map(e => e.value);

  if (checkType === 0) {
    // Último alvo apresentado
    const last = presentedTargets[presentedTargets.length - 1] ?? "-";
    correctValue = last;
    prompt = "Qual foi o último alvo apresentado?";
    options = buildLastTargetsOptions(runtime, correctValue, rng);
  } else if (checkType === 1) {
    // Penúltimo alvo apresentado
    const penultimo = presentedTargets[presentedTargets.length - 2] ?? "-";
    correctValue = penultimo;
    prompt = "Qual foi o penúltimo alvo apresentado?";
    options = buildLastTargetsOptions(runtime, correctValue, rng);
  } else {
    // Contagem de um item específico apresentado
    // Escolher um dos itens apresentados aleatoriamente
    const unique = Array.from(new Set(allStimuli));
    const item = unique.length > 0 ? unique[Math.floor(rng() * unique.length)] : "-";
    correctValue = String(allStimuli.filter(v => v === item).length);
    prompt = `Quantas vezes o item '${item}' apareceu desde a última checagem?`;
    options = buildCounterOptions(runtime, Number(correctValue), rng);
  }

  const correctOptionIndex = options.findIndex((item) => item === correctValue);
  const check: MemoryCheck = {
    id: runtime.memoryCheckSeq,
    mode: runtime.config.memoryMode,
    askedAtMs: atMs,
    prompt,
    options,
    correctOptionIndex: correctOptionIndex >= 0 ? correctOptionIndex : 0,
  };

  runtime.memoryCheckSeq += 1;
  runtime.memoryChecks.push(check);
  runtime.activeMemoryCheck = check;
  scheduleNextMemoryCheck(runtime, atMs, rng);

  return check;
}

export function validateMemoryCheckAnswer(params: {
  runtime: RapidMemoryRoundRuntime;
  optionIndex: number;
  atMs: number;
}): { accepted: boolean; correct: boolean } {
  const { runtime, optionIndex, atMs } = params;
  const active = runtime.activeMemoryCheck;
  if (!active) {
    return { accepted: false, correct: false };
  }

  if (optionIndex < 0 || optionIndex >= active.options.length) {
    return { accepted: false, correct: false };
  }

  const correct = optionIndex === active.correctOptionIndex;
  active.selectedOptionIndex = optionIndex;
  active.correct = correct;
  active.answeredAtMs = atMs;
  active.reactionMs = Math.max(0, atMs - active.askedAtMs);

  if (runtime.memoryState.mode === "mental-counter") {
    runtime.memoryState.counterSinceLastCheck = 0;
  }

  runtime.activeMemoryCheck = null;
  return { accepted: true, correct };
}

export function computeScores(params: {
  startedAtMs: number;
  endedAtMs: number;
  rounds: RapidMemoryRoundLog[];
}): RapidMemorySessionResult {
  const elapsedMs = Math.max(0, params.endedAtMs - params.startedAtMs);
  const roundsCount = Math.max(1, params.rounds.length);

  const classificationScore =
    params.rounds.reduce((sum, round) => sum + round.metrics.classification.score, 0) / roundsCount;
  const memoryScore =
    params.rounds.reduce((sum, round) => sum + round.metrics.memory.score, 0) / roundsCount;

  const totalClassificationHits = params.rounds.reduce(
    (sum, round) => sum + round.metrics.classification.hits,
    0,
  );
  const totalClassificationErrors = params.rounds.reduce(
    (sum, round) => sum + round.metrics.classification.errors,
    0,
  );
  const totalClassificationOmissions = params.rounds.reduce(
    (sum, round) => sum + round.metrics.classification.omissions,
    0,
  );

  const totalMemoryChecks = params.rounds.reduce(
    (sum, round) => sum + round.metrics.memory.totalChecks,
    0,
  );
  const totalMemoryHits = params.rounds.reduce(
    (sum, round) => sum + round.metrics.memory.hits,
    0,
  );
  const totalMemoryErrors = params.rounds.reduce(
    (sum, round) => sum + round.metrics.memory.errors,
    0,
  );

  const meanClassificationReactionMs =
    params.rounds.reduce((sum, round) => sum + round.metrics.classification.meanReactionMs, 0) /
    roundsCount;
  const meanMemoryReactionMs =
    params.rounds.reduce((sum, round) => sum + round.metrics.memory.meanReactionMs, 0) /
    roundsCount;

  const finalScore = clamp((classificationScore + memoryScore) / 2, 0, 100);

  const interpretation =
    finalScore >= 85
      ? "Excelente equilíbrio entre velocidade de decisão e atualização de memória."
      : finalScore >= 70
        ? "Bom desempenho dual-task, com espaço para ganhar consistência sob interferência."
        : finalScore >= 50
          ? "Desempenho intermediário; priorize precisão na classificação sem perder a memória ativa."
          : "Desempenho baixo nesta sessão; reduza o ritmo inicial e aumente gradualmente.";

  return {
    startedAtIso: new Date(params.startedAtMs).toISOString(),
    endedAtIso: new Date(params.endedAtMs).toISOString(),
    elapsedMs,
    rounds: params.rounds,
    classificationScore,
    memoryScore,
    finalScore,
    totalClassificationHits,
    totalClassificationErrors,
    totalClassificationOmissions,
    meanClassificationReactionMs,
    totalMemoryChecks,
    totalMemoryHits,
    totalMemoryErrors,
    meanMemoryReactionMs,
    interpretation,
  };
}

export function buildRoundLog(params: {
  runtime: RapidMemoryRoundRuntime;
  roundNumber: number;
  startedAtIso: string;
  endedAtIso: string;
}): RapidMemoryRoundLog {
  ensureStimulusOmission(params.runtime, params.runtime.config.durationMs + 1);

  const classificationTotals = checkClassificationTotals(params.runtime.classificationEvents);
  const memoryTotals = checkMemoryTotals(params.runtime.memoryChecks);

  const classification: ClassificationMetrics = {
    ...classificationTotals,
    score: classifyScore(classificationTotals, params.runtime.config.stimulusVisibleMs),
  };

  const memory: MemoryMetrics = {
    ...memoryTotals,
    score: memoryScore(memoryTotals),
  };

  const metrics: RapidMemoryRoundMetrics = {
    durationMs: params.runtime.config.durationMs,
    classification,
    memory,
    finalScore: clamp((classification.score + memory.score) / 2, 0, 100),
  };

  return {
    roundNumber: params.roundNumber,
    roundName: params.runtime.config.name,
    startedAtIso: params.startedAtIso,
    endedAtIso: params.endedAtIso,
    config: params.runtime.config,
    metrics,
    classificationEvents: params.runtime.classificationEvents.map((item) => ({ ...item })),
    memoryChecks: params.runtime.memoryChecks.map((item) => ({ ...item })),
  };
}

function escapeCsv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function exportTXT(result: RapidMemorySessionResult): string {
  const lines: string[] = [];
  lines.push("=" + "=".repeat(60));
  lines.push("RESULTADO - CLASSIFICAÇÃO RÁPIDA + MEMÓRIA ATUALIZÁVEL");
  lines.push("=" + "=".repeat(60));
  lines.push("");
  lines.push(`Tempo total: ${(result.elapsedMs / 1000).toFixed(1)} s`);
  lines.push(`Pontuação final: ${result.finalScore.toFixed(1)}%`);
  lines.push(`Classificação rápida: ${result.classificationScore.toFixed(1)}%`);
  lines.push(`Memória atualizável: ${result.memoryScore.toFixed(1)}%`);
  lines.push("");
  lines.push(
    `Classificação — acertos ${result.totalClassificationHits}, erros ${result.totalClassificationErrors}, omissões ${result.totalClassificationOmissions}, RT médio ${result.meanClassificationReactionMs.toFixed(0)} ms`,
  );
  lines.push(
    `Memória — checagens ${result.totalMemoryChecks}, acertos ${result.totalMemoryHits}, erros ${result.totalMemoryErrors}, RT médio ${result.meanMemoryReactionMs.toFixed(0)} ms`,
  );
  lines.push("");
  lines.push(`Interpretação: ${result.interpretation}`);
  lines.push("");

  result.rounds.forEach((round) => {
    lines.push(`${round.roundName}`);
    lines.push(
      `- Classificação: ${round.metrics.classification.hits}/${round.metrics.classification.total} (score ${round.metrics.classification.score.toFixed(1)}%)`,
    );
    lines.push(
      `- Memória: ${round.metrics.memory.hits}/${round.metrics.memory.totalChecks} (score ${round.metrics.memory.score.toFixed(1)}%)`,
    );
    lines.push(`- Score da fase: ${round.metrics.finalScore.toFixed(1)}%`);
  });

  lines.push("");
  lines.push(`Finalizado em: ${new Date(result.endedAtIso).toLocaleString("pt-BR")}`);
  return lines.join("\n");
}

export function exportJSON(result: RapidMemorySessionResult): string {
  return JSON.stringify(result, null, 2);
}

export function exportCSV(result: RapidMemorySessionResult): string {
  const headers = [
    "startedAt",
    "endedAt",
    "elapsedMs",
    "classificationScore",
    "memoryScore",
    "finalScore",
    "totalClassificationHits",
    "totalClassificationErrors",
    "totalClassificationOmissions",
    "meanClassificationReactionMs",
    "totalMemoryChecks",
    "totalMemoryHits",
    "totalMemoryErrors",
    "meanMemoryReactionMs",
    "interpretation",
    "rounds",
  ];

  const row = [
    result.startedAtIso,
    result.endedAtIso,
    String(result.elapsedMs),
    result.classificationScore.toFixed(2),
    result.memoryScore.toFixed(2),
    result.finalScore.toFixed(2),
    String(result.totalClassificationHits),
    String(result.totalClassificationErrors),
    String(result.totalClassificationOmissions),
    result.meanClassificationReactionMs.toFixed(2),
    String(result.totalMemoryChecks),
    String(result.totalMemoryHits),
    String(result.totalMemoryErrors),
    result.meanMemoryReactionMs.toFixed(2),
    result.interpretation,
    JSON.stringify(result.rounds),
  ];

  return [headers.join(","), row.map(escapeCsv).join(",")].join("\n");
}
