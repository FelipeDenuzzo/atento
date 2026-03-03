import {
  BlockLog,
  BlockMetrics,
  BlockSummary,
  ItemCategory,
  GoNoGoExpandidoLevelConfig,
  GoNoGoExpandidoTrial,
  StimulusItem,
} from "./types";

export const GONOGO_EXPANDIDO_LOG_KEY = "atento.goNoGoExpandido.logs";

const FRUIT_POOL: StimulusItem[] = [
  { id: "fruit-apple", emoji: "🍎", label: "Maçã", category: "fruta" },
  { id: "fruit-banana", emoji: "🍌", label: "Banana", category: "fruta" },
  {
    id: "fruit-strawberry",
    emoji: "🍓",
    label: "Morango",
    category: "fruta",
  },
  { id: "fruit-grape", emoji: "🍇", label: "Uva", category: "fruta" },
  { id: "fruit-watermelon", emoji: "🍉", label: "Melancia", category: "fruta" },
  { id: "fruit-orange", emoji: "🍊", label: "Laranja", category: "fruta" },
];

const OBJECT_POOL: StimulusItem[] = [
  { id: "obj-pan", emoji: "🍳", label: "Panela", category: "objeto" },
  { id: "obj-hammer", emoji: "🔨", label: "Martelo", category: "objeto" },
  { id: "obj-ball", emoji: "⚽", label: "Bola", category: "objeto" },
  { id: "obj-book", emoji: "📘", label: "Livro", category: "objeto" },
  { id: "obj-lamp", emoji: "💡", label: "Lâmpada", category: "objeto" },
  { id: "obj-key", emoji: "🔑", label: "Chave", category: "objeto" },
];

export type GoNoGoExpandidoConfig = {
  sessionTargetMinutes: number;
  feedbackMode: "minimal" | "full";
  vibrationEnabled: boolean;
};

export const defaultGoNoGoExpandidoConfig: GoNoGoExpandidoConfig = {
  sessionTargetMinutes: 7,
  feedbackMode: "minimal",
  vibrationEnabled: true,
};

export const defaultExpandidoLevels = (): GoNoGoExpandidoLevelConfig[] => [
  {
    id: 1,
    name: "Nível 1",
    trialsPerBlock: 15,
    goProbability: 0.6,
    maxItemsPerWindow: 1,
    exposureMs: 1500,
    itiMs: 800,
  },
  {
    id: 2,
    name: "Nível 2",
    trialsPerBlock: 25,
    goProbability: 0.6,
    maxItemsPerWindow: 1,
    exposureMs: 1300,
    itiMs: 700,
  },
  {
    id: 3,
    name: "Nível 3",
    trialsPerBlock: 35,
    goProbability: 0.55,
    maxItemsPerWindow: 3,
    exposureMs: 1200,
    itiMs: 600,
  },
];

function randomInt(minInclusive: number, maxInclusive: number, rng: () => number): number {
  const span = maxInclusive - minInclusive + 1;
  return minInclusive + Math.floor(rng() * span);
}

function randomItem<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)];
}

function shuffleInPlace<T>(array: T[], rng: () => number): T[] {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function buildTrialItems(
  level: GoNoGoExpandidoLevelConfig,
  targetCategory: ItemCategory,
  shouldClick: boolean,
  rng: () => number,
): StimulusItem[] {
  const itemCount = level.maxItemsPerWindow === 1 
    ? 1 
    : randomInt(1, level.maxItemsPerWindow, rng);

  const targetPool = targetCategory === "fruta" ? FRUIT_POOL : OBJECT_POOL;
  const nonTargetPool = targetCategory === "fruta" ? OBJECT_POOL : FRUIT_POOL;

  // Nível 3: somente clica se TODOS os itens forem do alvo
  if (level.maxItemsPerWindow > 1) {
    if (shouldClick) {
      // Todos os itens devem ser do tipo alvo
      return Array.from({ length: itemCount }, () => randomItem(targetPool, rng));
    } else {
      // Pelo menos um item não deve ser do tipo alvo
      const items: StimulusItem[] = [];
      const nonTargetCount = randomInt(1, itemCount, rng);
      
      for (let i = 0; i < nonTargetCount; i++) {
        items.push(randomItem(nonTargetPool, rng));
      }
      for (let i = nonTargetCount; i < itemCount; i++) {
        items.push(randomItem(targetPool, rng));
      }
      
      return shuffleInPlace(items, rng);
    }
  }

  // Níveis 1 e 2: apenas um item
  if (shouldClick) {
    return [randomItem(targetPool, rng)];
  } else {
    return [randomItem(nonTargetPool, rng)];
  }
}

export function generateBlockTrials(
  level: GoNoGoExpandidoLevelConfig,
  rng: () => number = Math.random,
): GoNoGoExpandidoTrial[] {
  // Escolhe randomicamente se o alvo será fruta ou objeto para este bloco
  const targetCategory: ItemCategory = rng() < 0.5 ? "fruta" : "objeto";

  const goCount = Math.round(level.trialsPerBlock * level.goProbability);
  const nogoCount = Math.max(0, level.trialsPerBlock - goCount);

  const shouldClickTargets = [
    ...Array.from({ length: goCount }, () => true),
    ...Array.from({ length: nogoCount }, () => false),
  ];
  shuffleInPlace(shouldClickTargets, rng);

  return shouldClickTargets.map((shouldClick, index) => ({
    id: `lvl-${level.id}-trial-${index + 1}`,
    levelId: level.id,
    items: buildTrialItems(level, targetCategory, shouldClick, rng),
    targetCategory,
    shouldClick,
  }));
}

export function createEmptyMetrics(): BlockMetrics {
  return {
    goCorrect: 0,
    nogoCorrect: 0,
    commissionErrors: 0,
    omissionErrors: 0,
    reactionTimesMs: [],
  };
}

export function registerTrialOutcome(
  current: BlockMetrics,
  outcome: {
    shouldClick: boolean;
    didClick: boolean;
    reactionTimeMs?: number;
  },
): BlockMetrics {
  const next: BlockMetrics = {
    goCorrect: current.goCorrect,
    nogoCorrect: current.nogoCorrect,
    commissionErrors: current.commissionErrors,
    omissionErrors: current.omissionErrors,
    reactionTimesMs: [...current.reactionTimesMs],
  };

  if (outcome.shouldClick && outcome.didClick) {
    next.goCorrect += 1;
    if (typeof outcome.reactionTimeMs === "number") {
      next.reactionTimesMs.push(outcome.reactionTimeMs);
    }
  } else if (outcome.shouldClick && !outcome.didClick) {
    next.omissionErrors += 1;
  } else if (!outcome.shouldClick && outcome.didClick) {
    next.commissionErrors += 1;
  } else {
    next.nogoCorrect += 1;
  }

  return next;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return sorted[mid];
}

export function summarizeBlock(metrics: BlockMetrics): BlockSummary {
  const totalTrials =
    metrics.goCorrect +
    metrics.nogoCorrect +
    metrics.commissionErrors +
    metrics.omissionErrors;
  const accuracy = totalTrials > 0 ? (metrics.goCorrect + metrics.nogoCorrect) / totalTrials : 0;

  return {
    totalTrials,
    goCorrect: metrics.goCorrect,
    nogoCorrect: metrics.nogoCorrect,
    commissionErrors: metrics.commissionErrors,
    omissionErrors: metrics.omissionErrors,
    avgReactionMs: average(metrics.reactionTimesMs),
    medianReactionMs: median(metrics.reactionTimesMs),
    commissionRate: totalTrials > 0 ? metrics.commissionErrors / totalTrials : 0,
    omissionRate: totalTrials > 0 ? metrics.omissionErrors / totalTrials : 0,
    accuracy,
  };
}

export function saveBlockLog(log: BlockLog): void {
  if (typeof window === "undefined") return;

  const raw = window.localStorage.getItem(GONOGO_EXPANDIDO_LOG_KEY);
  const parsed = raw ? (JSON.parse(raw) as BlockLog[]) : [];
  parsed.unshift(log);
  window.localStorage.setItem(GONOGO_EXPANDIDO_LOG_KEY, JSON.stringify(parsed.slice(0, 50)));
}

export function buildBlockLog(
  level: GoNoGoExpandidoLevelConfig,
  summary: BlockSummary,
): BlockLog {
  return {
    dateIso: new Date().toISOString(),
    levelId: level.id,
    levelName: level.name,
    config: {
      trialsPerBlock: level.trialsPerBlock,
      goProbability: level.goProbability,
      exposureMs: level.exposureMs,
      itiMs: level.itiMs,
      maxItemsPerWindow: level.maxItemsPerWindow,
    },
    summary,
  };
}
