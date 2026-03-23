import { ColorId, FallingShape, LevelSummary, SessionLog, SessionSummary } from "./types";

export const COLOR_FILTER_LOG_KEY = "atento.filtroCoresComSom.logs";

export function getNextTargetColor(
  availableColors: ColorId[],
  current: ColorId,
  rng: () => number = Math.random,
): ColorId {
  if (availableColors.length <= 1) return current;
  const alternatives = availableColors.filter((color) => color !== current);
  return alternatives[Math.floor(rng() * alternatives.length)] ?? current;
}

export function hitTestShape(
  shapes: FallingShape[],
  point: { x: number; y: number },
): FallingShape | null {
  for (let i = shapes.length - 1; i >= 0; i -= 1) {
    const shape = shapes[i];
    if (shape.isCaptured) continue;
    const dx = point.x - shape.x;
    const dy = point.y - shape.y;

    if (shape.kind === "círculo") {
      if (dx * dx + dy * dy <= shape.size * shape.size) {
        return shape;
      }
    } else if (shape.kind === "quadrado" || shape.kind === "triângulo") {
      if (Math.abs(dx) <= shape.size && Math.abs(dy) <= shape.size) {
        return shape;
      }
    }
  }

  return null;
}

export function shouldSpawnShape(
  shapes: FallingShape[],
  maxSimultaneousShapes: number,
): boolean {
  const activeCount = shapes.filter((shape) => !shape.isCaptured).length;
  return activeCount < maxSimultaneousShapes;
}

export function updateShapes(
  shapes: FallingShape[],
  deltaSeconds: number,
  fallSpeed: number,
  height: number,
  now: number,
): FallingShape[] {
  return shapes
    .map((shape) => ({
      ...shape,
      y: shape.y + fallSpeed * deltaSeconds,
    }))
    .filter((shape) => {
      if (shape.capturedAt && now - shape.capturedAt > 200) {
        return false;
      }
      return shape.y - shape.size <= height + shape.size;
    });
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function buildSessionSummary(levels: LevelSummary[]): SessionSummary {
  const totalHits = levels.reduce((sum, level) => sum + level.hits, 0);
  const totalErrors = levels.reduce((sum, level) => sum + level.errors, 0);
  const reactionTimes = levels
    .map((level) => level.averageReactionMs)
    .filter((value): value is number => value !== null);
  const averageReactionMs = average(reactionTimes);
  const totalActions = totalHits + totalErrors;
  const accuracy = totalActions > 0 ? totalHits / totalActions : 0;

  return {
    totalHits,
    totalErrors,
    averageReactionMs,
    accuracy,
  };
}

export function saveSessionLog(
  levelSummaries: LevelSummary[],
  context?: { mode: "single" | "sequence"; scopeLabel: string },
): SessionLog | null {
  if (typeof window === "undefined") return null;

  const summary = buildSessionSummary(levelSummaries);
  const log: SessionLog = {
    dateIso: new Date().toISOString(),
    ...(context
      ? {
          session: {
            mode: context.mode,
            scopeLabel: context.scopeLabel,
          },
        }
      : {}),
    levelSummaries,
    summary,
  };

  const raw = window.localStorage.getItem(COLOR_FILTER_LOG_KEY);
  const parsed = raw ? (JSON.parse(raw) as SessionLog[]) : [];
  parsed.unshift(log);
  window.localStorage.setItem(COLOR_FILTER_LOG_KEY, JSON.stringify(parsed.slice(0, 50)));

  return log;
}
