"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReportContext } from "@/components/AttentionTrainingGame";
import { buildTxtReportFileName } from "../../utils/reportFileName";

type ColorName = "vermelho" | "azul" | "verde" | "amarelo" | "roxo" | "laranja";
type TrialType = "congruent" | "incongruent";
type GameStatus = "instructions" | "ready" | "playing" | "finished" | "completed";
type TextCase = "uppercase" | "lowercase" | "capitalize";

type Trial = {
  id: number;
  wordText: ColorName;
  inkColor: ColorName;
  textCase: TextCase;
  type: TrialType;
  correctAnswer: ColorName;
  playerAnswer: ColorName | null;
  correct: boolean | null;
  reactionTimeMs: number | null;
};

type LevelConfig = {
  level: number;
  colors: ColorName[];
  timePerTrialSeconds: number;
  incongruentRatio: number;
  trialsPerLevel: number;
};

type LevelMetrics = {
  level: number;
  totalTrials: number;
  correctCount: number;
  errorCount: number;
  averageReactionMs: number;
  congruentAccuracy: number;
  incongruentAccuracy: number;
  score: number;
};

type SessionMetrics = {
  totalTrials: number;
  correctCount: number;
  errorCount: number;
  averageReactionMs: number;
  congruentAccuracy: number;
  incongruentAccuracy: number;
};

type Props = {
  basePoints: number;
  startingLevel: number;
  maxLevelHint: number;
  reportContext?: ReportContext;
  onComplete: (result: { success: boolean; pointsEarned: number }) => void;
};

const COLOR_MAP: Record<ColorName, string> = {
  vermelho: "#dc2626",
  azul: "#2563eb",
  verde: "#16a34a",
  amarelo: "#eab308",
  roxo: "#9333ea",
  laranja: "#ea580c",
};

const COLOR_LABELS: Record<ColorName, string> = {
  vermelho: "Vermelho",
  azul: "Azul",
  verde: "Verde",
  amarelo: "Amarelo",
  roxo: "Roxo",
  laranja: "Laranja",
};

function getLevelConfig(level: number): LevelConfig {
  if (level <= 2) {
    return {