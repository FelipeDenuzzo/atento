export type SymbolGlyph = "◆" | "●" | "▲" | "■" | "✦" | "⬢" | "✚" | "⬟" | "⬣" | "◉" | "◈" | "⬤";

export type AttemptOutcome = "hit" | "error" | "omission";

export type VisualOption = {
  id: string;
  glyph: SymbolGlyph;
  isTarget: boolean;
};

export type VisualRound = {
  id: number;
  targetGlyph: SymbolGlyph;
  options: VisualOption[];
  spawnedAtMs: number;
  deadlineAtMs: number;
};

export type VisualAttempt = {
  roundVisualId: number;
  targetGlyph: SymbolGlyph;
  selectedGlyph?: SymbolGlyph;
  atMs: number;
  responseMs: number;
  outcome: AttemptOutcome;
};

export type GlitchEvent = {
  id: number;
  startedAtMs: number;
  expiresAtMs: number;
  detectedAtMs?: number;
  reactionMs?: number;
  missed?: boolean;
};

export type SymbolMapSoundRoundConfig = {
  id: number;
  name: string;
  durationMs: number;
  optionCount: number;
  gridColumns: number;
  visualTimeLimitMs: number;
  glitchIntervalMinMs: number;
  glitchIntervalMaxMs: number;
  glitchVisibleMs: number;
};

export type SymbolMapSoundRoundRuntime = {
  config: SymbolMapSoundRoundConfig;
  currentVisualRound: VisualRound | null;
  visualRoundsSpawned: number;
  visualAttempts: VisualAttempt[];
  glitches: GlitchEvent[];
  falseAlarms: number;
  nextVisualAtMs: number;
  nextGlitchAtMs: number;
  activeGlitch: GlitchEvent | null;
};

export type VisualScoreBreakdown = {
  hits: number;
  errors: number;
  omissions: number;
  totalAttempts: number;
  meanResponseMs: number;
  accuracyPercent: number;
  score: number;
};

export type AudioScoreBreakdown = {
  glitchesTotal: number;
  detected: number;
  missed: number;
  falseAlarms: number;
  meanReactionMs: number;
  detectionPercent: number;
  score: number;
};

export type SymbolMapSoundRoundMetrics = {
  visual: VisualScoreBreakdown;
  audio: AudioScoreBreakdown;
  dualScore: number;
};

export type SymbolMapSoundRoundLog = {
  roundNumber: number;
  roundName: string;
  startedAtIso: string;
  endedAtIso: string;
  config: SymbolMapSoundRoundConfig;
  metrics: SymbolMapSoundRoundMetrics;
  visualAttempts: VisualAttempt[];
  glitches: GlitchEvent[];
};

export type SymbolMapSoundSessionResult = {
  startedAtIso: string;
  endedAtIso: string;
  elapsedMs: number;
  rounds: SymbolMapSoundRoundLog[];
  finalScore: number;
  visualScore: number;
  audioScore: number;
  totalVisualHits: number;
  totalVisualErrors: number;
  totalVisualOmissions: number;
  totalAudioDetected: number;
  totalAudioMissed: number;
  totalAudioFalseAlarms: number;
  meanVisualResponseMs: number;
  meanAudioReactionMs: number;
};

export type AudioEngineController = {
  triggerGlitch: () => void;
  stop: () => void;
};
