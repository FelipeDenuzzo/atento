export type SessionScopeContext = {
  mode: "single" | "sequence";
  scopeLabel: string;
};

export type SymbolMapLevelConfig = {
  id: number;
  name: string;
  rows: number;
  cols: number;
  timeLimitSec: number;
  targetSymbols: string[];
  targetCount: number;
  distractorSymbols: string[];
};

export type SymbolMapCell = {
  id: string;
  symbol: string;
  isTarget: boolean;
  targetSymbol?: string;
  found: boolean;
};

export type ClickOutcome = "hit" | "already-found" | "miss";

export type SymbolMapLevelResult = {
  levelId: number;
  levelName: string;
  timeElapsedMs: number;
  timeLimitSec: number;
  totalTargets: number;
  targetsFound: number;
  misses: number;
  accuracy: number;
  completed: boolean;
  byTarget?: Record<string, { total: number; found: number }>;
};

export type SymbolMapLevelLog = {
  dateIso: string;
  session?: SessionScopeContext;
  result: SymbolMapLevelResult;
};
