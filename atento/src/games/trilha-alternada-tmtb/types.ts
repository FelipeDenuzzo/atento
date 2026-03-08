export type TmtbItemKind = "number" | "letter";

export type TmtbPenaltyMode = "back-step" | "keep-position";

export type TmtbSessionKind = "practice" | "phase-1" | "phase-2" | "phase-3";

export type TmtbSequenceItem = {
  seqIndex: number;
  label: string;
  kind: TmtbItemKind;
};

export type TmtbNode = TmtbSequenceItem & {
  id: string;
  xPct: number;
  yPct: number;
};

export type TmtbClickLog = {
  sessionKind: TmtbSessionKind;
  atMs: number;
  clickedLabel: string;
  clickedSeqIndex: number;
  expectedLabel: string;
  expectedSeqIndex: number;
  correct: boolean;
};

export type TmtbPhaseMetric = {
  phaseId: 1 | 2 | 3;
  totalTimeMs: number;
  totalTimeSeconds: number;
  clickCount: number;
  clickRatePerSecond: number;
  maxInterClickMs: number;
};

export type TmtbConfig = {
  numbersCount: number;
  lettersCount: number;
  penaltyMode: TmtbPenaltyMode;
  backStepsOnError: number;
  minNodeDistancePct: number;
};

export type TmtbSessionResult = {
  participantId?: string;
  startedAtIso: string;
  endedAtIso: string;
  totalTimeMs: number;
  totalTimeSeconds: number;
  sequenceLength: number;
  errorsTotal: number;
  errorsOnNumberTarget: number;
  errorsOnLetterTarget: number;
  backStepsApplied: number;
  totalClickRatePerSecond: number;
  maxInterClickMs: number;
  phaseMetrics: TmtbPhaseMetric[];
  accuracyPercent: number;
  speedScore: number;
  finalScore: number;
  interpretation: string;
  clicks: TmtbClickLog[];
};
