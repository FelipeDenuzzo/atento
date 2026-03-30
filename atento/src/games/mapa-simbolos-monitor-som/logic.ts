
export function scheduleSonsEstranhos(
  runtime: SymbolMapSoundRoundRuntime,
  atMs: number,
  rng: () => number = Math.random,
): SomEstranhoEvent | null {
  if (runtime.activeSomEstranho || atMs < runtime.nextSomEstranhoAtMs) {
    return null;
  }
  const somEstranho: SomEstranhoEvent = {
    id: runtime.sonsEstranhos.length + 1,
    startedAtMs: atMs,
    expiresAtMs: atMs + runtime.config.glitchVisibleMs,
  };

  runtime.sonsEstranhos.push(somEstranho);
  runtime.activeSomEstranho = somEstranho;
  runtime.nextSomEstranhoAtMs =
    atMs + randomBetween(runtime.config.glitchIntervalMinMs, runtime.config.glitchIntervalMaxMs, rng);

  return somEstranho;
}
import type {
  AudioEngineController,
  GlitchEvent,
  SymbolGlyph,
  SymbolMapSoundRoundConfig,
  SymbolMapSoundRoundLog,
  SymbolMapSoundRoundMetrics,
  SymbolMapSoundRoundRuntime,
  SymbolMapSoundSessionResult,
  VisualOption,
  VisualRound,
} from "./types";

const SYMBOL_POOL: SymbolGlyph[] = ["◆", "●", "▲", "■", "✦", "⬢", "✚", "⬟", "⬣", "◉", "◈", "⬤"];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(min: number, max: number, rng: () => number): number {
  return min + rng() * (max - min);
}

function shuffled<T>(items: T[], rng: () => number): T[] {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

function pickUniqueGlyphs(count: number, rng: () => number): SymbolGlyph[] {
  return shuffled(SYMBOL_POOL, rng).slice(0, Math.min(count, SYMBOL_POOL.length));
}

function computeRoundMetrics(
  config: SymbolMapSoundRoundConfig,
  attempts: SymbolMapSoundRoundRuntime["visualAttempts"],
  glitches: SymbolMapSoundRoundRuntime["glitches"],
  falseAlarms: number,
): SymbolMapSoundRoundMetrics {
  const hits = attempts.filter((item) => item.outcome === "hit").length;
  const errors = attempts.filter((item) => item.outcome === "error").length;
  const omissions = attempts.filter((item) => item.outcome === "omission").length;
  const totalAttempts = attempts.length;

  const visualRtList = attempts
    .filter((item) => item.outcome !== "omission")
    .map((item) => item.responseMs);

  const visualMeanRt =
    visualRtList.length > 0
      ? visualRtList.reduce((sum, value) => sum + value, 0) / visualRtList.length
      : 0;

  const visualAccuracy = totalAttempts > 0 ? (hits / totalAttempts) * 100 : 0;
  const omissionRate = totalAttempts > 0 ? omissions / totalAttempts : 1;
  const visualSpeedFactor =
    visualRtList.length > 0
      ? 1 - clamp((visualMeanRt - 250) / Math.max(1, config.visualTimeLimitMs - 250), 0, 1)
      : 0;
  const visualScore = clamp(
    visualAccuracy - omissionRate * 20 + visualSpeedFactor * 10,
    0,
    100,
  );

  const glitchesTotal = glitches.length;
  const detected = glitches.filter((item) => item.detectedAtMs != null).length;
  const missed = glitches.filter((item) => item.missed).length;
  const audioRtList = glitches
    .filter((item) => item.reactionMs != null)
    .map((item) => item.reactionMs ?? 0);
  const audioMeanRt =
    audioRtList.length > 0
      ? audioRtList.reduce((sum, value) => sum + value, 0) / audioRtList.length
      : 0;

  const detectionPercent = glitchesTotal > 0 ? (detected / glitchesTotal) * 100 : 0;
  const falseAlarmPenalty = glitchesTotal > 0 ? (falseAlarms / glitchesTotal) * 25 : falseAlarms * 5;
  const audioSpeedFactor =
    audioRtList.length > 0
      ? 1 - clamp((audioMeanRt - 120) / Math.max(1, config.glitchVisibleMs - 120), 0, 1)
      : 0;
  const audioScore = clamp(detectionPercent - falseAlarmPenalty + audioSpeedFactor * 10, 0, 100);

  return {
    visual: {
      hits,
      errors,
      omissions,
      totalAttempts,
      meanResponseMs: visualMeanRt,
      accuracyPercent: visualAccuracy,
      score: visualScore,
    },
    audio: {
      glitchesTotal,
      detected,
      missed,
      falseAlarms,
      meanReactionMs: audioMeanRt,
      detectionPercent,
      score: audioScore,
    },
    dualScore: (visualScore + audioScore) / 2,
  };
}

export function startSession(
  config: SymbolMapSoundRoundConfig,
  rng: () => number = Math.random,
): SymbolMapSoundRoundRuntime {
  return {
    config,
    currentVisualRound: null,
    visualRoundsSpawned: 0,
    visualAttempts: [],
    glitches: [],
    falseAlarms: 0,
    nextVisualAtMs: 0,
    nextGlitchAtMs: randomBetween(config.glitchIntervalMinMs, config.glitchIntervalMaxMs, rng),
    activeGlitch: null,
  };
}

export function spawnVisualRound(
  runtime: SymbolMapSoundRoundRuntime,
  atMs: number,
  rng: () => number = Math.random,
): VisualRound {
  const optionCount = Math.max(2, runtime.config.optionCount);
  const pickedGlyphs = pickUniqueGlyphs(optionCount, rng);
  const targetGlyph = pickedGlyphs[Math.floor(rng() * pickedGlyphs.length)] ?? SYMBOL_POOL[0];

  const options: VisualOption[] = shuffled(
    pickedGlyphs.map((glyph, index) => ({
      id: `opt-${runtime.visualRoundsSpawned + 1}-${index + 1}`,
      glyph,
      isTarget: glyph === targetGlyph,
    })),
    rng,
  );

  const visualRound: VisualRound = {
    id: runtime.visualRoundsSpawned + 1,
    targetGlyph,
    options,
    spawnedAtMs: atMs,
    deadlineAtMs: atMs + runtime.config.visualTimeLimitMs,
  };

  runtime.visualRoundsSpawned += 1;
  runtime.currentVisualRound = visualRound;
  return visualRound;
}

export function validateSymbolClick(params: {
  runtime: SymbolMapSoundRoundRuntime;
  optionId: string;
  atMs: number;
}): {
  accepted: boolean;
  correct: boolean;
  responseMs: number;
} {
  const { runtime, optionId, atMs } = params;
  const activeRound = runtime.currentVisualRound;
  if (!activeRound) {
    return { accepted: false, correct: false, responseMs: 0 };
  }

  const option = activeRound.options.find((item) => item.id === optionId);
  if (!option) {
    return { accepted: false, correct: false, responseMs: 0 };
  }

  const responseMs = Math.max(0, atMs - activeRound.spawnedAtMs);
  const correct = option.isTarget;

  runtime.visualAttempts.push({
    roundVisualId: activeRound.id,
    targetGlyph: activeRound.targetGlyph,
    selectedGlyph: option.glyph,
    atMs,
    responseMs,
    outcome: correct ? "hit" : "error",
  });

  runtime.currentVisualRound = null;
  runtime.nextVisualAtMs = atMs;

  return { accepted: true, correct, responseMs };
}

export function startContinuousAudio(audioContext: AudioContext): AudioEngineController {
  const baseOscillator = audioContext.createOscillator();
  const baseGain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();

  filter.type = "lowpass";
  filter.frequency.value = 520;

  baseOscillator.type = "sine";
  baseOscillator.frequency.value = 185;
  baseGain.gain.value = 0.025;

  baseOscillator.connect(filter);
  filter.connect(baseGain);
  baseGain.connect(audioContext.destination);
  baseOscillator.start();

  // Som estranho (antes: glitch)
  const triggerSomEstranho = () => {
    const now = audioContext.currentTime;

    const somEstranhoOsc = audioContext.createOscillator();
    const somEstranhoGain = audioContext.createGain();

    somEstranhoOsc.type = "square";
    somEstranhoOsc.frequency.setValueAtTime(840, now);
    somEstranhoOsc.frequency.exponentialRampToValueAtTime(380, now + 0.18); // duração aumentada

    somEstranhoGain.gain.setValueAtTime(0.0001, now);
    somEstranhoGain.gain.exponentialRampToValueAtTime(0.12, now + 0.03); // ataque mais suave
    somEstranhoGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22); // duração aumentada

    somEstranhoOsc.connect(somEstranhoGain);
    somEstranhoGain.connect(audioContext.destination);

    const ducked = clamp(baseGain.gain.value * 0.35, 0.0001, 1);
    baseGain.gain.cancelScheduledValues(now);
    baseGain.gain.setValueAtTime(baseGain.gain.value, now);
    baseGain.gain.linearRampToValueAtTime(ducked, now + 0.01);
    baseGain.gain.linearRampToValueAtTime(0.025, now + 0.24); // acompanha duração

    somEstranhoOsc.start(now);
    somEstranhoOsc.stop(now + 0.22); // duração aumentada
  };

  const stop = () => {
    const now = audioContext.currentTime;
    baseGain.gain.cancelScheduledValues(now);
    baseGain.gain.setValueAtTime(baseGain.gain.value, now);
    baseGain.gain.linearRampToValueAtTime(0.0001, now + 0.08);
    baseOscillator.stop(now + 0.1);
  };

  return { triggerSomEstranho, stop };
}

export function scheduleGlitches(
  runtime: SymbolMapSoundRoundRuntime,
  atMs: number,
  rng: () => number = Math.random,
): GlitchEvent | null {
  if (runtime.activeGlitch || atMs < runtime.nextGlitchAtMs) {
    return null;
  }

  const glitch: GlitchEvent = {
    id: runtime.glitches.length + 1,
    startedAtMs: atMs,
    expiresAtMs: atMs + runtime.config.glitchVisibleMs,
  };

  runtime.glitches.push(glitch);
  runtime.activeGlitch = glitch;
  runtime.nextGlitchAtMs =
    atMs + randomBetween(runtime.config.glitchIntervalMinMs, runtime.config.glitchIntervalMaxMs, rng);

  return glitch;
}


export function handleSomEstranhoResponse(params: {
  runtime: SymbolMapSoundRoundRuntime;
  atMs: number;
}): { detected: boolean; falseAlarm: boolean; reactionMs: number } {
  const { runtime, atMs } = params;

  if (!runtime.activeSomEstranho) {
    runtime.falseAlarms += 1;
    return { detected: false, falseAlarm: true, reactionMs: 0 };
  }

  if (runtime.activeSomEstranho.detectedAtMs != null) {
    runtime.falseAlarms += 1;
    return { detected: false, falseAlarm: true, reactionMs: 0 };
  }

  const reactionMs = Math.max(0, atMs - runtime.activeSomEstranho.startedAtMs);
  runtime.activeSomEstranho.detectedAtMs = atMs;
  runtime.activeSomEstranho.reactionMs = reactionMs;
  runtime.activeSomEstranho = null;

  return { detected: true, falseAlarm: false, reactionMs };
}

export function updateRuntime(
  runtime: SymbolMapSoundRoundRuntime,
  atMs: number,
  rng: () => number = Math.random,
): void {
  if (!runtime.currentVisualRound && atMs >= runtime.nextVisualAtMs) {
    spawnVisualRound(runtime, atMs, rng);
  }

  const activeVisual = runtime.currentVisualRound;
  if (activeVisual && atMs >= activeVisual.deadlineAtMs) {
    runtime.visualAttempts.push({
      roundVisualId: activeVisual.id,
      targetGlyph: activeVisual.targetGlyph,
      atMs: activeVisual.deadlineAtMs,
      responseMs: runtime.config.visualTimeLimitMs,
      outcome: "omission",
    });
    runtime.currentVisualRound = null;
    runtime.nextVisualAtMs = atMs;
  }
  // Agendamento do som estranho
  scheduleSonsEstranhos(runtime, atMs, rng);

  scheduleGlitches(runtime, atMs, rng);

  if (runtime.activeGlitch && atMs >= runtime.activeGlitch.expiresAtMs) {
    if (runtime.activeGlitch.detectedAtMs == null) {
      runtime.activeGlitch.missed = true;
    }
    runtime.activeGlitch = null;
  }
}

export function closeRound(params: {
  runtime: SymbolMapSoundRoundRuntime;
  roundNumber: number;
  startedAtIso: string;
  endedAtIso: string;
}): SymbolMapSoundRoundLog {
  const { runtime, roundNumber, startedAtIso, endedAtIso } = params;

  if (runtime.currentVisualRound) {
    runtime.visualAttempts.push({
      roundVisualId: runtime.currentVisualRound.id,
      targetGlyph: runtime.currentVisualRound.targetGlyph,
      atMs: runtime.currentVisualRound.deadlineAtMs,
      responseMs: runtime.config.visualTimeLimitMs,
      outcome: "omission",
    });
    runtime.currentVisualRound = null;
  }

  if (runtime.activeGlitch && runtime.activeGlitch.detectedAtMs == null) {
    runtime.activeGlitch.missed = true;
    runtime.activeGlitch = null;
  }

  const metrics = computeRoundMetrics(
    runtime.config,
    runtime.visualAttempts,
    runtime.glitches,
    runtime.falseAlarms,
  );

  return {
    roundNumber,
    roundName: runtime.config.name,
    startedAtIso,
    endedAtIso,
    config: runtime.config,
    metrics,
    visualAttempts: runtime.visualAttempts.map((item) => ({ ...item })),
    glitches: runtime.glitches.map((item) => ({ ...item })),
  };
}

export function computeScores(params: {
  startedAtMs: number;
  endedAtMs: number;
  rounds: SymbolMapSoundRoundLog[];
}): SymbolMapSoundSessionResult {
  const { startedAtMs, endedAtMs, rounds } = params;
  const safeRoundCount = Math.max(1, rounds.length);

  const visualScore =
    rounds.reduce((sum, round) => sum + round.metrics.visual.score, 0) / safeRoundCount;
  const audioScore =
    rounds.reduce((sum, round) => sum + round.metrics.audio.score, 0) / safeRoundCount;
  const finalScore = (visualScore * 0.5) + (audioScore * 0.5);

  const totalVisualHits = rounds.reduce((sum, round) => sum + round.metrics.visual.hits, 0);
  const totalVisualErrors = rounds.reduce((sum, round) => sum + round.metrics.visual.errors, 0);
  const totalVisualOmissions = rounds.reduce((sum, round) => sum + round.metrics.visual.omissions, 0);

  const totalAudioDetected = rounds.reduce((sum, round) => sum + round.metrics.audio.detected, 0);
  const totalAudioMissed = rounds.reduce((sum, round) => sum + round.metrics.audio.missed, 0);
  const totalAudioFalseAlarms = rounds.reduce((sum, round) => sum + round.metrics.audio.falseAlarms, 0);

  const visualRtList = rounds
    .flatMap((round) => round.visualAttempts)
    .filter((item) => item.outcome !== "omission")
    .map((item) => item.responseMs);

  const audioRtList = rounds
    .flatMap((round) => round.glitches)
    .filter((item) => item.reactionMs != null)
    .map((item) => item.reactionMs ?? 0);

  const meanVisualResponseMs =
    visualRtList.length > 0
      ? visualRtList.reduce((sum, value) => sum + value, 0) / visualRtList.length
      : 0;

  const meanAudioReactionMs =
    audioRtList.length > 0
      ? audioRtList.reduce((sum, value) => sum + value, 0) / audioRtList.length
      : 0;

  return {
    startedAtIso: new Date(startedAtMs).toISOString(),
    endedAtIso: new Date(endedAtMs).toISOString(),
    elapsedMs: Math.max(0, endedAtMs - startedAtMs),
    rounds,
    finalScore,
    visualScore,
    audioScore,
    totalVisualHits,
    totalVisualErrors,
    totalVisualOmissions,
    totalAudioDetected,
    totalAudioMissed,
    totalAudioFalseAlarms,
    meanVisualResponseMs,
    meanAudioReactionMs,
  };
}

export function exportTXT(result: SymbolMapSoundSessionResult): string {
  const lines: string[] = [];
  lines.push("=" + "=".repeat(60));
  lines.push("RESULTADO - MAPA DE SÍMBOLOS + MONITOR DE SOM");
  lines.push("=" + "=".repeat(60));
  lines.push("");
  lines.push(`Tempo total: ${(result.elapsedMs / 1000).toFixed(1)} s`);
  lines.push(`Pontuação total: ${result.finalScore.toFixed(1)}%`);
  lines.push(`Pontuação visual: ${result.visualScore.toFixed(1)}%`);
  lines.push(`Pontuação auditiva: ${result.audioScore.toFixed(1)}%`);
  lines.push("");
  lines.push(`Visual - acertos: ${result.totalVisualHits}`);
  lines.push(`Visual - erros: ${result.totalVisualErrors}`);
  lines.push(`Visual - omissões: ${result.totalVisualOmissions}`);
  lines.push(`Visual - tempo médio: ${result.meanVisualResponseMs.toFixed(0)} ms`);
  lines.push("");
  lines.push(`Auditivo - detecções: ${result.totalAudioDetected}`);
  lines.push(`Auditivo - omissões: ${result.totalAudioMissed}`);
  lines.push(`Auditivo - falsos alarmes: ${result.totalAudioFalseAlarms}`);
  lines.push(`Auditivo - reação média: ${result.meanAudioReactionMs.toFixed(0)} ms`);
  lines.push("");

  result.rounds.forEach((round) => {
    lines.push(`${round.roundName}`);
    lines.push(`- Visual: hits ${round.metrics.visual.hits}, erros ${round.metrics.visual.errors}, omissões ${round.metrics.visual.omissions}, score ${round.metrics.visual.score.toFixed(1)}%`);
    lines.push(`- Auditivo: detectadas ${round.metrics.audio.detected}/${round.metrics.audio.glitchesTotal}, falsos alarmes ${round.metrics.audio.falseAlarms}, score ${round.metrics.audio.score.toFixed(1)}%`);
    lines.push(`- Dual score: ${round.metrics.dualScore.toFixed(1)}%`);
  });

  lines.push("");
  lines.push(`Finalizado em: ${new Date(result.endedAtIso).toLocaleString("pt-BR")}`);
  return lines.join("\n");
}

export function exportJSON(result: SymbolMapSoundSessionResult): string {
  return JSON.stringify(result, null, 2);
}

export function exportCSV(result: SymbolMapSoundSessionResult): string {
  const header = [
    "round",
    "visual_hits",
    "visual_errors",
    "visual_omissions",
    "visual_mean_rt_ms",
    "visual_score",
    "audio_glitches_total",
    "audio_detected",
    "audio_missed",
    "audio_false_alarms",
    "audio_mean_rt_ms",
    "audio_score",
    "dual_score",
  ];

  const rows = result.rounds.map((round) => [
    round.roundNumber,
    round.metrics.visual.hits,
    round.metrics.visual.errors,
    round.metrics.visual.omissions,
    round.metrics.visual.meanResponseMs.toFixed(2),
    round.metrics.visual.score.toFixed(2),
    round.metrics.audio.glitchesTotal,
    round.metrics.audio.detected,
    round.metrics.audio.missed,
    round.metrics.audio.falseAlarms,
    round.metrics.audio.meanReactionMs.toFixed(2),
    round.metrics.audio.score.toFixed(2),
    round.metrics.dualScore.toFixed(2),
  ]);

  return [header.join(","), ...rows.map((row) => row.join(","))].join("\n");
}
