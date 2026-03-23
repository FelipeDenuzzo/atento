import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Shape = "circulo" | "quadrado" | "triangulo";
type Color = "azul" | "vermelho" | "verde" | "amarelo";
type SearchMode = "feature" | "mixed" | "conjunction";
type RoundStatus = "preview" | "playing" | "won" | "lost" | "completed";

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

const SHAPES: Shape[] = ["circulo", "quadrado", "triangulo"];
const COLORS: Color[] = ["azul", "vermelho", "verde", "amarelo"];

function getAssetPath(shape: Shape, color: Color): string {
  if (shape === "quadrado" && color === "verde") {
    return "/images/visual-search/quadrado_verde.png";
  }
  return `/images/visual-search/${shape}_${color}.png`;
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

export function CacaAoAlvoMobileGame({
  onCorrectSound,
  onErrorSound,
  onEnd,
  basePoints,
  startingLevel,
  maxLevelHint,
}: Props) {
  // Guard clause para props obrigatórios
  if (basePoints == null || startingLevel == null || maxLevelHint == null || typeof onEnd !== 'function') {
    return null;
  }
  const [level, setLevel] = useState(startingLevel);
  const [status, setStatus] = useState<RoundStatus>("preview");
  const [targetShape, setTargetShape] = useState<Shape>("triangulo");
  const [targetColor, setTargetColor] = useState<Color>("vermelho");
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [remainingTime, setRemainingTime] = useState(0);
  const [hits, setHits] = useState(0);
  const [errors, setErrors] = useState(0);
  const [targetsRemaining, setTargetsRemaining] = useState(0);
  const [feedback, setFeedback] = useState<"success" | "error" | null>(null);
  const [lastMetrics, setLastMetrics] = useState<RoundMetrics | null>(null);
  const [allLevelMetrics, setAllLevelMetrics] = useState<RoundMetrics[]>([]);

  const reactionTimesRef = useRef<number[]>([]);
  const lastHitAtRef = useRef<number>(0);

  const config = useMemo(() => getLevelConfig(level), [level]);
  const gridColumns = useMemo(() => `repeat(${config.gridSize}, minmax(0, 1fr))`, [config.gridSize]);

  useEffect(() => {
    if (status === "preview") {
      generateRound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, level]);

  useEffect(() => {
    if (status !== "playing") return;
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
  }, [status]);

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

  const generateRound = () => {
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
  };

  const startRound = () => {
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
      setFeedback("success");
      if (onCorrectSound) onCorrectSound();
      return;
    }
    setErrors((value) => value + 1);
    setRemainingTime((value) => Math.max(0, value - config.errorPenaltySeconds));
    setFeedback("error");
    if (onErrorSound) onErrorSound();
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

  const completeExercise = () => {
    const allMetrics = lastMetrics ? [...allLevelMetrics, lastMetrics] : allLevelMetrics;
    const wonLevels = allMetrics.filter(m => m.status === "won").length;
    const success = wonLevels >= maxLevelHint * 0.6;
    const pointsEarned = success ? basePoints : Math.round(basePoints * 0.35);
    onEnd({ success, pointsEarned });
  };

  const advanceToNextLevel = () => {
    if (!lastMetrics) return;
    setAllLevelMetrics(prev => [...prev, lastMetrics]);
    if (level >= maxLevelHint) {
      setStatus("completed");
      return;
    }
    setLevel(level + 1);
    generateRound();
    setStatus("preview");
  };

  // UI
  // Proteção: não renderiza se dados essenciais não estão prontos
  if (!targetShape || !targetColor) return null;

  return (
    <div style={{ width: "100vw", minHeight: "100vh", overflow: "hidden", margin: 0, padding: 0, background: "#f8fafc" }}>
      {status === "preview" && (
        <div style={{ padding: 24, textAlign: "center" }}>
          <div style={{ marginBottom: 16 }}>
            <img
              src={getAssetPath(targetShape, targetColor)}
              alt="Alvo"
              style={{ width: 72, height: 72, margin: "0 auto" }}
              draggable={false}
            />
          </div>
          <div style={{ fontSize: 16, color: "#222", marginBottom: 16 }}>
            Encontre todas as figuras iguais ao alvo mostrado (forma e cor).
          </div>
          <button
            type="button"
            onClick={startRound}
            style={{ width: "100%", padding: 16, fontSize: 18, borderRadius: 12, background: "#222", color: "#fff", border: "none" }}
          >
            Começar
          </button>
        </div>
      )}
      {status === "playing" && (
        <div style={{ padding: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 16, color: "#222" }}>Tempo: {remainingTime.toFixed(1)}s</span>
            <span style={{ fontSize: 16, color: "#222" }}>Restantes: {targetsRemaining}</span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: gridColumns,
              gap: 6,
              width: "100vw",
              maxWidth: "100vw",
              margin: "0 auto",
              userSelect: "none",
            }}
          >
            {/* Guard clause para tiles */}
            {!Array.isArray(tiles) || tiles.length === 0 ? null : (
              tiles.map((tile, idx) => {
                if (!tile || !tile.shape || !tile.color) return null;
                return (
                  <button
                    key={tile.id}
                    onClick={() => handleTileClick(tile, idx, typeof window !== 'undefined' ? performance.now() : 0)}
                    disabled={tile.found}
                    style={{
                      width: "100%",
                      aspectRatio: "1/1",
                      minWidth: 72,
                      minHeight: 72,
                      background: tile.found ? "#d1fae5" : "#fff",
                      border: feedback === "error" && !tile.found ? "2px solid #f87171" : "1px solid #ccc",
                      borderRadius: 10,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: tile.found ? "0 0 0 2px #10b981" : undefined,
                      transition: "background 0.2s, border 0.2s",
                      padding: 0,
                    }}
                  >
                    <img
                      src={getAssetPath(tile.shape, tile.color)}
                      alt=""
                      style={{ width: 40, height: 40, opacity: tile.found ? 0.5 : 1 }}
                      draggable={false}
                    />
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
      {(["won", "lost", "completed"] as RoundStatus[]).includes(status) && (
        <div style={{ padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 18, color: "#222", marginBottom: 16 }}>
            {status === "won" && "Parabéns! Você encontrou todas as figuras."}
            {status === "lost" && "Tempo esgotado!"}
            {status === "completed" && "Jogo finalizado!"}
          </div>
          {status !== "completed" && (
            <button
              type="button"
              onClick={advanceToNextLevel}
              style={{ width: "100%", padding: 16, fontSize: 18, borderRadius: 12, background: "#222", color: "#fff", border: "none", marginBottom: 12 }}
            >
              Próxima Fase
            </button>
          )}
          {status === "completed" && (
            <button
              type="button"
              onClick={completeExercise}
              style={{ width: "100%", padding: 16, fontSize: 18, borderRadius: 12, background: "#222", color: "#fff", border: "none" }}
            >
              Finalizar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
