"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { defaultCountingFlowLevels } from "./levels";
import {
  buildSessionLog,
  countTargets,
  evaluateAnswer,
  generateStimulusSequence,
  getPerformanceBand,
  saveSessionLog,
} from "./logic";
import { CountingFlowResult, CountingFlowStimulus } from "./types";

type Props = {
  basePoints: number;
  startingLevel: number;
  maxLevelHint: number;
  onComplete: (result: { success: boolean; pointsEarned: number }) => void;
};

type Phase = "intro" | "running" | "answer" | "result";

function visualStyle(shape: "circle" | "square" | "triangle"): string {
  if (shape === "triangle") {
    return "w-0 h-0 border-l-[60px] border-r-[60px] border-b-[110px] border-l-transparent border-r-transparent";
  }
  if (shape === "square") {
    return "h-32 w-32";
  }
  return "h-32 w-32 rounded-full";
}

function visualColorClass(shape: "circle" | "square" | "triangle", color: "red" | "blue" | "green" | "yellow"): string {
  if (shape === "triangle") {
    if (color === "red") return "border-b-red-500";
    if (color === "blue") return "border-b-blue-500";
    if (color === "green") return "border-b-green-500";
    return "border-b-yellow-400";
  }

  if (color === "red") return "bg-red-500";
  if (color === "blue") return "bg-blue-500";
  if (color === "green") return "bg-green-500";
  return "bg-yellow-400";
}

export function ContagemEstimulosFluxoGame({
  basePoints,
  startingLevel,
  maxLevelHint,
  onComplete,
}: Props) {
  const levels = useMemo(() => defaultCountingFlowLevels(), []);
  const firstLevelIndex = Math.max(0, levels.findIndex((entry) => entry.id >= startingLevel));
  const lastAllowedLevelId = Math.max(startingLevel, maxLevelHint);

  const [levelIndex, setLevelIndex] = useState(firstLevelIndex);
  const [phase, setPhase] = useState<Phase>("intro");
  const [sequence, setSequence] = useState<CountingFlowStimulus[]>([]);
  const [stimulusIndex, setStimulusIndex] = useState(0);
  const [showStimulus, setShowStimulus] = useState(true);
  const [answerInput, setAnswerInput] = useState("");
  const [levelResult, setLevelResult] = useState<CountingFlowResult | null>(null);
  const [history, setHistory] = useState<CountingFlowResult[]>([]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const level = levels[levelIndex];
  const currentStimulus = sequence[stimulusIndex];
  const canAdvanceLevel =
    levelIndex < levels.length - 1 && levels[levelIndex + 1].id <= lastAllowedLevelId;

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearTimer();
  }, []);

  useEffect(() => {
    if (phase !== "running") return;

    clearTimer();

    if (stimulusIndex >= sequence.length) {
      timerRef.current = setTimeout(() => {
        setPhase("answer");
      }, 0);
      return;
    }

    if (showStimulus) {
      timerRef.current = setTimeout(() => {
        setShowStimulus(false);
      }, level.stimulusDurationMs);
      return;
    }

    timerRef.current = setTimeout(() => {
      setStimulusIndex((prev) => prev + 1);
      setShowStimulus(true);
    }, level.isiMs);
  }, [phase, showStimulus, stimulusIndex, sequence.length, level.isiMs, level.stimulusDurationMs]);

  const startLevel = () => {
    const generated = generateStimulusSequence(level);
    setSequence(generated);
    setStimulusIndex(0);
    setShowStimulus(true);
    setAnswerInput("");
    setLevelResult(null);
    setPhase("running");
  };

  const submitAnswer = () => {
    const parsed = Number.parseInt(answerInput, 10);
    if (Number.isNaN(parsed) || parsed < 0) return;

    const actualCount = countTargets(sequence);
    const result = evaluateAnswer(actualCount, parsed);
    setLevelResult(result);
    setHistory((prev) => [...prev, result]);

    const log = buildSessionLog(level, result);
    saveSessionLog(log);

    setPhase("result");
  };

  const nextLevelOrFinish = () => {
    if (canAdvanceLevel) {
      setLevelIndex((prev) => prev + 1);
      setPhase("intro");
      return;
    }

    const meanError =
      history.length > 0
        ? history.reduce((sum, item) => sum + item.absoluteError, 0) / history.length
        : (levelResult?.absoluteError ?? 0);

    const success = meanError <= 3;
    const pointsEarned = Math.max(0, Math.round(basePoints - meanError * 4));

    onComplete({ success, pointsEarned });
  };

  return (
    <div className="space-y-6">
      {phase === "intro" && (
        <div className="space-y-4">
          <div className="rounded-lg border-2 border-blue-300 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-900">{level.name}</p>
          </div>

          <div className="rounded-lg border border-black/10 bg-zinc-50 p-4 text-sm text-zinc-700">
            <p className="font-semibold text-zinc-900">Alvo da rodada:</p>
            <p className="mt-1">
              {level.targetVisual.shape === "circle" ? "Círculo" : level.targetVisual.shape === "square" ? "Quadrado" : "Triângulo"} {level.targetVisual.color === "red" ? "vermelho" : level.targetVisual.color === "blue" ? "azul" : level.targetVisual.color === "green" ? "verde" : "amarelo"}
            </p>
          </div>

          <button
            type="button"
            onClick={startLevel}
            className="w-full rounded-lg bg-zinc-900 px-4 py-3 font-semibold text-white hover:bg-zinc-700"
          >
            Começar sequência
          </button>
        </div>
      )}

      {phase === "running" && (
        <div className="space-y-3">
          <div className="flex min-h-[360px] items-center justify-center rounded-lg border-2 border-zinc-300 bg-white">
            {showStimulus && currentStimulus?.visual ? (
              <div
                className={`${visualStyle(currentStimulus.visual.shape)} ${visualColorClass(currentStimulus.visual.shape, currentStimulus.visual.color)}`}
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-zinc-200" />
            )}
          </div>
        </div>
      )}

      {phase === "answer" && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-zinc-900">Quantas vezes o alvo apareceu?</h3>
          <input
            type="number"
            min={0}
            value={answerInput}
            onChange={(event) => setAnswerInput(event.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-lg text-zinc-900 outline-none focus:border-zinc-500"
            placeholder="Digite um número"
          />
          <button
            type="button"
            onClick={submitAnswer}
            className="w-full rounded-lg bg-zinc-900 px-4 py-3 font-semibold text-white hover:bg-zinc-700"
          >
            Confirmar resposta
          </button>
        </div>
      )}

      {phase === "result" && levelResult && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-zinc-900">Resultado da rodada</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-4">
              <p className="text-xs text-zinc-500">Alvos reais</p>
              <p className="text-2xl font-bold text-zinc-900">{levelResult.actualTargetCount}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-4">
              <p className="text-xs text-zinc-500">Sua resposta</p>
              <p className="text-2xl font-bold text-zinc-900">{levelResult.playerAnswer}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-4">
              <p className="text-xs text-zinc-500">Erro absoluto</p>
              <p className="text-2xl font-bold text-zinc-900">{levelResult.absoluteError}</p>
            </div>
          </div>

          <div className="rounded-lg border border-black/10 bg-zinc-50 p-4 text-sm text-zinc-700">
            <p>
              Estimativa: {levelResult.estimationDirection === "exact" ? "exata" : levelResult.estimationDirection === "under" ? "abaixo do real" : "acima do real"}
            </p>
            <p>Faixa de desempenho: {getPerformanceBand(levelResult.absoluteError)}</p>
          </div>

          <button
            type="button"
            onClick={nextLevelOrFinish}
            className="w-full rounded-lg bg-zinc-900 px-4 py-3 font-semibold text-white hover:bg-zinc-700"
          >
            {canAdvanceLevel ? "Próximo nível" : "Concluir"}
          </button>
        </div>
      )}
    </div>
  );
}
