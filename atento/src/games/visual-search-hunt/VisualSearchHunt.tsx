
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReportContext } from "@/components/AttentionTrainingGame";
import { buildTxtReportFileName } from "../../utils/reportFileName";

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

type Props = {
  basePoints: number;
  startingLevel: number;
  maxLevelHint: number;
  reportContext?: ReportContext;
  onComplete: (result: { success: boolean; pointsEarned: number }) => void;
  hideInGameInfo?: boolean;
};

const SHAPES: Shape[] = ["circulo", "quadrado", "triangulo"];
const COLORS: Color[] = ["azul", "vermelho", "verde", "amarelo"];

const shapeLabel: Record<Shape, string> = {
  circulo: "círculo",
  quadrado: "quadrado",
  triangulo: "triângulo",
};

const colorLabel: Record<Color, string> = {
  azul: "azul",
  vermelho: "vermelho",
  verde: "verde",
  amarelo: "amarelo",
};


// Caminho do asset: /images/visual-search/${forma}_${cor}.png
function getAssetPath(shape: Shape, color: Color): string {
  // Corrige referência para quadrado_verde.png (não quadrado1_verde.png)
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


// ...



import React from "react";
import { useIsMobileViewport } from "@/hooks/mobile/useIsMobileViewport";
import { CacaAoAlvoMobileGame } from "./mobile/CacaAoAlvoMobileGame";

export const VisualSearchHunt: React.FC<Props> = (props) => {
  const isMobile = useIsMobileViewport(768);
  if (isMobile) {
    // Adaptação: repassa apenas as props padrão mobile
    return (
      <CacaAoAlvoMobileGame
        onCorrectSound={undefined}
        onErrorSound={undefined}
        onEnd={props.onComplete}
        basePoints={props.basePoints}
        startingLevel={props.startingLevel}
        maxLevelHint={props.maxLevelHint}
      />
    );
  }
  // --- INÍCIO DO COMPONENTE COPIADO ---
  // ...
  const [level, setLevel] = React.useState(props.startingLevel);
  const [status, setStatus] = React.useState<RoundStatus>("preview");
  const [targetShape, setTargetShape] = React.useState<Shape>("triangulo");
  const [targetColor, setTargetColor] = React.useState<Color>("vermelho");
  const [tiles, setTiles] = React.useState<Tile[]>([]);
  const [remainingTime, setRemainingTime] = React.useState(0);
  const [hits, setHits] = React.useState(0);
  const [errors, setErrors] = React.useState(0);
  const [targetsRemaining, setTargetsRemaining] = React.useState(0);
  const [feedback, setFeedback] = React.useState<"success" | "error" | null>(null);
  const [lastMetrics, setLastMetrics] = React.useState<RoundMetrics | null>(null);
  const [allLevelMetrics, setAllLevelMetrics] = React.useState<RoundMetrics[]>([]);

  const reactionTimesRef = React.useRef<number[]>([]);
  const lastHitAtRef = React.useRef<number>(0);

  const config = React.useMemo(() => getLevelConfig(level), [level]);
  const gridColumns = `repeat(${config.gridSize}, minmax(0, 1fr))`;

  const playFeedback = (kind: "success" | "error") => {
    setFeedback(kind);
    window.setTimeout(() => setFeedback(null), 180);
  };

  const finishRound = React.useCallback(
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

  React.useEffect(() => {
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
    const allMetrics = lastMetrics ? [...allLevelMetrics, lastMetrics] : allLevelMetrics;
    const wonLevels = allMetrics.filter(m => m.status === "won").length;
    const success = wonLevels >= props.maxLevelHint * 0.6;
    const pointsEarned = success ? props.basePoints : Math.round(props.basePoints * 0.35);
    props.onComplete({ success, pointsEarned });
  };

  const downloadResults = () => {
    const allMetrics = lastMetrics ? [...allLevelMetrics, lastMetrics] : allLevelMetrics;
    const lines: string[] = [];
    lines.push("=" + "=".repeat(60));
    lines.push("RESULTADO - CAÇA AO ALVO (Atenção Seletiva)");
    lines.push("=" + "=".repeat(60));
    lines.push("");
    if (props.reportContext) {
      lines.push(
        `Escopo: ${
          props.reportContext.mode === "sequence"
            ? `Trilha completa (${props.reportContext.scopeLabel})`
            : `Jogo individual (${props.reportContext.scopeLabel})`
        }`,
      );
      lines.push("");
    }
    allMetrics.forEach((m, idx) => {
      lines.push(`Fase ${idx + 1} (Nível ${m.level}):`);
      lines.push(`  Status: ${m.status === "won" ? "Completada" : "Tempo esgotado"}`);
      lines.push(`  Acertos: ${m.hits}`);
      lines.push(`  Erros: ${m.errors}`);
      lines.push(`  Tempo restante: ${m.timeRemaining}s`);
      lines.push(`  Tempo médio de reação: ${m.averageReactionMs > 0 ? m.averageReactionMs + "ms" : "-"}`);
      const totalClicks = m.hits + m.errors;
      const accuracy = totalClicks > 0 ? Math.round((m.hits / totalClicks) * 100) : 0;
      lines.push(`  Acurácia: ${accuracy}%`);
      lines.push("");
    });
    const wonCount = allMetrics.filter(m => m.status === "won").length;
    const totalHits = allMetrics.reduce((sum, m) => sum + m.hits, 0);
    const totalErrors = allMetrics.reduce((sum, m) => sum + m.errors, 0);
    const totalAccuracy = totalHits + totalErrors > 0 ? Math.round((totalHits / (totalHits + totalErrors)) * 100) : 0;
    lines.push("=" + "=".repeat(60));
    lines.push("RESUMO TOTAL:");
    lines.push(`Fases completadas: ${wonCount}/${allMetrics.length}`);
    lines.push(`Acertos totais: ${totalHits}`);
    lines.push(`Erros totais: ${totalErrors}`);
    lines.push(`Acurácia geral: ${totalAccuracy}%`);
    lines.push("=" + "=".repeat(60));
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = buildTxtReportFileName({
      mode: props.reportContext?.mode ?? "single",
      attentionTypeLabel: props.reportContext?.attentionTypeLabel,
      participantName: props.reportContext?.participantName,
    });
    a.click();
    URL.revokeObjectURL(url);
  };

  const advanceToNextLevel = () => {
    if (!lastMetrics) return;
    setAllLevelMetrics(prev => [...prev, lastMetrics]);
    if (level >= props.maxLevelHint) {
      setStatus("completed");
      return;
    }
    // Sempre avança para o próximo nível sequencial, sem retrocesso
    setLevel(level + 1);
    generateRound();
    setStatus("preview");
  };

  const summary = React.useMemo(() => {
    if (!lastMetrics) {
      return null;
    }
    const totalClicks = lastMetrics.hits + lastMetrics.errors;
    const accuracy = totalClicks > 0 ? lastMetrics.hits / totalClicks : 0;
    const timeRatio = config.timeSeconds > 0 ? lastMetrics.timeRemaining / config.timeSeconds : 0;
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

  React.useEffect(() => {
    if (status === "preview") {
      generateRound();
    }
  }, [status]);

  // ...existing code...
  // ...
  // Agora, apenas imagens PNG são usadas para exibir as formas.
  return (
    // ...existing code...
  );
};
