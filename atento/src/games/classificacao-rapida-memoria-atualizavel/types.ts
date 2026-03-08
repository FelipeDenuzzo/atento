export type ClassificationMode = "number" | "letter";

export type MemoryMode = "last-targets" | "mental-counter";

export type ClassificationKeyMap = {
  left: string;
  right: string;
};

export type RapidMemoryRoundConfig = {
  id: number;
  name: string;
  durationMs: number;
  stimulusVisibleMs: number;
  interStimulusMs: number;
  memoryCheckMinIntervalMs: number;
  memoryCheckMaxIntervalMs: number;
  classificationMode: ClassificationMode;
  memoryMode: MemoryMode;
  alternativesCount: 3 | 4;
  keyMap: ClassificationKeyMap;
};

export type Stimulus = {
  id: number;
  value: string;
  category: "left" | "right";
  isMemoryTarget: boolean;
  shownAtMs: number;
  deadlineMs: number;
};

export type ClassificationOutcome = "hit" | "error" | "omission";

export type ClassificationEvent = {
  stimulusId: number;
  value: string;
  expectedCategory: "left" | "right";
  expectedKey: string;
  shownAtMs: number;
  deadlineMs: number;
  respondedAtMs?: number;
  responseKey?: string;
  reactionMs?: number;
  outcome: ClassificationOutcome;
};

export type LastTargetsMemoryState = {
  mode: "last-targets";
  recentTargets: string[];
};

export type MentalCounterMemoryState = {
  mode: "mental-counter";
  counterSinceLastCheck: number;
};

export type MemoryState = LastTargetsMemoryState | MentalCounterMemoryState;

export type MemoryCheck = {
  id: number;
  mode: MemoryMode;
  askedAtMs: number;
  prompt: string;
  options: string[];
  correctOptionIndex: number;
  answeredAtMs?: number;
  selectedOptionIndex?: number;
  reactionMs?: number;
  correct?: boolean;
};

export type RapidMemoryRoundRuntime = {
  config: RapidMemoryRoundConfig;
  activeStimulus: Stimulus | null;
  activeMemoryCheck: MemoryCheck | null;
  nextStimulusAtMs: number;
  nextMemoryCheckAtMs: number;
  stimulusSeq: number;
  memoryCheckSeq: number;
  memoryState: MemoryState;
  classificationEvents: ClassificationEvent[];
  memoryChecks: MemoryCheck[];
  stimuliShown: number;
};

export type ClassificationMetrics = {
  total: number;
  hits: number;
  errors: number;
  omissions: number;
  meanReactionMs: number;
  score: number;
};

export type MemoryMetrics = {
  totalChecks: number;
  hits: number;
  errors: number;
  meanReactionMs: number;
  score: number;
};

export type RapidMemoryRoundMetrics = {
  durationMs: number;
  classification: ClassificationMetrics;
  memory: MemoryMetrics;
  finalScore: number;
};

export type RapidMemoryRoundLog = {
  roundNumber: number;
  roundName: string;
  startedAtIso: string;
  endedAtIso: string;
  config: RapidMemoryRoundConfig;
  metrics: RapidMemoryRoundMetrics;
  classificationEvents: ClassificationEvent[];
  memoryChecks: MemoryCheck[];
};

export type RapidMemorySessionResult = {
  startedAtIso: string;
  endedAtIso: string;
  elapsedMs: number;
  rounds: RapidMemoryRoundLog[];
  classificationScore: number;
  memoryScore: number;
  finalScore: number;
  totalClassificationHits: number;
  totalClassificationErrors: number;
  totalClassificationOmissions: number;
  meanClassificationReactionMs: number;
  totalMemoryChecks: number;
  totalMemoryHits: number;
  totalMemoryErrors: number;
  meanMemoryReactionMs: number;
  interpretation: string;
};
