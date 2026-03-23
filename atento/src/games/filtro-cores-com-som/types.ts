
export type ColorId = "red" | "green" | "blue" | "yellow" | "purple";
export type ShapeKind = "círculo" | "quadrado" | "triângulo";

export type TargetMode = "color" | "shape";

export type LevelConfig = {
  id: number;
  name: string;
  durationMs: number;
  availableColors: ColorId[];
  availableShapes: ShapeKind[];
  targetMode: TargetMode;
  initialTarget: string; // cor ou forma
  targetChangeIntervalMs: number;
  spawnIntervalMs: number;
  maxSimultaneousShapes: number;
  fallSpeed: number;
};

export type FallingShape = {
  id: string;
  x: number;
  y: number;
  size: number;
  colorId: ColorId;
  kind: ShapeKind;
  isCaptured: boolean;
  spawnedAt: number;
  capturedAt?: number;
};

export type LevelSummary = {
  levelId: number;
  levelName: string;
  durationMs: number;
  hits: number;
  errors: number;
  averageReactionMs: number | null;
};

export type SessionSummary = {
  totalHits: number;
  totalErrors: number;
  averageReactionMs: number | null;
  accuracy: number;
};

export type SessionLog = {
  dateIso: string;
  session?: {
    mode: "single" | "sequence";
    scopeLabel: string;
  };
  levelSummaries: LevelSummary[];
  summary: SessionSummary;
};
