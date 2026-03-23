"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReportContext } from "@/components/AttentionTrainingGame";

type TrainingMode = "sequence" | "single";
import { buildTxtReportFileName } from "@/utils/reportFileName";

type Direction = "left" | "right";
type TrialType = "congruent" | "incongruent";
type Phase = 1 | 2 | 3;
type GameStatus = "instructions" | "ready" | "playing" | "finished" | "transition" | "completed";
type TransitionContext = "initial" | "next-phase";

type Trial = {
  id: number;
  level: number;
  phase: Phase;
  arrowCount: number;
  targetIndex: number;
  stimulus: { direction: Direction }[];
  correctDirection: Direction;
  flankerDirection: Direction;
  type: TrialType;
  playerDirection: Direction | null;
  correct: boolean | null;
  reactionTimeMs: number | null;
  timedOut: boolean;
};

type LevelConfig = {
  level: number;
  phase: Phase;
  arrowCount: number;
  timePerTrialSeconds: number;
  incongruentRatio: number;
  trialsPerLevel: number;
  targetMode: "fixed" | "variable";
};

type LevelMetrics = {
  level: number;
  phase: Phase;
  totalTrials: number;
  correctCount: number;
  errorCount: number;
  accuracy: number;
  score: number;
  averageReactionMs: number;
  congruentAccuracy: number;
  incongruentAccuracy: number;
  congruentAverageReactionMs: number;
  incongruentAverageReactionMs: number;
};

type Props = {
  basePoints: number;
  startingLevel: number;
  maxLevelHint: number;
  reportContext?: ReportContext;
  onComplete: (result: { success: boolean; pointsEarned: number }) => void;
  hideInGameInfo?: boolean;
};

const ARROW_SYMBOL: Record<Direction, string> = {
  left: "←",
  right: "→",
};

const PHASE_1_ARROW_COUNT = 5;
const PHASE_2_ARROW_COUNT = 7;
const PHASE_3_ARROW_COUNT = 9;

const PHASE_1_TIME_SECONDS = 2.8;
const PHASE_2_TIME_SECONDS = 2;
const PHASE_3_TIME_SECONDS = 1.3;

const PHASE_1_INCONGRUENT_RATIO = 0.5;
const PHASE_2_INCONGRUENT_RATIO = 0.72;
const PHASE_3_INCONGRUENT_RATIO = 0.84;

const MIN_ACCURACY_TO_ADVANCE = 0.6;

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function oppositeDirection(direction: Direction): Direction {
  return direction === "left" ? "right" : "left";
}

function getLevelConfig(level: number): LevelConfig {
  // Fase 1: base do treino (5 setas, alvo central, tempo mais generoso)
  if (level <= 4) {
    return {
      level,
      phase: 1,
      arrowCount: PHASE_1_ARROW_COUNT,
      timePerTrialSeconds: PHASE_1_TIME_SECONDS,
      incongruentRatio: PHASE_1_INCONGRUENT_RATIO,
      trialsPerLevel: 8,
      targetMode: "fixed",
    };
  }

  // Fase 2: mais setas e maior conflito, mantendo alvo central
  if (level <= 8) {
    return {
      level,
      phase: 2,
      arrowCount: PHASE_2_ARROW_COUNT,
      timePerTrialSeconds: PHASE_2_TIME_SECONDS,
      incongruentRatio: PHASE_2_INCONGRUENT_RATIO,
      trialsPerLevel: 10,
      targetMode: "fixed",
    };
  }

  // Fase 3: alvo em posição variável e tempo curto
  return {
    level,
    phase: 3,
    arrowCount: PHASE_3_ARROW_COUNT,
    timePerTrialSeconds: PHASE_3_TIME_SECONDS,
    incongruentRatio: PHASE_3_INCONGRUENT_RATIO,
    trialsPerLevel: 12,
    targetMode: "variable",
  };
}

function generateTrial(id: number, config: LevelConfig): Trial {
  const TARGET_INDEX = 2;
  const targetDirection = randomItem<Direction>(["left", "right"]);
  const isIncongruent = Math.random() < config.incongruentRatio;
  const flankerDirection = isIncongruent
    ? oppositeDirection(targetDirection)
    : targetDirection;

  const stimulus = Array.from({ length: config.arrowCount }, (_, i) => ({
    direction: i === TARGET_INDEX ? targetDirection : flankerDirection,
  }));

  return {
    id,
    level: config.level,
    phase: config.phase,
    arrowCount: config.arrowCount,
    targetIndex: TARGET_INDEX,
    stimulus,
    correctDirection: stimulus[TARGET_INDEX]?.direction,
    flankerDirection,
    type: isIncongruent ? "incongruent" : "congruent",
    playerDirection: null,
    correct: null,
    reactionTimeMs: null,
    timedOut: false,
  };
}

function playFeedbackSound(correct: boolean) {
  const audioContext = new (window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
  if (!audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  if (correct) {
    oscillator.frequency.value = 860;
    oscillator.type = "sine";
    gainNode.gain.setValueAtTime(0.28, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.14);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.14);
  } else {
    oscillator.frequency.value = 180;
    oscillator.type = "sawtooth";
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.23);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.23);
  }
}

function buildLevelMetrics(trials: Trial[], level: number, phase: Phase, score: number): LevelMetrics {
  const completedTrials = trials.filter((trial) => trial.correct !== null);
  const correctTrials = completedTrials.filter((trial) => trial.correct);
  const congruentTrials = completedTrials.filter((trial) => trial.type === "congruent");
  const incongruentTrials = completedTrials.filter((trial) => trial.type === "incongruent");

  const congruentCorrect = congruentTrials.filter((trial) => trial.correct).length;
  const incongruentCorrect = incongruentTrials.filter((trial) => trial.correct).length;

  const allReactionTimes = completedTrials
    .map((trial) => trial.reactionTimeMs)
    .filter((time): time is number => time !== null);

  const congruentReactionTimes = congruentTrials
    .map((trial) => trial.reactionTimeMs)
    .filter((time): time is number => time !== null);

  const incongruentReactionTimes = incongruentTrials
    .map((trial) => trial.reactionTimeMs)
    .filter((time): time is number => time !== null);

  const average = (values: number[]) =>
    values.length > 0
      ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
      : 0;

  const accuracy =
    completedTrials.length > 0 ? correctTrials.length / completedTrials.length : 0;

  return {
    level,
    phase,
    totalTrials: completedTrials.length,
    correctCount: correctTrials.length,
    errorCount: completedTrials.length - correctTrials.length,
    accuracy,
    score,
    averageReactionMs: average(allReactionTimes),
    congruentAccuracy:
      congruentTrials.length > 0 ? congruentCorrect / congruentTrials.length : 0,
    incongruentAccuracy:
      incongruentTrials.length > 0 ? incongruentCorrect / incongruentTrials.length : 0,
    congruentAverageReactionMs: average(congruentReactionTimes),
    incongruentAverageReactionMs: average(incongruentReactionTimes),
  };
}

export function FlankerSetas({
  basePoints,
  startingLevel,
  maxLevelHint,
  reportContext,
  onComplete,
  hideInGameInfo,
}: Props) {
  const [level, setLevel] = useState(startingLevel);
  const [phase, setPhase] = useState(1); // Estado de fase explícito
  const [status, setStatus] = useState<GameStatus>("instructions");
  const [trials, setTrials] = useState<Trial[]>([]);
  const [currentTrialIndex, setCurrentTrialIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [errors, setErrors] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [allLevelMetrics, setAllLevelMetrics] = useState<LevelMetrics[]>([]);
  const [trialHistory, setTrialHistory] = useState<Trial[]>([]);
  const [transitionCountdown, setTransitionCountdown] = useState(3);
  const [nextLevel, setNextLevel] = useState<number | null>(null);
  const [transitionContext, setTransitionContext] = useState<TransitionContext>("next-phase");
  // Alvo sempre fixo no centro (índice 2)
  const TARGET_INDEX = 2;

  const trialStartTimeRef = useRef<number>(0);
  const trialResolvedRef = useRef(false);

  const config = useMemo(() => getLevelConfig(level), [level]);
  const currentTrial = trials[currentTrialIndex];





  const startLevel = useCallback(
    (levelToStart: number = level) => {
      const configToStart = getLevelConfig(levelToStart);
      const generatedTrials = Array.from(
        { length: configToStart.trialsPerLevel },
        (_, index) => generateTrial(index, configToStart),
      );

      setLevel(levelToStart);
      setPhase(configToStart.phase); // Atualiza fase
      setTrials(generatedTrials);
      setCurrentTrialIndex(0);
      setTimeRemaining(configToStart.timePerTrialSeconds);
      setScore(0);
      setHits(0);
      setErrors(0);
      setFeedback(null);
        const TARGET_INDEX = 2; // Definindo TARGET_INDEX como fixo
      trialStartTimeRef.current = performance.now();
      setStatus("playing");
    },
    [level],
  );

  const moveToNextTrial = useCallback(() => {
    const nextIndex = currentTrialIndex + 1;
    setFeedback(null);

    if (nextIndex >= trials.length) {
      setStatus("finished");
      return;
    }

    setCurrentTrialIndex(nextIndex);
    setTimeRemaining(config.timePerTrialSeconds);
    trialResolvedRef.current = false;
    trialStartTimeRef.current = performance.now();
  }, [config.timePerTrialSeconds, currentTrialIndex, trials.length]);

  const resolveTrial = useCallback(
    (playerDirection: Direction | null, timedOut: boolean) => {
      if (status !== "playing" || !currentTrial || trialResolvedRef.current) return;

      trialResolvedRef.current = true;

      const reactionTime = timedOut
        ? null
        : Math.max(0, performance.now() - trialStartTimeRef.current);

      // Proteção: garantir que o estímulo e o índice existem
      if (!currentTrial.stimulus || !currentTrial.stimulus[currentTrial.targetIndex]) {
        setFeedback(null);
        moveToNextTrial();
        return;
      }

      // Usa sempre o snapshot salvo no trial
      const correctDirection = currentTrial.correctDirection;
      const isCorrect = playerDirection === correctDirection;

      playFeedbackSound(isCorrect);
      setFeedback(isCorrect ? "correct" : "incorrect");


      setTrials((prev) =>
        prev.map((trial, index) =>
          index === currentTrialIndex
            ? {
                ...trial,
                playerDirection,
                correct: isCorrect,
                reactionTimeMs: reactionTime,
                timedOut,
              }
            : trial
        )
      );

      if (!currentTrial.stimulus || !currentTrial.stimulus[TARGET_INDEX]) {
        setFeedback(null);
        moveToNextTrial();
        return;
      }

      if (isCorrect) {
        setHits((value) => value + 1);
        setScore((value) => value + (reactionTime !== null && reactionTime <= 1000 ? 12 : 8));
      } else {
        setErrors((value) => value + 1);
      }

      window.setTimeout(() => {
        moveToNextTrial();
      }, 300);
    },
    [currentTrial, currentTrialIndex, moveToNextTrial, status]
  );

  const handleAnswer = useCallback(
    (direction: Direction) => {
      resolveTrial(direction, false);
    },
    [resolveTrial],
  );

  useEffect(() => {
    if (status !== "playing" || !currentTrial) {
      return;
    }

    const timer = window.setInterval(() => {
      setTimeRemaining((value) => {
        const next = Number((value - 0.1).toFixed(1));
        if (next <= 0) {
          window.clearInterval(timer);
          resolveTrial(null, true);
          return 0;
        }
        return next;
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [currentTrial, resolveTrial, status]);

  useEffect(() => {
    if (status !== "playing") {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }

      event.preventDefault();
      if (event.key === "ArrowLeft") {
        handleAnswer("left");
      } else {
        handleAnswer("right");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleAnswer, status]);

  const levelMetrics = useMemo(() => {
    if (status !== "finished") return null;
    return buildLevelMetrics(trials, level, config.phase, score);
  }, [config.phase, level, score, status, trials]);

  const progressToNextLevel = () => {
    if (!levelMetrics) return;

    const completedTrials = trials.filter(
      (trial): trial is Trial & { correct: boolean } => trial.correct !== null,
    );

    setAllLevelMetrics((prev) => [...prev, levelMetrics]);
    setTrialHistory((prev) => [...prev, ...completedTrials]);

    if (level >= maxLevelHint) {
      setStatus("completed");
      return;
    }

    const upcomingLevel = Math.min(maxLevelHint, level + 1);
    setTransitionContext("next-phase");
    setNextLevel(upcomingLevel);
    setTransitionCountdown(3);
    setPhase((prev) => prev + 1); // Avança a fase explicitamente
    setStatus("transition");
  };

  useEffect(() => {
    if (status !== "transition" || nextLevel === null) {
      return;
    }

    if (transitionCountdown <= 0) {
      const levelToStart = nextLevel;
      setNextLevel(null);
      startLevel(levelToStart);
      return;
    }

    const timer = window.setTimeout(() => {
      setTransitionCountdown((value) => value - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [nextLevel, startLevel, status, transitionCountdown]);

  const downloadResults = () => {
    const lines: string[] = [];
    lines.push("=" + "=".repeat(60));
    lines.push("RESULTADO - FLANKER DE SETAS (Atenção Seletiva)");
    lines.push("=" + "=".repeat(60));
    lines.push("");
    if (reportContext) {
      lines.push(
        `Escopo: ${
          reportContext.mode === "sequence"
            ? `Trilha completa (${reportContext.scopeLabel})`
            : `Jogo individual (${reportContext.scopeLabel})`
        }`,
      );
      lines.push("");
    }

    allLevelMetrics.forEach((metric, index) => {
      lines.push(`Nível ${index + 1} (Fase ${metric.phase}):`);
      lines.push(`  Tentativas: ${metric.totalTrials}`);
      lines.push(`  Acertos: ${metric.correctCount}`);
      lines.push(`  Erros: ${metric.errorCount}`);
      lines.push(`  Pontuação: ${metric.score}`);
      lines.push(`  Acurácia geral: ${Math.round(metric.accuracy * 100)}%`);
      lines.push(`  Acurácia congruentes: ${Math.round(metric.congruentAccuracy * 100)}%`);
      lines.push(`  Acurácia incongruentes: ${Math.round(metric.incongruentAccuracy * 100)}%`);
      lines.push(`  TR médio geral: ${metric.averageReactionMs}ms`);
      lines.push(`  TR médio congruentes: ${metric.congruentAverageReactionMs}ms`);
      lines.push(`  TR médio incongruentes: ${metric.incongruentAverageReactionMs}ms`);
      lines.push("");
    });

    const totalTrials = allLevelMetrics.reduce((sum, metric) => sum + metric.totalTrials, 0);
    const totalCorrect = allLevelMetrics.reduce((sum, metric) => sum + metric.correctCount, 0);
    const totalErrors = allLevelMetrics.reduce((sum, metric) => sum + metric.errorCount, 0);
    const totalScore = allLevelMetrics.reduce((sum, metric) => sum + metric.score, 0);
    const totalAccuracy = totalTrials > 0 ? Math.round((totalCorrect / totalTrials) * 100) : 0;

    const phaseSummary = ([1, 2, 3] as const).map((phase) => {
      const phaseTrials = trialHistory.filter((trial) => trial.phase === phase);
      const phaseCorrect = phaseTrials.filter((trial) => trial.correct).length;
      const phaseErrors = phaseTrials.length - phaseCorrect;
      const reactionTimes = phaseTrials
        .map((trial) => trial.reactionTimeMs)
        .filter((time): time is number => time !== null);
      const averageReactionMs =
        reactionTimes.length > 0
          ? Math.round(reactionTimes.reduce((sum, time) => sum + time, 0) / reactionTimes.length)
          : 0;

      return {
        phase,
        trials: phaseTrials.length,
        correct: phaseCorrect,
        errors: phaseErrors,
        averageReactionMs,
      };
    });

    lines.push("=" + "=".repeat(60));
    lines.push("RESUMO TOTAL:");
    lines.push(`Níveis completados: ${allLevelMetrics.length}`);
    lines.push(`Tentativas totais: ${totalTrials}`);
    lines.push(`Acertos totais: ${totalCorrect}`);
    lines.push(`Erros totais: ${totalErrors}`);
    lines.push(`Pontuação total: ${totalScore}`);
    lines.push(`Acurácia geral: ${totalAccuracy}%`);
    lines.push("");
    lines.push("Totais por fase:");
    phaseSummary.forEach((phaseData) => {
      lines.push(
        `Fase ${phaseData.phase}: tentativas ${phaseData.trials}, acertos ${phaseData.correct}, erros ${phaseData.errors}, TR médio ${phaseData.averageReactionMs}ms`,
      );
    });
    lines.push("");
    lines.push("Detalhe por tentativa:");
    trialHistory.forEach((trial, index) => {
      lines.push(
        `#${index + 1} | fase ${trial.phase} | tipo ${trial.type} | correta ${trial.correctDirection} | resposta ${trial.playerDirection ?? "sem resposta"} | acerto ${trial.correct ? "sim" : "não"} | TR ${trial.reactionTimeMs ?? 0}ms`,
      );
    });
    lines.push("=" + "=".repeat(60));

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = buildTxtReportFileName({
      mode: reportContext?.mode ?? "single",
      attentionTypeLabel: reportContext?.attentionTypeLabel,
      participantName: reportContext?.participantName,
    });
    link.click();
    URL.revokeObjectURL(url);
  };

  const finishExercise = () => {
    const totalTrials = allLevelMetrics.reduce((sum, metric) => sum + metric.totalTrials, 0);
    const totalCorrect = allLevelMetrics.reduce((sum, metric) => sum + metric.correctCount, 0);
    const accuracy = totalTrials > 0 ? totalCorrect / totalTrials : 0;

    const success = accuracy >= MIN_ACCURACY_TO_ADVANCE;
    const pointsEarned = success ? basePoints : Math.round(basePoints * 0.4);
    onComplete({ success, pointsEarned });
  };

  const sessionSummary = useMemo(() => {
    const totalTrials = allLevelMetrics.reduce((sum, metric) => sum + metric.totalTrials, 0);
    const totalCorrect = allLevelMetrics.reduce((sum, metric) => sum + metric.correctCount, 0);
    const totalErrors = allLevelMetrics.reduce((sum, metric) => sum + metric.errorCount, 0);
    const totalScore = allLevelMetrics.reduce((sum, metric) => sum + metric.score, 0);

    const congruentTrialsWeight = allLevelMetrics.reduce(
      (sum, metric) => sum + metric.totalTrials,
      0,
    );

    const averageCongruentAccuracy =
      allLevelMetrics.length > 0
        ? Math.round(
            (allLevelMetrics.reduce((sum, metric) => sum + metric.congruentAccuracy, 0) /
              allLevelMetrics.length) *
              100,
          )
        : 0;

    const averageIncongruentAccuracy =
      allLevelMetrics.length > 0
        ? Math.round(
            (allLevelMetrics.reduce((sum, metric) => sum + metric.incongruentAccuracy, 0) /
              allLevelMetrics.length) *
              100,
          )
        : 0;

    const avgReaction =
      allLevelMetrics.length > 0
        ? Math.round(
            allLevelMetrics.reduce((sum, metric) => sum + metric.averageReactionMs, 0) /
              allLevelMetrics.length,
          )
        : 0;

    const byPhase = ([1, 2, 3] as const).map((phase) => {
      const phaseTrials = trialHistory.filter((trial) => trial.phase === phase);
      const correct = phaseTrials.filter((trial) => trial.correct).length;
      const errors = phaseTrials.length - correct;
      const reactionTimes = phaseTrials
        .map((trial) => trial.reactionTimeMs)
        .filter((time): time is number => time !== null);
      const averageReactionMs =
        reactionTimes.length > 0
          ? Math.round(reactionTimes.reduce((sum, time) => sum + time, 0) / reactionTimes.length)
          : 0;

      return {
        phase,
        trials: phaseTrials.length,
        correct,
        errors,
        averageReactionMs,
      };
    });

    return {
      totalTrials,
      totalCorrect,
      totalErrors,
      totalScore,
      overallAccuracy: totalTrials > 0 ? Math.round((totalCorrect / totalTrials) * 100) : 0,
      averageCongruentAccuracy,
      averageIncongruentAccuracy,
      avgReaction,
      hasTrials: congruentTrialsWeight > 0,
      byPhase,
    };
  }, [allLevelMetrics, trialHistory]);

  return (
    <div className="mt-4 space-y-4">
      {status === "instructions" && (
        <div className="space-y-3 rounded-lg border border-black/10 bg-zinc-50 p-4 sm:p-6">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-zinc-900">Foque na Seta</h3>
            <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-zinc-700">
              Você deve indicar a direção apenas da seta destacada (alvo), ignorando as setas ao lado
            </p>
          </div>

          <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-zinc-700">
            <p><strong>Como jogar:</strong></p>
            <p>Veja a fileira de setas e encontre a seta em destaque (alvo).</p>
            <p>Se o alvo apontar para a esquerda, pressione ←.</p>
            <p>Se o alvo apontar para a direita, pressione →.</p>
            <p>Ignore as setas ao redor, mesmo que apontem para o lado contrário.</p>
            <p>Responda o mais rápido que conseguir, antes do tempo acabar.</p>
          </div>

          <button
            type="button"
            onClick={() => {
              setTransitionContext("initial");
              setNextLevel(level);
              setTransitionCountdown(3);
              setStatus("transition");
            }}
            className="rounded-lg bg-zinc-900 px-3 py-2 sm:px-4 sm:py-2 font-medium text-white hover:bg-zinc-700 text-sm sm:text-base"
          >
            Começar
          </button>
        </div>
      )}

      {status === "playing" && currentTrial && (
        <div className="space-y-3 sm:space-y-5">
          {/* Barra de progresso */}
          <div className="h-1.5 sm:h-2 overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full bg-zinc-900 transition-all"
              style={{
                width: `${Math.max(0, (timeRemaining / config.timePerTrialSeconds) * 100)}%`,
              }}
            />
          </div>

          {/* Área das setas */}
          <div
            className={`rounded-xl sm:rounded-2xl border-2 sm:border-4 p-3 sm:p-6 transition-colors ${
              feedback === "correct"
                ? "border-emerald-400 bg-emerald-50"
                : feedback === "incorrect"
                  ? "border-rose-400 bg-rose-50"
                  : "border-black/10 bg-white"
            }`}
          >
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-3">
              {currentTrial.stimulus.map((stim, index) => {
                const isTarget = index === currentTrial.targetIndex;
                return (
                  <span
                    key={`${currentTrial.id}-${index}`}
                    className={`inline-flex h-10 w-10 sm:h-16 sm:w-16 select-none items-center justify-center rounded-lg sm:rounded-xl text-3xl sm:text-5xl font-semibold sm:font-semibold ${
                      isTarget
                        ? "border-2 border-zinc-900 bg-zinc-100 text-zinc-900"
                        : "border border-black/10 bg-white text-zinc-700"
                    }`}
                    aria-label={isTarget ? "Seta alvo" : "Seta flanqueadora"}
                  >
                    {ARROW_SYMBOL[stim.direction]}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Botões de resposta mais próximos */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-1 sm:mt-3">
            <button
              type="button"
              onClick={() => handleAnswer("left")}
              className="rounded-lg border border-black/20 p-2 sm:p-3 font-medium text-zinc-900 hover:bg-zinc-100 text-base sm:text-lg"
            >
              ← Esquerda
            </button>
            <button
              type="button"
              onClick={() => handleAnswer("right")}
              className="rounded-lg border border-black/20 p-2 sm:p-3 font-medium text-zinc-900 hover:bg-zinc-100 text-base sm:text-lg"
            >
              Direita →
            </button>
          </div>
        </div>
      )}

      {status === "finished" && levelMetrics && (
        <div className="rounded-lg border border-black/10 bg-zinc-50 p-4 sm:p-6">
          <p className="mb-3 sm:mb-4 text-center font-semibold text-zinc-900">
            Fase concluída!
          </p>

          <button
            type="button"
            onClick={progressToNextLevel}
            className="h-10 sm:h-11 w-full rounded-lg bg-zinc-900 px-3 sm:px-4 py-2 font-medium text-white hover:bg-zinc-700 text-base sm:text-lg"
          >
            Avançar para a próxima
          </button>
        </div>
      )}

      {status === "transition" && (
        <div className="rounded-lg border border-black/10 bg-zinc-50 p-4 sm:p-6">
          <p className="mb-1 sm:mb-2 text-center text-lg sm:text-xl font-semibold text-zinc-900">
            {transitionContext === "initial" ? "Foque na Seta" : "Fase concluída!"}
          </p>
          <p className="text-center text-xs sm:text-sm text-zinc-700">
            {transitionContext === "initial"
              ? "Iniciando em"
              : "Próxima fase começa em"}
          </p>
          <p className="mt-1 sm:mt-2 text-center text-3xl sm:text-4xl font-semibold text-zinc-900">
            {transitionCountdown}
          </p>
        </div>
      )}

      {status === "completed" && (
        <div className="space-y-3 sm:space-y-4 rounded-lg border border-black/10 bg-zinc-50 p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-semibold text-zinc-900">Foque na Seta concluído!</h3>

          <div className="space-y-2 sm:space-y-3">
            {allLevelMetrics.map((metric, index) => {
              const totalClicks = metric.totalTrials;
              const accuracy = totalClicks > 0 ? Math.round((metric.correctCount / totalClicks) * 100) : 0;
              return (
                <div key={index} className="rounded-lg border border-black/10 bg-white p-2 sm:p-3">
                  <p className="text-xs sm:text-sm font-medium text-zinc-900">Fase {index + 1}</p>
                  <div className="mt-1 grid grid-cols-2 gap-1 sm:gap-2 text-xs text-zinc-600">
                    <p>Status: {metric.accuracy >= MIN_ACCURACY_TO_ADVANCE ? "✓ Completada" : "✗ Não atingiu precisão"}</p>
                    <p>Acurácia: {accuracy}%</p>
                    <p>Acertos: {metric.correctCount}</p>
                    <p>Erros: {metric.errorCount}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-lg border-2 border-zinc-900 bg-white p-3 sm:p-4">
            <p className="font-semibold text-zinc-900 text-sm sm:text-base">Resumo Total</p>
            <div className="mt-2 grid gap-1 sm:gap-2 text-xs sm:text-sm text-black">
              <p>Acertos totais: {sessionSummary.totalCorrect}</p>
              <p>Erros totais: {sessionSummary.totalErrors}</p>
              <p>Acurácia geral: {sessionSummary.overallAccuracy}%</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              type="button"
              onClick={downloadResults}
              className="flex-1 rounded-lg bg-blue-600 px-3 sm:px-4 py-2 font-medium text-white hover:bg-blue-700 text-sm sm:text-base"
            >
              Baixar Resultados
            </button>
            <button
              type="button"
              onClick={finishExercise}
              className="flex-1 rounded-lg bg-zinc-900 px-3 sm:px-4 py-2 font-medium text-white hover:bg-zinc-700 text-sm sm:text-base"
            >
              Continuar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
