"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ColorName = "vermelho" | "azul" | "verde" | "amarelo" | "roxo" | "laranja";
type TrialType = "congruent" | "incongruent";
type GameStatus = "ready" | "playing" | "finished";

type Trial = {
  id: number;
  wordText: ColorName;
  inkColor: ColorName;
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
      level,
      colors: ["vermelho", "azul", "verde"],
      timePerTrialSeconds: 4,
      incongruentRatio: 0.6,
      trialsPerLevel: 8,
    };
  }

  if (level <= 5) {
    return {
      level,
      colors: ["vermelho", "azul", "verde", "amarelo", "roxo"],
      timePerTrialSeconds: 3,
      incongruentRatio: 0.7,
      trialsPerLevel: 10,
    };
  }

  return {
    level,
    colors: ["vermelho", "azul", "verde", "amarelo", "roxo", "laranja"],
    timePerTrialSeconds: 2,
    incongruentRatio: 0.75,
    trialsPerLevel: 12,
  };
}

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function generateTrial(
  id: number,
  colors: ColorName[],
  incongruentRatio: number,
): Trial {
  const isIncongruent = Math.random() < incongruentRatio;
  const inkColor = randomItem(colors);
  const wordText = isIncongruent
    ? randomItem(colors.filter((color) => color !== inkColor))
    : inkColor;

  return {
    id,
    wordText,
    inkColor,
    type: isIncongruent ? "incongruent" : "congruent",
    correctAnswer: inkColor,
    playerAnswer: null,
    correct: null,
    reactionTimeMs: null,
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
    oscillator.frequency.value = 800;
    oscillator.type = "sine";
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.15,
    );
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.15);
  } else {
    oscillator.frequency.value = 200;
    oscillator.type = "sawtooth";
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.25,
    );
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.25);
  }
}

export function StroopInvertido({
  basePoints,
  startingLevel,
  maxLevelHint,
  onComplete,
}: Props) {
  const [level, setLevel] = useState(startingLevel);
  const [status, setStatus] = useState<GameStatus>("ready");
  const [currentTrialIndex, setCurrentTrialIndex] = useState(0);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);

  const trialStartTimeRef = useRef<number>(0);
  const config = useMemo(() => getLevelConfig(level), [level]);

  const startLevel = useCallback(() => {
    const generatedTrials = Array.from(
      { length: config.trialsPerLevel },
      (_, index) =>
        generateTrial(index, config.colors, config.incongruentRatio),
    );

    setTrials(generatedTrials);
    setCurrentTrialIndex(0);
    setTimeRemaining(config.timePerTrialSeconds);
    trialStartTimeRef.current = performance.now();
    setStatus("playing");
  }, [config]);

  const currentTrial = trials[currentTrialIndex];

  const handleAnswer = useCallback(
    (selectedColor: ColorName) => {
      if (status !== "playing" || !currentTrial) return;

      const reactionTime = performance.now() - trialStartTimeRef.current;
      const isCorrect = selectedColor === currentTrial.correctAnswer;

      playFeedbackSound(isCorrect);
      setFeedback(isCorrect ? "correct" : "incorrect");

      setTrials((prev) =>
        prev.map((trial, index) =>
          index === currentTrialIndex
            ? {
                ...trial,
                playerAnswer: selectedColor,
                correct: isCorrect,
                reactionTimeMs: reactionTime,
              }
            : trial,
        ),
      );

      setScore((prev) => {
        if (isCorrect) {
          return prev + (reactionTime < 1500 ? 10 : 5);
        }
        return Math.max(0, prev - 5);
      });

      setTimeout(() => {
        setFeedback(null);
        const nextIndex = currentTrialIndex + 1;

        if (nextIndex >= trials.length) {
          setStatus("finished");
          return;
        }

        setCurrentTrialIndex(nextIndex);
        setTimeRemaining(config.timePerTrialSeconds);
        trialStartTimeRef.current = performance.now();
      }, 400);
    },
    [status, currentTrial, currentTrialIndex, trials.length, config.timePerTrialSeconds],
  );

  useEffect(() => {
    if (status !== "playing" || !currentTrial) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        const next = Number((prev - 0.1).toFixed(1));
        if (next <= 0) {
          handleAnswer(currentTrial.correctAnswer === "vermelho" ? "azul" : "vermelho");
          return 0;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [status, currentTrial, handleAnswer]);

  const metrics = useMemo((): SessionMetrics | null => {
    if (status !== "finished") return null;

    const completedTrials = trials.filter((trial) => trial.correct !== null);
    const correctTrials = completedTrials.filter((trial) => trial.correct);
    const congruentTrials = completedTrials.filter((trial) => trial.type === "congruent");
    const incongruentTrials = completedTrials.filter(
      (trial) => trial.type === "incongruent",
    );

    const congruentCorrect = congruentTrials.filter((trial) => trial.correct).length;
    const incongruentCorrect = incongruentTrials.filter((trial) => trial.correct).length;

    const reactionTimes = correctTrials
      .map((trial) => trial.reactionTimeMs)
      .filter((time): time is number => time !== null);

    return {
      totalTrials: completedTrials.length,
      correctCount: correctTrials.length,
      errorCount: completedTrials.length - correctTrials.length,
      averageReactionMs:
        reactionTimes.length > 0
          ? Math.round(
              reactionTimes.reduce((sum, time) => sum + time, 0) / reactionTimes.length,
            )
          : 0,
      congruentAccuracy:
        congruentTrials.length > 0 ? congruentCorrect / congruentTrials.length : 0,
      incongruentAccuracy:
        incongruentTrials.length > 0
          ? incongruentCorrect / incongruentTrials.length
          : 0,
    };
  }, [status, trials]);

  const progressToNextLevel = () => {
    if (metrics && metrics.correctCount / metrics.totalTrials >= 0.7) {
      setLevel((prev) => Math.min(maxLevelHint, prev + 1));
    } else if (metrics && metrics.correctCount / metrics.totalTrials < 0.4) {
      setLevel((prev) => Math.max(1, prev - 1));
    }
    setStatus("ready");
    setScore(0);
  };

  const finishExercise = () => {
    const success = metrics ? metrics.correctCount / metrics.totalTrials >= 0.6 : false;
    const pointsEarned = success ? basePoints : Math.round(basePoints * 0.4);
    onComplete({ success, pointsEarned });
  };

  return (
    <div className="mt-4 space-y-4">
      {status === "ready" && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-zinc-50 p-6">
          <div>
            <p className="text-sm text-zinc-500">Nível {level}</p>
            <h3 className="mt-1 text-xl font-semibold text-zinc-900">
              Stroop Invertido
            </h3>
            <p className="mt-2 text-sm text-zinc-700">
              Você verá palavras com nomes de cores. Clique no botão que corresponde à{" "}
              <strong>cor da tinta</strong>, não ao texto da palavra.
            </p>
          </div>

          <div className="grid gap-2 text-sm">
            <p>
              <strong>Cores disponíveis:</strong> {config.colors.length}
            </p>
            <p>
              <strong>Tempo por tentativa:</strong> {config.timePerTrialSeconds}s
            </p>
            <p>
              <strong>Tentativas no nível:</strong> {config.trialsPerLevel}
            </p>
          </div>

          <button
            type="button"
            onClick={startLevel}
            className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
          >
            Iniciar nível
          </button>
        </div>
      )}

      {status === "playing" && currentTrial && (
        <div className="space-y-5">
          <div className="grid gap-3 text-sm sm:grid-cols-4">
            <div className="rounded-lg border border-black/10 p-3">
              <p className="text-zinc-500">Tentativa</p>
              <p className="font-semibold text-zinc-900">
                {currentTrialIndex + 1}/{trials.length}
              </p>
            </div>
            <div className="rounded-lg border border-black/10 p-3">
              <p className="text-zinc-500">Pontuação</p>
              <p className="font-semibold text-zinc-900">{score}</p>
            </div>
            <div className="rounded-lg border border-black/10 p-3">
              <p className="text-zinc-500">Tempo</p>
              <p className="font-semibold text-zinc-900">{timeRemaining.toFixed(1)}s</p>
            </div>
            <div className="rounded-lg border border-black/10 p-3">
              <p className="text-zinc-500">Nível</p>
              <p className="font-semibold text-zinc-900">{level}</p>
            </div>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full bg-zinc-900 transition-all"
              style={{
                width: `${Math.max(0, (timeRemaining / config.timePerTrialSeconds) * 100)}%`,
              }}
            />
          </div>

          <div
            className={`flex min-h-[200px] items-center justify-center rounded-2xl border-4 p-8 transition-colors ${
              feedback === "correct"
                ? "border-emerald-400 bg-emerald-50"
                : feedback === "incorrect"
                  ? "border-rose-400 bg-rose-50"
                  : "border-black/10 bg-white"
            }`}
          >
            <p
              className="select-none text-center text-6xl font-bold uppercase tracking-wider sm:text-8xl"
              style={{ color: COLOR_MAP[currentTrial.inkColor] }}
            >
              {currentTrial.wordText}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {config.colors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handleAnswer(color)}
                disabled={feedback !== null}
                className="flex items-center gap-2 rounded-lg border border-black/20 p-3 font-medium transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span
                  className="block h-6 w-6 rounded-full border border-black/20"
                  style={{ backgroundColor: COLOR_MAP[color] }}
                />
                <span className="text-zinc-900">{COLOR_LABELS[color]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {status === "finished" && metrics && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-zinc-50 p-6">
          <h3 className="text-xl font-semibold text-zinc-900">Nível concluído</h3>

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg border border-black/10 bg-white p-3">
              <p className="text-zinc-500">Tentativas</p>
              <p className="font-semibold text-zinc-900">{metrics.totalTrials}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-white p-3">
              <p className="text-zinc-500">Pontuação final</p>
              <p className="font-semibold text-zinc-900">{score}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-white p-3">
              <p className="text-zinc-500">Acertos</p>
              <p className="font-semibold text-emerald-600">{metrics.correctCount}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-white p-3">
              <p className="text-zinc-500">Erros</p>
              <p className="font-semibold text-rose-600">{metrics.errorCount}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-white p-3">
              <p className="text-zinc-500">Tempo médio</p>
              <p className="font-semibold text-zinc-900">
                {metrics.averageReactionMs}ms
              </p>
            </div>
            <div className="rounded-lg border border-black/10 bg-white p-3">
              <p className="text-zinc-500">Acurácia geral</p>
              <p className="font-semibold text-zinc-900">
                {Math.round((metrics.correctCount / metrics.totalTrials) * 100)}%
              </p>
            </div>
            <div className="rounded-lg border border-black/10 bg-white p-3">
              <p className="text-zinc-500">Congruentes</p>
              <p className="font-semibold text-zinc-900">
                {Math.round(metrics.congruentAccuracy * 100)}%
              </p>
            </div>
            <div className="rounded-lg border border-black/10 bg-white p-3">
              <p className="text-zinc-500">Incongruentes</p>
              <p className="font-semibold text-zinc-900">
                {Math.round(metrics.incongruentAccuracy * 100)}%
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={progressToNextLevel}
              className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
            >
              Próximo nível
            </button>
            <button
              type="button"
              onClick={finishExercise}
              className="rounded-lg border border-black/20 px-4 py-2 font-medium text-zinc-800 hover:bg-zinc-100"
            >
              Finalizar exercício
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
