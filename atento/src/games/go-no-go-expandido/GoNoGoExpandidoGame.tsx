"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReportContext } from "@/components/AttentionTrainingGame";
import {
  buildBlockLog,
  createEmptyMetrics,
  defaultExpandidoLevels,
  defaultGoNoGoExpandidoConfig,
  generateBlockTrials,
  registerTrialOutcome,
  saveBlockLog,
  summarizeBlock,
} from "./logic";
import { BlockSummary, GoNoGoExpandidoTrial, ItemCategory } from "./types";

type Props = {
  basePoints: number;
  startingLevel: number;
  maxLevelHint: number;
  reportContext?: ReportContext;
  onComplete: (result: { success: boolean; pointsEarned: number }) => void;
};

type RoundPhase = "intro" | "countdown" | "running" | "iti" | "level-summary" | "session-summary";

function vibrateIfAllowed() {
  if (typeof window === "undefined") return;
  if (!("vibrate" in navigator)) return;
  navigator.vibrate?.(40);
}

function getCategoryLabel(category: ItemCategory): string {
  return category === "fruta" ? "FRUTAS" : "OBJETOS";
}

function getCategoryExamples(category: ItemCategory): string {
  return category === "fruta" ? "🍎 🍌 🍓" : "🍳 🔨 ⚽";
}

export function GoNoGoExpandidoGame({
  basePoints,
  startingLevel,
  maxLevelHint,
  reportContext,
  onComplete,
}: Props) {
  const levels = useMemo(() => defaultExpandidoLevels(), []);

  const firstLevelIndex = Math.max(0, levels.findIndex((entry) => entry.id >= startingLevel));
  const lastAllowedLevelId = Math.max(startingLevel, maxLevelHint);

  const [levelIndex, setLevelIndex] = useState(firstLevelIndex);
  const [phase, setPhase] = useState<RoundPhase>("intro");
  const [countdown, setCountdown] = useState(3);
  const [trials, setTrials] = useState<GoNoGoExpandidoTrial[]>([]);
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialStartAt, setTrialStartAt] = useState<number | null>(null);
  const [blockMetrics, setBlockMetrics] = useState(createEmptyMetrics());
  const [levelSummaries, setLevelSummaries] = useState<BlockSummary[]>([]);
  const [feedback, setFeedback] = useState<"none" | "correct" | "wrong">("none");

  const trialResolvedRef = useRef(false);

  const level = levels[levelIndex];
  const currentTrial = trials[trialIndex];

  const canAdvanceLevel =
    levelIndex < levels.length - 1 && levels[levelIndex + 1].id <= lastAllowedLevelId;

  const overallSummary = useMemo(() => {
    const total = levelSummaries.reduce(
      (acc, item) => {
        acc.totalTrials += item.totalTrials;
        acc.goCorrect += item.goCorrect;
        acc.nogoCorrect += item.nogoCorrect;
        acc.commissionErrors += item.commissionErrors;
        acc.omissionErrors += item.omissionErrors;
        if (item.avgReactionMs != null) {
          acc.avgReactionList.push(item.avgReactionMs);
        }
        return acc;
      },
      {
        totalTrials: 0,
        goCorrect: 0,
        nogoCorrect: 0,
        commissionErrors: 0,
        omissionErrors: 0,
        avgReactionList: [] as number[],
      },
    );

    const accuracy = total.totalTrials
      ? (total.goCorrect + total.nogoCorrect) / total.totalTrials
      : 0;

    const avgReaction =
      total.avgReactionList.length > 0
        ? Math.round(
            total.avgReactionList.reduce((sum, value) => sum + value, 0) /
              total.avgReactionList.length,
          )
        : null;

    return {
      ...total,
      accuracy,
      avgReaction,
    };
  }, [levelSummaries]);

  function startCountdown() {
    const blockTrials = generateBlockTrials(level);
    setTrials(blockTrials);
    setTrialIndex(0);
    setBlockMetrics(createEmptyMetrics());
    setFeedback("none");
    setCountdown(3);
    setPhase("countdown");
  }

  function applyOutcome(didClick: boolean, reactionTimeMs?: number) {
    if (!currentTrial || trialResolvedRef.current) return;
    trialResolvedRef.current = true;

    const nextMetrics = registerTrialOutcome(blockMetrics, {
      shouldClick: currentTrial.shouldClick,
      didClick,
      reactionTimeMs,
    });

    const isCorrect =
      (currentTrial.shouldClick && didClick) || (!currentTrial.shouldClick && !didClick);

    setBlockMetrics(nextMetrics);
    setFeedback(isCorrect ? "correct" : "wrong");

    if (!isCorrect && defaultGoNoGoExpandidoConfig.vibrationEnabled) {
      vibrateIfAllowed();
    }

    setPhase("iti");
  }

  function handleStimulusClick() {
    if (phase !== "running" || !currentTrial) return;

    const now = performance.now();
    const reactionTimeMs = trialStartAt ? Math.max(0, Math.round(now - trialStartAt)) : undefined;
    applyOutcome(true, reactionTimeMs);
  }

  // Suporte para tecla Espaço
  useEffect(() => {
    function handleKeyPress(event: KeyboardEvent) {
      if (event.code === "Space" && phase === "running" && currentTrial) {
        event.preventDefault();
        handleStimulusClick();
      }
    }

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [phase, currentTrial, trialStartAt, blockMetrics]);

  // Countdown de 3 segundos
  useEffect(() => {
    if (phase !== "countdown") return;

    if (countdown > 1) {
      const timeoutId = window.setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => window.clearTimeout(timeoutId);
    } else {
      const timeoutId = window.setTimeout(() => {
        trialResolvedRef.current = false;
        setTrialStartAt(performance.now());
        setPhase("running");
      }, 1000);
      return () => window.clearTimeout(timeoutId);
    }
  }, [phase, countdown]);

  useEffect(() => {
    if (phase !== "running") return;

    const timeoutId = window.setTimeout(() => {
      applyOutcome(false);
    }, level.exposureMs);

    return () => window.clearTimeout(timeoutId);
  }, [phase, level.exposureMs, currentTrial, blockMetrics]);

  useEffect(() => {
    if (phase !== "iti") return;

    const timeoutId = window.setTimeout(() => {
      const nextTrialIndex = trialIndex + 1;
      if (nextTrialIndex >= trials.length) {
        const summary = summarizeBlock(blockMetrics);
        setLevelSummaries((previous) => [...previous, summary]);
        saveBlockLog(buildBlockLog(level, summary, reportContext));
        setPhase("level-summary");
        return;
      }

      setTrialIndex(nextTrialIndex);
      setFeedback("none");
      trialResolvedRef.current = false;
      setTrialStartAt(performance.now());
      setPhase("running");
    }, level.itiMs);

    return () => window.clearTimeout(timeoutId);
  }, [phase, trialIndex, trials.length, level, blockMetrics, reportContext]);

  function continueAfterLevelSummary() {
    if (canAdvanceLevel) {
      setLevelIndex((value) => value + 1);
      setPhase("intro");
      return;
    }
    setPhase("session-summary");
  }

  function finishSession() {
    const pointsEarned = Math.round(basePoints * overallSummary.accuracy);
    const success = overallSummary.accuracy >= 0.7;
    onComplete({ success, pointsEarned });
  }

  const lastLevelSummary =
    levelSummaries.length > 0 ? levelSummaries[levelSummaries.length - 1] : null;

  return (
    <div className="space-y-5">
      {phase === "intro" && (
        <div className="space-y-6 min-h-[350px] md:min-h-[500px] rounded-lg border border-black/10 bg-white p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-zinc-900">Go / No-Go</h2>
            <p className="mt-2 text-lg text-zinc-700">{level.name}</p>
          </div>


        <div className="space-y-4 rounded-lg bg-zinc-50 p-5">
          <h3 className="text-lg font-semibold text-zinc-900">Como funciona:</h3>
          <div className="space-y-3 text-zinc-700">
            <p>
              Imagens vão aparecer na tela rapidamente, uma de cada vez. As imagens mostradas acima são <strong>exemplos da categoria que você deve clicar</strong> — ou seja, qualquer item desse tipo é válido, não apenas os mostrados aqui.
            </p>
            <p>
              <strong>Clique</strong> ou <strong>pressione ESPAÇO</strong> sempre que aparecer um item da categoria certa, e fique parado quando aparecer qualquer outra coisa.
            </p>
            <p>
              Cuidado: o ritmo aumenta a cada fase, e clicar no momento errado conta como erro.
            </p>
            {level.maxItemsPerWindow > 1 && (
              <p className="text-sm italic text-zinc-600">
                * Neste nível, podem aparecer vários itens ao mesmo tempo.<br />
                Só clique se <strong>TODOS</strong> forem do tipo indicado.
              </p>
            )}
          </div>
        </div>



          <button
            type="button"
            onClick={startCountdown}
            className="w-full rounded-lg bg-emerald-600 px-6 py-3 text-lg font-medium text-white hover:bg-emerald-700"
          >
            Avançar
          </button>
        </div>
      )}

      {phase === "countdown" && currentTrial && (
        <div className="flex min-h-[350px] md:min-h-[500px] flex-col items-center justify-center space-y-8 rounded-lg border border-black/10 bg-white p-8">
          <div className="text-center">
            <p className="text-xl font-medium text-zinc-700">
              Clique quando aparecer somente
            </p>
            <p className="mt-3 text-3xl font-bold text-emerald-600">
              {getCategoryLabel(currentTrial.targetCategory)}
            </p>
            <p className="mt-2 text-4xl">
              {getCategoryExamples(currentTrial.targetCategory)}
            </p>
          </div>

          <div className="text-center">
            <p className="text-6xl font-bold text-zinc-900">{countdown}</p>
            <p className="mt-2 text-sm text-zinc-500">segundos</p>
          </div>
        </div>
      )}

      {phase === "running" && currentTrial && (
        <div className="flex min-h-[350px] md:min-h-[500px] items-center justify-center rounded-lg bg-gradient-to-b from-zinc-50 to-white p-8">
          <button
            type="button"
            onClick={handleStimulusClick}
            className="flex min-h-[200px] min-w-[200px] items-center justify-center rounded-2xl border-4 border-zinc-200 bg-white p-8 shadow-lg transition-all hover:border-emerald-400 hover:shadow-xl active:scale-95"
          >
            <div className="flex flex-wrap items-center justify-center gap-4 text-7xl">
              {currentTrial.items.map((item, itemIndex) => (
                <span key={`${item.id}-${itemIndex}`}>{item.emoji}</span>
              ))}
            </div>
          </button>
        </div>
      )}

      {phase === "iti" && (
        <div className="flex min-h-[350px] md:min-h-[500px] items-center justify-center">
          {/* Intervalo entre trials - tela vazia */}
        </div>
      )}

      {phase === "level-summary" && (
        <div className="space-y-4 min-h-[350px] md:min-h-[500px] rounded-lg border border-black/10 bg-white p-6">
          <h3 className="text-xl font-semibold text-zinc-900">Resumo do Nível</h3>
          {lastLevelSummary && (
            <div className="space-y-2 text-zinc-700">
              <p>
                Precisão: <strong>{Math.round(lastLevelSummary.accuracy * 100)}%</strong>
              </p>
              <p>
                Acertos totais: <strong>{lastLevelSummary.goCorrect + lastLevelSummary.nogoCorrect}</strong> de <strong>{lastLevelSummary.totalTrials}</strong>
              </p>
              <p className="text-sm">
                • Cliques corretos: <strong>{lastLevelSummary.goCorrect}</strong>
              </p>
              <p className="text-sm">
                • Itens ignorados corretamente: <strong>{lastLevelSummary.nogoCorrect}</strong>
              </p>
              {lastLevelSummary.avgReactionMs && (
                <p>
                  Tempo médio de reação: <strong>{lastLevelSummary.avgReactionMs}ms</strong>
                </p>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={continueAfterLevelSummary}
            className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-base font-medium text-white hover:bg-zinc-700"
          >
            {canAdvanceLevel ? "Próximo Nível" : "Ver Resumo Final"}
          </button>
        </div>
      )}

      {phase === "session-summary" && (
        <div className="space-y-4 min-h-[350px] md:min-h-[500px] rounded-lg border border-black/10 bg-white p-6">
          <h3 className="text-xl font-semibold text-zinc-900">Sessão Concluída!</h3>
          <div className="space-y-2 text-zinc-700">
            <p>
              Precisão geral: <strong>{Math.round(overallSummary.accuracy * 100)}%</strong>
            </p>
            <p>
              Total de acertos: <strong>{overallSummary.goCorrect + overallSummary.nogoCorrect}</strong> de <strong>{overallSummary.totalTrials}</strong>
            </p>
            <p className="text-sm">
              • Cliques corretos: <strong>{overallSummary.goCorrect}</strong>
            </p>
            <p className="text-sm">
              • Itens ignorados corretamente: <strong>{overallSummary.nogoCorrect}</strong>
            </p>
            {overallSummary.avgReaction && (
              <p>
                Tempo médio de reação: <strong>{overallSummary.avgReaction}ms</strong>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={finishSession}
            className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-base font-medium text-white hover:bg-emerald-700"
          >
            Concluir Exercício
          </button>
        </div>
      )}
    </div>
  );
}