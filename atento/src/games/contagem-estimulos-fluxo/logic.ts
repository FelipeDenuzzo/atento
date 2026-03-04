import {
  CountingFlowLevelConfig,
  CountingFlowResult,
  CountingFlowSessionLog,
  CountingFlowStimulus,
} from "./types";

export const COUNTING_FLOW_LOG_KEY = "atento.countingFlowTask.logs";

function randomItem<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)];
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const cloned = [...items];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

export function generateStimulusSequence(
  level: CountingFlowLevelConfig,
  rng: () => number = Math.random,
): CountingFlowStimulus[] {
  const targetCount = Math.round(level.totalStimuli * level.targetProbability);
  const distractorCount = level.totalStimuli - targetCount;

  const stimuli: CountingFlowStimulus[] = [];

  for (let i = 0; i < targetCount; i += 1) {
    stimuli.push({
      index: i,
      isTarget: true,
      modality: level.modality,
      visual: level.targetVisual,
    });
  }

  for (let i = 0; i < distractorCount; i += 1) {
    stimuli.push({
      index: targetCount + i,
      isTarget: false,
      modality: level.modality,
      visual: randomItem(level.distractorVisuals, rng),
    });
  }

  return shuffle(stimuli, rng).map((stimulus, index) => ({
    ...stimulus,
    index,
  }));
}

export function countTargets(sequence: CountingFlowStimulus[]): number {
  return sequence.filter((item) => item.isTarget).length;
}

export function evaluateAnswer(
  actualTargetCount: number,
  playerAnswer: number,
): CountingFlowResult {
  const absoluteError = Math.abs(actualTargetCount - playerAnswer);

  let estimationDirection: CountingFlowResult["estimationDirection"] = "exact";
  if (playerAnswer < actualTargetCount) {
    estimationDirection = "under";
  } else if (playerAnswer > actualTargetCount) {
    estimationDirection = "over";
  }

  return {
    actualTargetCount,
    playerAnswer,
    absoluteError,
    estimationDirection,
  };
}

export function getPerformanceBand(absoluteError: number): string {
  if (absoluteError <= 1) return "Excelente";
  if (absoluteError <= 3) return "Bom";
  return "Precisa de mais treino";
}

export function buildSessionLog(
  level: CountingFlowLevelConfig,
  result: CountingFlowResult,
): CountingFlowSessionLog {
  return {
    dateIso: new Date().toISOString(),
    levelId: level.id,
    levelName: level.name,
    config: {
      modality: level.modality,
      totalStimuli: level.totalStimuli,
      stimulusDurationMs: level.stimulusDurationMs,
      isiMs: level.isiMs,
      targetProbability: level.targetProbability,
    },
    result,
  };
}

export function saveSessionLog(log: CountingFlowSessionLog): void {
  if (typeof window === "undefined") return;

  try {
    const raw = localStorage.getItem(COUNTING_FLOW_LOG_KEY);
    const current: CountingFlowSessionLog[] = raw ? JSON.parse(raw) : [];
    current.push(log);
    localStorage.setItem(COUNTING_FLOW_LOG_KEY, JSON.stringify(current));
  } catch (error) {
    console.error("Failed to save counting flow session log:", error);
  }
}
