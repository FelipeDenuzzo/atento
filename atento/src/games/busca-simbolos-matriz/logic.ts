import {
  MatrixCell,
  MatrixConfig,
  MatrixMetrics,
  SessionScopeContext,
  StimulusType,
  MatrixSessionLog,
} from "./types";

export const MATRIX_SEARCH_LOG_KEY = "atento.matrixSymbolSearch.logs";

export const NUMBER_STIMULI = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

export const SYMBOL_STIMULI = ["☆", "○", "△", "□", "♢", "✕", "+", "☂", "☀", "♥"];

const NUMBER_SIMILAR: Record<string, string[]> = {
  "0": ["8", "9", "6"],
  "1": ["7", "4", "9"],
  "2": ["7", "3", "5"],
  "3": ["8", "5", "2"],
  "4": ["1", "7", "9"],
  "5": ["3", "6", "8"],
  "6": ["8", "9", "0"],
  "7": ["1", "2", "4"],
  "8": ["0", "3", "6"],
  "9": ["0", "6", "8"],
};

const SYMBOL_SIMILAR: Record<string, string[]> = {
  "☆": ["○", "♢", "△"],
  "○": ["☆", "□", "♢"],
  "△": ["☆", "□", "♢"],
  "□": ["○", "△", "+"],
  "♢": ["☆", "□", "△"],
  "✕": ["+", "△", "♢"],
  "+": ["✕", "□", "△"],
  "☂": ["☀", "♥", "○"],
  "☀": ["☂", "○", "☆"],
  "♥": ["☀", "♢", "○"],
};

export function createSeededRng(seed: string): () => number {
  if (!seed.trim()) {
    return Math.random;
  }

  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  let state = hash >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getStimuliPool(type: StimulusType): string[] {
  return type === "numbers" ? NUMBER_STIMULI : SYMBOL_STIMULI;
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

function randomItem<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)] ?? items[0];
}

export function getDistractorPool(config: MatrixConfig): string[] {
  const basePool = getStimuliPool(config.stimulusType).filter((item) => item !== config.target);
  if (config.difficulty !== "hard") {
    return basePool;
  }

  const similarMap = config.stimulusType === "numbers" ? NUMBER_SIMILAR : SYMBOL_SIMILAR;
  const similar = (similarMap[config.target] ?? []).filter((item) => item !== config.target);
  const rest = basePool.filter((item) => !similar.includes(item));
  return [...similar, ...rest];
}

export function generateMatrix(config: MatrixConfig): MatrixCell[] {
  const rng = createSeededRng(config.seed);
  const totalCells = config.size * config.size;
  const desiredTargets = Math.round(totalCells * config.targetDensity);
  const targetCount = Math.max(1, Math.min(totalCells - 1, desiredTargets));
  const distractorPool = getDistractorPool(config);

  const targets: MatrixCell[] = Array.from({ length: targetCount }, (_, idx) => ({
    id: `t-${idx}`,
    value: config.target,
    isTarget: true,
    marked: false,
  }));

  const distractors: MatrixCell[] = Array.from({ length: totalCells - targetCount }, (_, idx) => ({
    id: `d-${idx}`,
    value: randomItem(distractorPool, rng),
    isTarget: false,
    marked: false,
  }));

  return shuffle([...targets, ...distractors], rng).map((cell, idx) => ({
    ...cell,
    id: `${cell.id}-${idx}`,
  }));
}

export function toggleCellMark(cells: MatrixCell[], cellId: string): MatrixCell[] {
  return cells.map((cell) =>
    cell.id === cellId
      ? {
          ...cell,
          marked: !cell.marked,
        }
      : cell,
  );
}

export function computeMetrics(cells: MatrixCell[], elapsedSec: number): MatrixMetrics {
  const hits = cells.filter((cell) => cell.isTarget && cell.marked).length;
  const omissions = cells.filter((cell) => cell.isTarget && !cell.marked).length;
  const commissions = cells.filter((cell) => !cell.isTarget && cell.marked).length;
  const totalTargets = hits + omissions;
  const totalMarked = hits + commissions;
  const safeMinutes = Math.max(elapsedSec / 60, 1 / 60);
  const itemsPerMinute = totalMarked / safeMinutes;
  const precision = totalMarked > 0 ? hits / totalMarked : 0;
  const recall = totalTargets > 0 ? hits / totalTargets : 0;

  return {
    hits,
    omissions,
    commissions,
    totalTargets,
    totalMarked,
    elapsedSec,
    itemsPerMinute,
    precision,
    recall,
  };
}

export function buildSessionLog(
  config: MatrixConfig,
  metrics: MatrixMetrics,
  context?: SessionScopeContext,
): MatrixSessionLog {
  return {
    dateIso: new Date().toISOString(),
    ...(context ? { session: context } : {}),
    config,
    metrics,
  };
}

export function saveSessionLog(log: MatrixSessionLog): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(MATRIX_SEARCH_LOG_KEY);
    const parsed = raw ? (JSON.parse(raw) as MatrixSessionLog[]) : [];
    parsed.unshift(log);
    window.localStorage.setItem(MATRIX_SEARCH_LOG_KEY, JSON.stringify(parsed.slice(0, 100)));
  } catch (error) {
    console.error("Failed to save matrix symbol search log", error);
  }
}

export function buildResultText(
  config: MatrixConfig,
  metrics: MatrixMetrics,
  context?: SessionScopeContext,
): string {
  const lines: string[] = [];
  lines.push("=" + "=".repeat(60));
  lines.push("RESULTADO - BUSCA DE SÍMBOLOS EM MATRIZ");
  lines.push("=" + "=".repeat(60));
  lines.push("");

  if (context) {
    lines.push(
      `Escopo: ${
        context.mode === "sequence"
          ? `Trilha completa (${context.scopeLabel})`
          : `Jogo individual (${context.scopeLabel})`
      }`,
    );
    lines.push("");
  }

  lines.push("Configuração:");
  lines.push(`- Grade: ${config.size}x${config.size}`);
  lines.push(`- Tipo de estímulo: ${config.stimulusType === "numbers" ? "Números" : "Símbolos"}`);
  lines.push(`- Alvo: ${config.target}`);
  lines.push(`- Densidade alvo: ${Math.round(config.targetDensity * 100)}%`);
  lines.push(`- Duração configurada: ${config.durationSec}s`);
  lines.push(`- Dificuldade: ${config.difficulty === "hard" ? "Difícil" : "Normal"}`);
  lines.push(`- Seed: ${config.seed || "(vazia)"}`);
  lines.push("");

  lines.push("Métricas:");
  lines.push(`- Hits: ${metrics.hits}`);
  lines.push(`- Omissões: ${metrics.omissions}`);
  lines.push(`- Comissões: ${metrics.commissions}`);
  lines.push(`- Tempo total: ${metrics.elapsedSec}s`);
  lines.push(`- Itens marcados por minuto: ${metrics.itemsPerMinute.toFixed(2)}`);
  lines.push(`- Precisão: ${(metrics.precision * 100).toFixed(1)}%`);
  lines.push(`- Recall: ${(metrics.recall * 100).toFixed(1)}%`);
  lines.push("");
  lines.push(`Data: ${new Date().toLocaleString("pt-BR")}`);

  return lines.join("\n");
}
