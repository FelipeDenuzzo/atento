"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

function shuffle<T>(array: T[]): T[] {
  const clone = [...array];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

function formatText(word: ColorName, textCase: TextCase): string {
  const text = word.toUpperCase();
  if (textCase === "uppercase") return text;
  if (textCase === "lowercase") return text.toLowerCase();
  return text.charAt(0) + text.slice(1).toLowerCase();
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
  const textCase = randomItem<TextCase>(["uppercase", "lowercase", "capitalize"]);

  return {
    id,
    wordText,
    inkColor,
    textCase,
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
  const [status, setStatus] = useState<GameStatus>("instructions");
  const [currentTrialIndex, setCurrentTrialIndex] = useState(0);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [allLevelMetrics, setAllLevelMetrics] = useState<LevelMetrics[]>([]);
  const [colorOrder, setColorOrder] = useState<ColorName[]>([]);

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
    setColorOrder(shuffle(config.colors));
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
        setColorOrder(shuffle(config.colors));
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
    if (!metrics) return;

    const levelMetrics: LevelMetrics = {
      level,
      totalTrials: metrics.totalTrials,
      correctCount: metrics.correctCount,
      errorCount: metrics.errorCount,
      averageReactionMs: metrics.averageReactionMs,
      congruentAccuracy: metrics.congruentAccuracy,
      incongruentAccuracy: metrics.incongruentAccuracy,
      score,
    };

    setAllLevelMetrics(prev => [...prev, levelMetrics]);

    if (level >= maxLevelHint) {
      setStatus("completed");
      return;
    }

    if (metrics.correctCount / metrics.totalTrials >= 0.7) {
      setLevel((prev) => Math.min(maxLevelHint, prev + 1));
    } else if (metrics.correctCount / metrics.totalTrials < 0.4) {
      setLevel((prev) => Math.max(1, prev - 1));
    }
    setStatus("ready");
    setScore(0);
  };

  const finishExercise = () => {
    const allMetrics = metrics ? [...allLevelMetrics, {
      level,
      totalTrials: metrics.totalTrials,
      correctCount: metrics.correctCount,
      errorCount: metrics.errorCount,
      averageReactionMs: metrics.averageReactionMs,
      congruentAccuracy: metrics.congruentAccuracy,
      incongruentAccuracy: metrics.incongruentAccuracy,
      score,
    }] : allLevelMetrics;
    const totalCorrect = allMetrics.reduce((sum, m) => sum + m.correctCount, 0);
    const totalTrials = allMetrics.reduce((sum, m) => sum + m.totalTrials, 0);
    const success = totalTrials > 0 ? totalCorrect / totalTrials >= 0.6 : false;
    const pointsEarned = success ? basePoints : Math.round(basePoints * 0.4);
    onComplete({ success, pointsEarned });
  };

  const downloadResults = () => {
    const allMetrics = metrics ? [...allLevelMetrics, {
      level,
      totalTrials: metrics.totalTrials,
      correctCount: metrics.correctCount,
      errorCount: metrics.errorCount,
      averageReactionMs: metrics.averageReactionMs,
      congruentAccuracy: metrics.congruentAccuracy,
      incongruentAccuracy: metrics.incongruentAccuracy,
      score,
    }] : allLevelMetrics;

    const lines: string[] = [];
    lines.push("=" + "=".repeat(60));
    lines.push("RESULTADO - STROOP INVERTIDO (Atenção Sustentada)");
    lines.push("=" + "=".repeat(60));
    lines.push("");
    
    allMetrics.forEach((m, idx) => {
      lines.push(`Nível ${idx + 1}:`);
      lines.push(`  Tentativas: ${m.totalTrials}`);
      lines.push(`  Acertos: ${m.correctCount}`);
      lines.push(`  Erros: ${m.errorCount}`);
      lines.push(`  Pontuação: ${m.score}`);
      lines.push(`  Tempo médio: ${m.averageReactionMs}ms`);
      lines.push(`  Acurácia congruentes: ${Math.round(m.congruentAccuracy * 100)}%`);
      lines.push(`  Acurácia incongruentes: ${Math.round(m.incongruentAccuracy * 100)}%`);
      const overall = m.totalTrials > 0 ? Math.round((m.correctCount / m.totalTrials) * 100) : 0;
      lines.push(`  Acurácia geral: ${overall}%`);
      lines.push("");
    });

    const totalCorrect = allMetrics.reduce((sum, m) => sum + m.correctCount, 0);
    const totalErrors = allMetrics.reduce((sum, m) => sum + m.errorCount, 0);
    const totalTrials = allMetrics.reduce((sum, m) => sum + m.totalTrials, 0);
    const totalScore = allMetrics.reduce((sum, m) => sum + m.score, 0);
    const overallAccuracy = totalTrials > 0 ? Math.round((totalCorrect / totalTrials) * 100) : 0;

    lines.push("=" + "=".repeat(60));
    lines.push("RESUMO TOTAL:");
    lines.push(`Níveis completados: ${allMetrics.length}`);
    lines.push(`Tentativas totais: ${totalTrials}`);
    lines.push(`Acertos totais: ${totalCorrect}`);
    lines.push(`Erros totais: ${totalErrors}`);
    lines.push(`Pontuação total: ${totalScore}`);
    lines.push(`Acurácia geral: ${overallAccuracy}%`);
    lines.push("=" + "=".repeat(60));

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `atento_stroop_invertido_${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-4 space-y-4">
      {status === "instructions" && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-zinc-50 p-6">
          <div>
            <h3 className="text-xl font-semibold text-zinc-900">Stroop Invertido</h3>
            <p className="mt-2 text-sm text-zinc-700">
              Identifique a cor da tinta usada para escrever a palavra, ignorando o que a palavra diz.
            </p>
          </div>

          <div className="space-y-2 text-sm text-zinc-700">
            <p><strong>Como jogar:</strong></p>
            <ul className="ml-4 list-disc space-y-1">
              <li>Uma palavra com o nome de uma cor aparecerá na tela</li>
              <li>Clique no botão que corresponde à <strong>cor da tinta</strong>, não ao texto</li>
              <li>Exemplo: se aparecer "VERDE" escrito em azul, clique em Azul</li>
              <li>Seja rápido! Você tem tempo limitado por tentativa</li>
            </ul>
          </div>

          <button
            type="button"
            onClick={() => setStatus("ready")}
            className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
          >
            Começar
          </button>
        </div>
      )}

      {status === "ready" && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-zinc-50 p-6">
          <button
            type="button"
            onClick={startLevel}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
          >
            Iniciar nível
          </button>
        </div>
      )}

      {status === "playing" && currentTrial && (
        <div className="space-y-5">
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
              className="select-none text-center text-6xl font-bold tracking-wider sm:text-8xl"
              style={{ color: COLOR_MAP[currentTrial.inkColor] }}
            >
              {formatText(currentTrial.wordText, currentTrial.textCase)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {colorOrder.map((color) => (
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
        <div className="space-y-4 rounded-lg border border-black/10 bg-zinc-50 p-4">
          <p className="text-center font-semibold text-zinc-900">Nível concluído!</p>

          <button
            type="button"
            onClick={progressToNextLevel}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
          >
            Avançar
          </button>
        </div>
      )}

      {status === "completed" && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-zinc-50 p-6">
          <h3 className="text-xl font-semibold text-zinc-900">Jogo concluído!</h3>

          <div className="space-y-3">
            {allLevelMetrics.map((m, idx) => {
              const accuracy = m.totalTrials > 0 ? Math.round((m.correctCount / m.totalTrials) * 100) : 0;
              return (
                <div key={idx} className="rounded-lg border border-black/10 bg-white p-3">
                  <p className="text-sm font-medium text-zinc-900">Nível {idx + 1}</p>
                  <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-zinc-600">
                    <p>Pontuação: {m.score}</p>
                    <p>Acurácia: {accuracy}%</p>
                    <p>Acertos: {m.correctCount}</p>
                    <p>Erros: {m.errorCount}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-lg border-2 border-zinc-900 bg-white p-4">
            <p className="font-semibold text-zinc-900">Resumo Total</p>
            <div className="mt-2 grid gap-2 text-sm">
              <p>Níveis completados: {allLevelMetrics.length}</p>
              <p>Pontuação total: {allLevelMetrics.reduce((sum, m) => sum + m.score, 0)}</p>
              <p>Acertos totais: {allLevelMetrics.reduce((sum, m) => sum + m.correctCount, 0)}</p>
              <p>Erros totais: {allLevelMetrics.reduce((sum, m) => sum + m.errorCount, 0)}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={downloadResults}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              Baixar Resultados
            </button>
            <button
              type="button"
              onClick={finishExercise}
              className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
            >
              Continuar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
