"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReportContext } from "@/components/AttentionTrainingGame";
import { COLOR_HEX, COLOR_LABEL, LEVELS } from "./levels";
import {
  average,
  buildSessionSummary,
  getNextTargetColor,
  hitTestShape,
  saveSessionLog,
  shouldSpawnShape,
  updateShapes,
} from "./logic";
import { ColorId, FallingShape, LevelSummary } from "./types";

type Props = {
  basePoints: number;
  startingLevel: number;
  maxLevelHint: number;
  reportContext?: ReportContext;
  onComplete: (result: { success: boolean; pointsEarned: number }) => void;
};

type Phase = "intro" | "running" | "level-summary" | "session-summary";

type Feedback = "none" | "correct" | "wrong";

function randomItem<T>(items: T[], rng: () => number = Math.random): T {
  return items[Math.floor(rng() * items.length)];
}

function playTone(type: "correct" | "wrong") {
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (type === "correct") {
      oscillator.frequency.value = 880;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.12);
    } else {
      oscillator.frequency.value = 200;
      oscillator.type = "sawtooth";
      gainNode.gain.setValueAtTime(0.18, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.18);
    }
  } catch {
    // Sem audio
  }
}

function speakColor(colorId: ColorId) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(`${COLOR_LABEL[colorId]}!`);
  utterance.lang = "pt-BR";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export function FiltroCoresComSomGame({
  basePoints,
  startingLevel,
  maxLevelHint,
  reportContext,
  onComplete,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const shapesRef = useRef<FallingShape[]>([]);
  const levelStartRef = useRef<number | null>(null);

  const levels = useMemo(() => LEVELS, []);
  const firstLevelIndex = Math.max(0, levels.findIndex((level) => level.id >= startingLevel));
  const lastAllowedLevelId = Math.max(startingLevel, maxLevelHint);

  const [levelIndex, setLevelIndex] = useState(firstLevelIndex);
  const [phase, setPhase] = useState<Phase>("intro");
  const [currentTargetColor, setCurrentTargetColor] = useState<ColorId>(
    levels[firstLevelIndex]?.initialTargetColor ?? "green",
  );
  const [flashTarget, setFlashTarget] = useState(false);
  const [timeRemainingMs, setTimeRemainingMs] = useState(levels[firstLevelIndex]?.durationMs ?? 0);
  const [hits, setHits] = useState(0);
  const [errors, setErrors] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>("none");
  const [shapes, setShapes] = useState<FallingShape[]>([]);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [levelSummaries, setLevelSummaries] = useState<LevelSummary[]>([]);

  const level = levels[levelIndex];
  const canAdvance = levelIndex < levels.length - 1 && levels[levelIndex + 1].id <= lastAllowedLevelId;

  const summary = useMemo(() => buildSessionSummary(levelSummaries), [levelSummaries]);

  const syncShapes = useCallback((next: FallingShape[]) => {
    shapesRef.current = next;
    setShapes(next);
  }, []);

  const createShape = useCallback((): FallingShape | null => {
    const container = containerRef.current;
    if (!container) return null;

    const rect = container.getBoundingClientRect();
    const size = 18 + Math.random() * 14;
    const x = size + Math.random() * (rect.width - size * 2);
    const y = -size;
    const colorId = randomItem(level.availableColors);
    const kind = Math.random() > 0.5 ? "circle" : "square";
    const now = performance.now();

    return {
      id: `shape-${now}-${Math.round(Math.random() * 1000)}`,
      x,
      y,
      size,
      colorId,
      kind,
      isCaptured: false,
      spawnedAt: now,
    };
  }, [level.availableColors]);

  const resetLevelState = useCallback(() => {
    syncShapes([]);
    setHits(0);
    setErrors(0);
    setReactionTimes([]);
    setFeedback("none");
    setTimeRemainingMs(level.durationMs);
    const initialColor = level.availableColors.includes(level.initialTargetColor)
      ? level.initialTargetColor
      : level.availableColors[0];
    setCurrentTargetColor(initialColor);
  }, [level, syncShapes]);

  const startLevel = useCallback(() => {
    resetLevelState();
    setPhase("running");
    levelStartRef.current = performance.now();
    speakColor(level.initialTargetColor);
  }, [level.initialTargetColor, resetLevelState]);

  useEffect(() => {
    if (phase !== "running") return;

    const spawnTimer = window.setInterval(() => {
      if (!shouldSpawnShape(shapesRef.current, level.maxSimultaneousShapes)) return;
      const shape = createShape();
      if (!shape) return;
      syncShapes([...shapesRef.current, shape]);
    }, level.spawnIntervalMs);

    const colorTimer = window.setInterval(() => {
      setCurrentTargetColor((current) => {
        const next = getNextTargetColor(level.availableColors, current);
        if (next !== current) {
          speakColor(next);
          setFlashTarget(true);
          window.setTimeout(() => setFlashTarget(false), 300);
        }
        return next;
      });
    }, level.colorChangeIntervalMs);

    const timeTimer = window.setInterval(() => {
      if (!levelStartRef.current) return;
      const elapsed = performance.now() - levelStartRef.current;
      const remaining = Math.max(0, level.durationMs - elapsed);
      setTimeRemainingMs(remaining);
      if (remaining <= 0) {
        setPhase("level-summary");
      }
    }, 200);

    return () => {
      window.clearInterval(spawnTimer);
      window.clearInterval(colorTimer);
      window.clearInterval(timeTimer);
    };
  }, [
    phase,
    level.availableColors,
    level.colorChangeIntervalMs,
    level.durationMs,
    level.maxSimultaneousShapes,
    level.spawnIntervalMs,
    createShape,
    syncShapes,
  ]);

  useEffect(() => {
    if (phase !== "running") return;

    function step(timestamp: number) {
      const last = lastFrameRef.current ?? timestamp;
      const deltaSeconds = Math.min(0.05, (timestamp - last) / 1000);
      lastFrameRef.current = timestamp;

      const container = containerRef.current;
      const height = container?.getBoundingClientRect().height ?? 0;
      const nextShapes = updateShapes(
        shapesRef.current,
        deltaSeconds,
        level.fallSpeed,
        height,
        timestamp,
      );
      syncShapes(nextShapes);

      animationRef.current = window.requestAnimationFrame(step);
    }

    animationRef.current = window.requestAnimationFrame(step);

    return () => {
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
      }
      lastFrameRef.current = null;
    };
  }, [phase, level.fallSpeed, syncShapes]);

  useEffect(() => {
    if (phase !== "level-summary") return;

    const levelSummary: LevelSummary = {
      levelId: level.id,
      levelName: level.name,
      durationMs: level.durationMs,
      hits,
      errors,
      averageReactionMs: average(reactionTimes),
    };

    setLevelSummaries((prev) => [...prev, levelSummary]);
  }, [phase, errors, hits, level, reactionTimes]);

  useEffect(() => {
    if (phase === "level-summary" || phase === "session-summary") {
      syncShapes([]);
    }
  }, [phase, syncShapes]);

  const handlePointer = useCallback(
    (clientX: number, clientY: number) => {
      if (phase !== "running") return;
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const point = { x: clientX - rect.left, y: clientY - rect.top };
      const target = hitTestShape(shapesRef.current, point);
      const now = performance.now();

      if (!target) {
        setErrors((value) => value + 1);
        setFeedback("wrong");
        playTone("wrong");
        return;
      }

      if (target.colorId === currentTargetColor) {
        const reactionMs = Math.max(0, Math.round(now - target.spawnedAt));
        setReactionTimes((prev) => [...prev, reactionMs]);
        setHits((value) => value + 1);
        setFeedback("correct");
        playTone("correct");
      } else {
        setErrors((value) => value + 1);
        setFeedback("wrong");
        playTone("wrong");
      }

      const nextShapes = shapesRef.current.map((shape) =>
        shape.id === target.id
          ? { ...shape, isCaptured: true, capturedAt: now }
          : shape,
      );
      syncShapes(nextShapes);
    },
    [currentTargetColor, phase, syncShapes],
  );

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      handlePointer(event.clientX, event.clientY);
    },
    [handlePointer],
  );

  const handleTouch = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      const touch = event.touches[0];
      if (!touch) return;
      handlePointer(touch.clientX, touch.clientY);
    },
    [handlePointer],
  );

  function continueAfterLevel() {
    if (canAdvance) {
      setLevelIndex((value) => value + 1);
      setPhase("intro");
      return;
    }
    saveSessionLog(levelSummaries, reportContext);
    setPhase("session-summary");
  }

  function finishSession() {
    const pointsEarned = Math.round(basePoints * summary.accuracy);
    const success = summary.accuracy >= 0.7;
    onComplete({ success, pointsEarned });
  }

  useEffect(() => {
    if (phase !== "intro") return;
    resetLevelState();
  }, [phase, resetLevelState]);

  return (
    <div className="space-y-5">
      {phase === "intro" && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-6">
          <div>
            <p className="text-sm text-zinc-500">Nivel atual</p>
            <h3 className="text-xl font-semibold text-zinc-900">{level.name}</h3>
            <p className="mt-2 text-sm text-zinc-700">
              Clique somente nas formas da cor anunciada. O alvo muda ao longo do tempo.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm">
            <div>
              <p className="text-xs text-zinc-500">ALVO ATUAL</p>
              <p className="text-base font-semibold" style={{ color: COLOR_HEX[currentTargetColor] }}>
                {COLOR_LABEL[currentTargetColor].toUpperCase()}
              </p>
            </div>
            <div
              className="h-6 w-6 rounded-full border border-zinc-300"
              style={{ backgroundColor: COLOR_HEX[currentTargetColor] }}
            />
          </div>

          <button
            type="button"
            onClick={startLevel}
            className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-base font-medium text-white hover:bg-zinc-700"
          >
            Iniciar nivel
          </button>
        </div>
      )}

      {phase === "running" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className={`rounded-lg border px-3 py-2 text-sm font-semibold ${flashTarget ? "border-emerald-400 bg-emerald-50" : "border-zinc-200 bg-white"}`}>
              Alvo: <span style={{ color: COLOR_HEX[currentTargetColor] }}>{COLOR_LABEL[currentTargetColor]}</span>
            </div>
          </div>

          <div
            ref={containerRef}
            onClick={handleClick}
            onTouchStart={handleTouch}
            className="relative h-[520px] w-full overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-b from-zinc-50 to-white"
          >
            {shapes.map((shape) => (
              <div
                key={shape.id}
                className={`absolute transition-opacity ${shape.isCaptured ? "opacity-20" : "opacity-100"}`}
                style={{
                  left: shape.x - shape.size,
                  top: shape.y - shape.size,
                  width: shape.size * 2,
                  height: shape.size * 2,
                  borderRadius: shape.kind === "circle" ? "9999px" : "12px",
                  backgroundColor: COLOR_HEX[shape.colorId],
                  boxShadow: "0 8px 18px rgba(0,0,0,0.08)",
                }}
              />
            ))}
          </div>

          {feedback !== "none" && (
            <p className={`text-sm ${feedback === "correct" ? "text-emerald-600" : "text-rose-600"}`}>
              {feedback === "correct" ? "Boa!" : "Essa nao era a cor alvo."}
            </p>
          )}
        </div>
      )}

      {phase === "level-summary" && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-6">
          <h3 className="text-xl font-semibold text-zinc-900">Resumo do nivel</h3>
          <div className="space-y-2 text-zinc-700">
            <p>Acertos: <strong>{hits}</strong></p>
            <p>Erros: <strong>{errors}</strong></p>
            <p>
              Precisao: <strong>{Math.round((hits + errors > 0 ? hits / (hits + errors) : 0) * 100)}%</strong>
            </p>
            {reactionTimes.length > 0 && (
              <p>Tempo medio: <strong>{average(reactionTimes)}ms</strong></p>
            )}
          </div>
          <button
            type="button"
            onClick={continueAfterLevel}
            className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-base font-medium text-white hover:bg-zinc-700"
          >
            {canAdvance ? "Proximo nivel" : "Ver resumo final"}
          </button>
        </div>
      )}

      {phase === "session-summary" && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-6">
          <h3 className="text-xl font-semibold text-zinc-900">Sessao concluida</h3>
          <div className="space-y-2 text-zinc-700">
            <p>Acertos: <strong>{summary.totalHits}</strong></p>
            <p>Erros: <strong>{summary.totalErrors}</strong></p>
            <p>Precisao geral: <strong>{Math.round(summary.accuracy * 100)}%</strong></p>
            {summary.averageReactionMs && (
              <p>Tempo medio: <strong>{summary.averageReactionMs}ms</strong></p>
            )}
          </div>
          <button
            type="button"
            onClick={finishSession}
            className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-base font-medium text-white hover:bg-emerald-700"
          >
            Concluir exercicio
          </button>
        </div>
      )}
    </div>
  );
}
