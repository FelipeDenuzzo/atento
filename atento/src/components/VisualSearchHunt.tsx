"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Shape = "circle" | "square" | "triangle";
type Color = "red" | "blue" | "green" | "yellow";
type SearchMode = "feature" | "mixed" | "conjunction";
type RoundStatus = "ready" | "playing" | "won" | "lost";

type Tile = {
  id: string;
  shape: Shape;
  color: Color;
  isTarget: boolean;
  found: boolean;
};

type RoundMetrics = {
  level: number;
  timeRemaining: number;
  hits: number;
  errors: number;
  averageReactionMs: number;
  status: Exclude<RoundStatus, "ready" | "playing">;
};

type Props = {
  basePoints: number;
  startingLevel: number;
  maxLevelHint: number;
  onComplete: (result: { success: boolean; pointsEarned: number }) => void;
};

const SHAPES: Shape[] = ["circle", "square", "triangle"];
const COLORS: Color[] = ["red", "blue", "green", "yellow"];

const shapeLabel: Record<Shape, string> = {
  circle: "círculos",
  square: "quadrados",
  triangle: "triângulos",
};

const colorLabel: Record<Color, string> = {
  red: "vermelhos",
  blue: "azuis",
  green: "verdes",
  yellow: "amarelos",
};

const colorClass: Record<Color, string> = {
  red: "bg-red-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  yellow: "bg-yellow-400",
};

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

function getLevelConfig(level: number): {
  mode: SearchMode;
  gridSize: number;
  targetMin: number;
  targetMax: number;
  timeSeconds: number;
  errorPenaltySeconds: number;
} {
  if (level <= 3) {
    return {
      mode: "feature",
      gridSize: level <= 2 ? 4 : 5,
      targetMin: 4,
      targetMax: 7,
      timeSeconds: 35,
      errorPenaltySeconds: 1,
    };
  }

  if (level <= 7) {
    return {
      mode: "mixed",
      gridSize: Math.min(8, 5 + (level - 3)),
      targetMin: 6,
      targetMax: 10,
      timeSeconds: Math.max(20, 32 - (level - 4) * 2),
      errorPenaltySeconds: 1,
    };
  }

  return {
    mode: "conjunction",
    gridSize: 8,
    targetMin: 7,
    targetMax: 11,
    timeSeconds: Math.max(14, 22 - Math.floor((level - 8) / 2)),
    errorPenaltySeconds: 2,
  };
}

function getShapeClass(shape: Shape): string {
  if (shape === "circle") {
    return "rounded-full";
  }
  if (shape === "square") {
    return "rounded-none";
  }
  return "triangle-shape";
}

function getSuggestion({
  status,
  accuracy,
  timeRatio,
}: {
  status: RoundMetrics["status"];
  accuracy: number;
  timeRatio: number;
}): { nextLevelDelta: -1 | 0 | 1; text: string } {
  if (status === "won" && accuracy >= 0.85 && timeRatio >= 0.25) {
    return {
      nextLevelDelta: 1,
      text: "Desempenho forte. Dificuldade aumentada na próxima rodada.",
    };
  }

  if (status === "lost" || accuracy < 0.5) {
    return {
      nextLevelDelta: -1,
      text: "Rodada exigente. Dificuldade reduzida para estabilizar precisão.",
    };
  }

  return {
    nextLevelDelta: 0,
    text: "Desempenho consistente. Dificuldade mantida para consolidar busca visual.",
  };
}

export function VisualSearchHunt({
  basePoints,
  startingLevel,
  maxLevelHint,
  onComplete,
}: Props) {
  const [level, setLevel] = useState(startingLevel);
  const [status, setStatus] = useState<RoundStatus>("ready");
  const [targetShape, setTargetShape] = useState<Shape>("triangle");
  const [targetColor, setTargetColor] = useState<Color>("red");
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [remainingTime, setRemainingTime] = useState(0);
  const [hits, setHits] = useState(0);
  const [errors, setErrors] = useState(0);
  const [targetsRemaining, setTargetsRemaining] = useState(0);
  const [feedback, setFeedback] = useState<"success" | "error" | null>(null);
  const [lastMetrics, setLastMetrics] = useState<RoundMetrics | null>(null);

  const reactionTimesRef = useRef<number[]>([]);
  const lastHitAtRef = useRef<number>(0);

  const config = useMemo(() => getLevelConfig(level), [level]);

  const gridColumns = `repeat(${config.gridSize}, minmax(0, 1fr))`;

  const playFeedback = (kind: "success" | "error") => {
    setFeedback(kind);
    window.setTimeout(() => setFeedback(null), 180);
  };

  const finishRound = useCallback(
    (roundStatus: RoundMetrics["status"], timeValue: number) => {
      const averageReactionMs =
        reactionTimesRef.current.length > 0
          ? Math.round(
              reactionTimesRef.current.reduce((sum, value) => sum + value, 0) /
                reactionTimesRef.current.length,
            )
          : 0;

      const metrics: RoundMetrics = {
        level,
        timeRemaining: Math.max(0, Math.round(timeValue)),
        hits,
        errors,
        averageReactionMs,
        status: roundStatus,
      };

      setLastMetrics(metrics);
      setStatus(roundStatus);
    },
    [errors, hits, level],
  );

  useEffect(() => {
    if (status !== "playing") {
      return;
    }

    const timer = window.setInterval(() => {
      setRemainingTime((value) => {
        const next = Number((value - 0.1).toFixed(1));
        if (next <= 0) {
          window.clearInterval(timer);
          finishRound("lost", 0);
          return 0;
        }
        return next;
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [status, finishRound]);

  const generateTiles = (shape: Shape, color: Color): { tiles: Tile[]; targetCount: number } => {
    const total = config.gridSize * config.gridSize;
    const targetCount =
      Math.floor(Math.random() * (config.targetMax - config.targetMin + 1)) +
      config.targetMin;

    const targetTiles: Tile[] = Array.from({ length: targetCount }, (_, index) => ({
      id: `target-${index}`,
      shape,
      color,
      isTarget: true,
      found: false,
    }));

    const nonTargetCount = total - targetCount;
    const distractors: Tile[] = [];

    const otherShapes = SHAPES.filter((item) => item !== shape);
    const otherColors = COLORS.filter((item) => item !== color);

    for (let index = 0; index < nonTargetCount; index += 1) {
      let tileShape = randomItem(SHAPES);
      let tileColor = randomItem(COLORS);

      if (config.mode === "feature") {
        const popByColor = Math.random() > 0.5;
        tileShape = popByColor ? randomItem(SHAPES) : randomItem(otherShapes);
        tileColor = popByColor ? randomItem(otherColors) : randomItem(COLORS);
      } else if (config.mode === "mixed") {
        const variant = index % 3;
        if (variant === 0) {
          tileShape = shape;
          tileColor = randomItem(otherColors);
        } else if (variant === 1) {
          tileShape = randomItem(otherShapes);
          tileColor = color;
        } else {
          tileShape = randomItem(otherShapes);
          tileColor = randomItem(otherColors);
        }
      } else {
        const variant = index % 4;
        if (variant <= 1) {
          tileShape = shape;
          tileColor = randomItem(otherColors);
        } else if (variant === 2) {
          tileShape = randomItem(otherShapes);
          tileColor = color;
        } else {
          tileShape = randomItem(otherShapes);
          tileColor = randomItem(otherColors);
        }
      }

      distractors.push({
        id: `distractor-${index}`,
        shape: tileShape,
        color: tileColor,
        isTarget: false,
        found: false,
      });
    }

    return { tiles: shuffle([...targetTiles, ...distractors]), targetCount };
  };

  const startRound = () => {
    const nextShape = randomItem(SHAPES);
    const nextColor = randomItem(COLORS);
    const generated = generateTiles(nextShape, nextColor);

    setTargetShape(nextShape);
    setTargetColor(nextColor);
    setTiles(generated.tiles);
    setTargetsRemaining(generated.targetCount);
    setRemainingTime(config.timeSeconds);
    setHits(0);
    setErrors(0);
    reactionTimesRef.current = [];
    lastHitAtRef.current = 0;
    setLastMetrics(null);
    setStatus("playing");
  };

  const handleTileClick = (tile: Tile, index: number, eventTime: number) => {
    if (status !== "playing" || tile.found) {
      return;
    }

    if (tile.isTarget) {
      if (lastHitAtRef.current > 0) {
        reactionTimesRef.current.push(eventTime - lastHitAtRef.current);
      }
      lastHitAtRef.current = eventTime;

      playFeedback("success");

      setTiles((current) =>
        current.map((entry, position) =>
          position === index ? { ...entry, found: true } : entry,
        ),
      );
      setHits((value) => value + 1);
      setTargetsRemaining((value) => {
        const next = value - 1;
        if (next <= 0) {
          finishRound("won", remainingTime);
          return 0;
        }
        return next;
      });
      return;
    }

    playFeedback("error");
    setErrors((value) => value + 1);
    setRemainingTime((value) => Math.max(0, value - config.errorPenaltySeconds));
  };

  const completeExercise = () => {
    const success = (lastMetrics?.status ?? "lost") === "won";
    const pointsEarned = success ? basePoints : Math.round(basePoints * 0.35);
    onComplete({ success, pointsEarned });
  };

  const applyDifficultyAdjustment = () => {
    if (!lastMetrics) {
      return;
    }

    const totalClicks = lastMetrics.hits + lastMetrics.errors;
    const accuracy = totalClicks > 0 ? lastMetrics.hits / totalClicks : 0;
    const timeRatio =
      config.timeSeconds > 0 ? lastMetrics.timeRemaining / config.timeSeconds : 0;

    const suggestion = getSuggestion({
      status: lastMetrics.status,
      accuracy,
      timeRatio,
    });

    const adjusted = Math.max(
      1,
      Math.min(maxLevelHint, level + suggestion.nextLevelDelta),
    );
    setLevel(adjusted);
    setStatus("ready");
  };

  const summary = useMemo(() => {
    if (!lastMetrics) {
      return null;
    }

    const totalClicks = lastMetrics.hits + lastMetrics.errors;
    const accuracy = totalClicks > 0 ? lastMetrics.hits / totalClicks : 0;
    const timeRatio =
      config.timeSeconds > 0 ? lastMetrics.timeRemaining / config.timeSeconds : 0;

    const suggestion = getSuggestion({
      status: lastMetrics.status,
      accuracy,
      timeRatio,
    });

    return {
      accuracyPercent: Math.round(accuracy * 100),
      suggestion,
    };
  }, [lastMetrics, config.timeSeconds]);

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-lg border border-black/10 bg-zinc-50 p-4">
        <p className="text-sm text-zinc-500">Nível atual: {level}</p>
        <p className="mt-1 font-medium text-zinc-900">
          Encontre todos os {shapeLabel[targetShape]} {colorLabel[targetColor]}
        </p>
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-4">
        <div className="rounded-lg border border-black/10 p-3">
          <p className="text-zinc-500">Tempo</p>
          <p className="font-semibold text-zinc-900">{remainingTime.toFixed(1)}s</p>
        </div>
        <div className="rounded-lg border border-black/10 p-3">
          <p className="text-zinc-500">Alvos restantes</p>
          <p className="font-semibold text-zinc-900">{targetsRemaining}</p>
        </div>
        <div className="rounded-lg border border-black/10 p-3">
          <p className="text-zinc-500">Acertos</p>
          <p className="font-semibold text-zinc-900">{hits}</p>
        </div>
        <div className="rounded-lg border border-black/10 p-3">
          <p className="text-zinc-500">Erros</p>
          <p className="font-semibold text-zinc-900">{errors}</p>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
        <div
          className="h-full bg-zinc-900 transition-all"
          style={{ width: `${Math.max(0, (remainingTime / config.timeSeconds) * 100)}%` }}
        />
      </div>

      {status === "ready" && (
        <div className="rounded-lg border border-dashed border-black/20 p-4 text-sm text-zinc-600">
          <p>
            Rodada pronta. Nas fases iniciais o alvo tende a saltar visualmente; em
            níveis avançados, distratores compartilham cor ou forma com o alvo.
          </p>
        </div>
      )}

      <div
        className={`grid gap-2 rounded-xl border p-2 ${
          feedback === "success"
            ? "border-emerald-300"
            : feedback === "error"
              ? "border-rose-300"
              : "border-black/10"
        }`}
        style={{ gridTemplateColumns: gridColumns }}
      >
        {tiles.map((tile, index) => (
          <button
            key={tile.id}
            type="button"
            onClick={(event) => handleTileClick(tile, index, event.timeStamp)}
            disabled={status !== "playing" || tile.found}
            className="flex aspect-square items-center justify-center rounded-md border border-black/10 bg-white"
          >
            <span
              className={`block h-[65%] w-[65%] ${getShapeClass(tile.shape)} ${
                tile.found ? "bg-zinc-300" : colorClass[tile.color]
              }`}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>

      {status === "ready" && (
        <button
          type="button"
          onClick={startRound}
          className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
        >
          Iniciar rodada
        </button>
      )}

      {(status === "won" || status === "lost") && lastMetrics && summary && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-zinc-50 p-4">
          <p className="font-semibold text-zinc-900">
            {status === "won" ? "Vitória" : "Tempo esgotado"}
          </p>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p>Tempo restante: {lastMetrics.timeRemaining}s</p>
            <p>Alvos encontrados: {lastMetrics.hits}</p>
            <p>Cliques errados: {lastMetrics.errors}</p>
            <p>
              Tempo médio de reação: {lastMetrics.averageReactionMs > 0 ? `${lastMetrics.averageReactionMs}ms` : "-"}
            </p>
            <p>Acurácia: {summary.accuracyPercent}%</p>
          </div>
          <p className="text-sm text-zinc-700">{summary.suggestion.text}</p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={applyDifficultyAdjustment}
              className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
            >
              Próxima rodada
            </button>
            <button
              type="button"
              onClick={completeExercise}
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
