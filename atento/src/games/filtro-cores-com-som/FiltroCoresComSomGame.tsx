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

import { ColorId, FallingShape, LevelSummary, ShapeKind, TargetMode } from "./types";

type Phase = "intro" | "running" | "level-summary" | "session-summary";

type Props = {
  basePoints: number;
  startingLevel: number;
  maxLevelHint: number;
  reportContext?: ReportContext;
  onComplete: (result: { success: boolean; pointsEarned: number }) => void;
};


const SHAPE_IMG: Record<ShapeKind, string> = {
  "círculo": "circulo",
  "quadrado": "quadrado",
  "triângulo": "triangulo",
};

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


function speakTarget(targetMode: TargetMode, value: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const text = targetMode === "color" ? COLOR_LABEL[value as ColorId] : value.charAt(0).toUpperCase() + value.slice(1);
  const utterance = new SpeechSynthesisUtterance(`${text}!`);
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
  const [currentTarget, setCurrentTarget] = useState<string>(levels[firstLevelIndex]?.initialTarget ?? "green");
  const [flashTarget, setFlashTarget] = useState(false);
  const [timeRemainingMs, setTimeRemainingMs] = useState(levels[firstLevelIndex]?.durationMs ?? 0);
  const [hits, setHits] = useState(0);
  const [errors, setErrors] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>("none");
  const [shapes, setShapes] = useState<FallingShape[]>([]);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [levelSummaries, setLevelSummaries] = useState<LevelSummary[]>([]);

  const level = levels[levelIndex];
  const targetMode: TargetMode = level.targetMode;
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
    const shapeKinds = level.availableShapes;
    const kind = shapeKinds[Math.floor(Math.random() * shapeKinds.length)];
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
    setCurrentTarget(level.initialTarget);
  }, [level, syncShapes]);

  const startLevel = useCallback(() => {
    resetLevelState();
    setPhase("running");
    levelStartRef.current = performance.now();
    speakTarget(targetMode, level.initialTarget);
  }, [level.initialTarget, resetLevelState, targetMode]);

  useEffect(() => {
    if (phase !== "running") return;

    const spawnTimer = window.setInterval(() => {
      if (!shouldSpawnShape(shapesRef.current, level.maxSimultaneousShapes)) return;
      const shape = createShape();
      if (!shape) return;
      syncShapes([...shapesRef.current, shape]);
    }, level.spawnIntervalMs);

    const targetTimer = window.setInterval(() => {
      setCurrentTarget((current) => {
        let next;
        if (targetMode === "color") {
          const arr = level.availableColors;
          next = arr[(arr.indexOf(current as ColorId) + 1) % arr.length];
        } else {
          const arr = level.availableShapes;
          next = arr[(arr.indexOf(current as ShapeKind) + 1) % arr.length];
        }
        if (next !== current) {
          speakTarget(targetMode, next);
          setFlashTarget(true);
          window.setTimeout(() => setFlashTarget(false), 300);
        }
        return next;
      });
    }, level.targetChangeIntervalMs);

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
      window.clearInterval(targetTimer);
      window.clearInterval(timeTimer);
    };
  }, [
    phase,
    level.availableColors,
    level.targetChangeIntervalMs,
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

  const handleShapeClick = useCallback(
    (shape: FallingShape) => {
      if (phase !== "running" || shape.isCaptured) return;
      const now = performance.now();
      let isCorrect = false;
      if (targetMode === "color") {
        isCorrect = shape.colorId === currentTarget;
      } else {
        isCorrect = shape.kind === currentTarget;
      }
      if (isCorrect) {
        const reactionMs = Math.max(0, Math.round(now - shape.spawnedAt));
        setReactionTimes((prev) => [...prev, reactionMs]);
        setHits((value) => value + 1);
        setFeedback("correct");
        playTone("correct");
      } else {
        setErrors((value) => value + 1);
        setFeedback("wrong");
        playTone("wrong");
      }
      const nextShapes = shapesRef.current.map((s) =>
        s.id === shape.id ? { ...s, isCaptured: true, capturedAt: now } : s
      );
      syncShapes(nextShapes);
    },
    [currentTarget, phase, syncShapes, targetMode],
  );

  // Clique/touch agora é por item

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
              {targetMode === "color"
                ? "Clique somente nas formas da cor anunciada. O alvo muda ao longo do tempo."
                : "Clique somente nas formas do tipo anunciado. O alvo muda ao longo do tempo."}
            </p>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm">
            <div>
              <p className="text-xs text-zinc-500">ALVO ATUAL</p>
              <p className="text-base font-semibold">
                {targetMode === "color"
                  ? COLOR_LABEL[currentTarget as ColorId].toUpperCase()
                  : currentTarget.charAt(0).toUpperCase() + currentTarget.slice(1)}
              </p>
            </div>
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
              Alvo: {targetMode === "color"
                ? COLOR_LABEL[currentTarget as ColorId]
                : currentTarget.charAt(0).toUpperCase() + currentTarget.slice(1)}
            </div>
          </div>
          <div
            ref={containerRef}
            className="relative h-[520px] w-full overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-b from-zinc-50 to-white"
          >
            {shapes.map((shape) => {
              const imgSrc = `/images/visual-search/${SHAPE_IMG[shape.kind]}_${COLOR_LABEL[shape.colorId].toLowerCase()}.png`;
              return (
                <button
                  key={shape.id}
                  type="button"
                  onClick={() => handleShapeClick(shape)}
                  className={`absolute transition-opacity focus:outline-none ${shape.isCaptured ? "opacity-20" : "opacity-100"}`}
                  style={{
                    left: shape.x - shape.size,
                    top: shape.y - shape.size,
                    width: shape.size * 2,
                    height: shape.size * 2,
                    zIndex: 2,
                  }}
                  tabIndex={0}
                >
                  <img
                    src={imgSrc}
                    alt={`${COLOR_LABEL[shape.colorId]} ${shape.kind}`}
                    style={{ width: "100%", height: "100%", pointerEvents: "none", userSelect: "none" }}
                    draggable={false}
                  />
                </button>
              );
            })}
          </div>
          {feedback !== "none" && (
            <p className={`text-sm ${feedback === "correct" ? "text-emerald-600" : "text-rose-600"}`}>
              {feedback === "correct"
                ? "Boa!"
                : targetMode === "color"
                  ? "Essa nao era a cor alvo."
                  : "Essa nao era a forma alvo."}
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
