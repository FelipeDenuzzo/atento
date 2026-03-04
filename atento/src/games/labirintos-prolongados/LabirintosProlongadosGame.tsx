"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReportContext } from "@/components/AttentionTrainingGame";
import { defaultLongMazesLevels } from "./levels";
import {
  buildResult,
  buildSessionLog,
  generateMaze,
  hasReachedEnd,
  isTimeExpired,
  movePlayer,
  registerVisit,
  saveSessionLog,
} from "./logic";
import { MazeData, MazeDirection, MazeSessionResult } from "./types";

type Props = {
  basePoints: number;
  startingLevel: number;
  maxLevelHint: number;
  reportContext?: ReportContext;
  onComplete: (result: { success: boolean; pointsEarned: number }) => void;
};

type Phase = "intro" | "playing" | "result";

function formatSec(value: number): string {
  const m = Math.floor(value / 60);
  const s = value % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getDirectionFromKey(key: string): MazeDirection | null {
  if (key === "ArrowUp" || key.toLowerCase() === "w") return "up";
  if (key === "ArrowDown" || key.toLowerCase() === "s") return "down";
  if (key === "ArrowLeft" || key.toLowerCase() === "a") return "left";
  if (key === "ArrowRight" || key.toLowerCase() === "d") return "right";
  return null;
}

export function LabirintosProlongadosGame({
  basePoints,
  startingLevel,
  maxLevelHint,
  reportContext,
  onComplete,
}: Props) {
  const levels = useMemo(() => defaultLongMazesLevels(), []);
  const firstLevelIndex = Math.max(0, levels.findIndex((entry) => entry.id >= startingLevel));
  const lastAllowedLevelId = Math.max(startingLevel, maxLevelHint);

  const [levelIndex, setLevelIndex] = useState(firstLevelIndex);
  const [phase, setPhase] = useState<Phase>("intro");
  const [mazeData, setMazeData] = useState<MazeData | null>(null);
  const [player, setPlayer] = useState<{ x: number; y: number }>({ x: 1, y: 1 });
  const [steps, setSteps] = useState(0);
  const [revisits, setRevisits] = useState(0);
  const [paused, setPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [levelResult, setLevelResult] = useState<MazeSessionResult | null>(null);
  const [history, setHistory] = useState<MazeSessionResult[]>([]);

  const visitedRef = useRef<Set<string>>(new Set());
  const startedAtRef = useRef<number | null>(null);
  const elapsedBeforePauseRef = useRef(0);

  const level = levels[levelIndex];
  const canAdvanceLevel =
    levelIndex < levels.length - 1 && levels[levelIndex + 1].id <= lastAllowedLevelId;

  const remainingSec = Math.max(0, level.timeLimitSec - Math.floor(elapsedMs / 1000));

  const finalizeLevel = useCallback(
    (success: boolean, endElapsedMs: number) => {
      if (!mazeData) return;

      const result = buildResult({
        success,
        level,
        elapsedMs: endElapsedMs,
        steps,
        revisits,
        shortestPathLength: mazeData.shortestPathLength,
      });

      setLevelResult(result);
      setHistory((prev) => [...prev, result]);
      saveSessionLog(buildSessionLog(result, reportContext));
      setPhase("result");
    },
    [level, mazeData, reportContext, revisits, steps],
  );

  const startLevel = () => {
    const generated = generateMaze(level);
    setMazeData(generated);
    setPlayer(generated.start);
    setSteps(0);
    setRevisits(0);
    setPaused(false);
    setElapsedMs(0);
    setLevelResult(null);
    visitedRef.current = new Set();
    registerVisit(visitedRef.current, generated.start);
    startedAtRef.current = performance.now();
    elapsedBeforePauseRef.current = 0;
    setPhase("playing");
  };

  const restartLevel = () => {
    startLevel();
  };

  useEffect(() => {
    if (phase !== "playing" || paused || !startedAtRef.current) return;

    const timer = setInterval(() => {
      if (!startedAtRef.current) return;
      const now = performance.now();
      const newElapsed = elapsedBeforePauseRef.current + (now - startedAtRef.current);
      setElapsedMs(newElapsed);

      if (isTimeExpired(newElapsed, level.timeLimitSec)) {
        clearInterval(timer);
        finalizeLevel(false, newElapsed);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [phase, paused, level.timeLimitSec, finalizeLevel]);

  useEffect(() => {
    if (phase !== "playing") return;

    const handler = (event: KeyboardEvent) => {
      if (paused || !mazeData) return;

      const direction = getDirectionFromKey(event.key);
      if (!direction) return;
      event.preventDefault();

      const moved = movePlayer(mazeData.grid, player, direction);
      if (moved.blocked) return;

      setPlayer(moved.position);
      setSteps((value) => value + 1);
      if (registerVisit(visitedRef.current, moved.position)) {
        setRevisits((value) => value + 1);
      }

      if (hasReachedEnd(moved.position, mazeData.end)) {
        const now = performance.now();
        const finalElapsed = startedAtRef.current
          ? elapsedBeforePauseRef.current + (now - startedAtRef.current)
          : elapsedMs;
        finalizeLevel(true, finalElapsed);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, paused, mazeData, player, elapsedMs, finalizeLevel]);

  const togglePause = () => {
    if (phase !== "playing") return;
    if (!paused) {
      if (startedAtRef.current) {
        elapsedBeforePauseRef.current += performance.now() - startedAtRef.current;
      }
      startedAtRef.current = null;
      setPaused(true);
      return;
    }

    startedAtRef.current = performance.now();
    setPaused(false);
  };

  const finishSession = () => {
    const all = history.length > 0 ? history : levelResult ? [levelResult] : [];
    const successCount = all.filter((item) => item.success).length;
    const successRate = all.length > 0 ? successCount / all.length : 0;
    const avgEfficiency =
      all.length > 0
        ? all
            .map((item) => item.efficiency)
            .filter((item): item is number => item != null)
            .reduce((sum, item) => sum + item, 0) /
          Math.max(
            1,
            all.map((item) => item.efficiency).filter((item) => item != null).length,
          )
        : null;

    const success = successRate >= 0.5;
    const efficiencyFactor = avgEfficiency ? Math.max(0.2, 1.5 - avgEfficiency) : 1;
    const pointsEarned = Math.max(0, Math.round(basePoints * successRate * efficiencyFactor));

    onComplete({ success, pointsEarned });
  };

  const goNext = () => {
    if (canAdvanceLevel) {
      setLevelIndex((value) => value + 1);
      setPhase("intro");
      return;
    }
    finishSession();
  };

  return (
    <div className="space-y-6">
      {phase === "intro" && (
        <div className="space-y-4">
          <div className="rounded-lg border-2 border-blue-300 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-900">{level.name}</p>
            <p className="mt-1 text-sm text-blue-800">
              Vá do ponto A ao B mantendo foco contínuo no percurso.
            </p>
          </div>

          <div className="rounded-lg border border-black/10 bg-zinc-50 p-4 text-sm text-zinc-700">
            <p>Use setas ou WASD para mover célula a célula.</p>
            <p>Evite becos sem saída e não perca a rota.</p>
            <p>Você pode pausar e reiniciar quando precisar.</p>
          </div>

          <button
            type="button"
            onClick={startLevel}
            className="w-full rounded-lg bg-zinc-900 px-4 py-3 font-semibold text-white hover:bg-zinc-700"
          >
            Começar labirinto
          </button>
        </div>
      )}

      {phase === "playing" && mazeData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-black/10 bg-zinc-50 p-3 text-sm text-zinc-700">
            <p className="font-semibold">Tempo: {formatSec(remainingSec)}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={togglePause}
                className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
              >
                {paused ? "Retomar" : "Pausar"}
              </button>
              <button
                type="button"
                onClick={restartLevel}
                className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
              >
                Reiniciar
              </button>
            </div>
          </div>

          <div className="overflow-auto rounded-lg border-2 border-zinc-300 bg-white p-2">
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${mazeData.grid[0].length}, 18px)`,
                gap: "1px",
                width: "max-content",
              }}
            >
              {mazeData.grid.map((row, y) =>
                row.map((cell, x) => {
                  const isStart = x === mazeData.start.x && y === mazeData.start.y;
                  const isEnd = x === mazeData.end.x && y === mazeData.end.y;
                  const isPlayer = x === player.x && y === player.y;

                  const base =
                    cell === 1
                      ? "bg-zinc-900"
                      : isStart
                        ? "bg-emerald-400"
                        : isEnd
                          ? "bg-rose-400"
                          : "bg-zinc-100";

                  return (
                    <div
                      key={`${x}-${y}`}
                      className={`relative h-[18px] w-[18px] ${base}`}
                      title={isStart ? "Início" : isEnd ? "Fim" : undefined}
                    >
                      {isPlayer && (
                        <span className="absolute inset-0 m-auto h-3 w-3 rounded-full bg-blue-600" />
                      )}
                    </div>
                  );
                }),
              )}
            </div>
          </div>
        </div>
      )}

      {phase === "result" && levelResult && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-zinc-900">
            {levelResult.success ? "Labirinto concluído!" : "Tempo esgotado"}
          </h3>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-4">
              <p className="text-xs text-zinc-500">Tempo</p>
              <p className="text-2xl font-bold text-zinc-900">
                {Math.max(1, Math.round(levelResult.elapsedMs / 1000))}s
              </p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-4">
              <p className="text-xs text-zinc-500">Passos</p>
              <p className="text-2xl font-bold text-zinc-900">{levelResult.steps}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-4">
              <p className="text-xs text-zinc-500">Revisitas</p>
              <p className="text-2xl font-bold text-zinc-900">{levelResult.revisits}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-4">
              <p className="text-xs text-zinc-500">Eficiência</p>
              <p className="text-2xl font-bold text-zinc-900">
                {levelResult.efficiency ? levelResult.efficiency.toFixed(2) : "-"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={goNext}
            className="w-full rounded-lg bg-zinc-900 px-4 py-3 font-semibold text-white hover:bg-zinc-700"
          >
            {canAdvanceLevel ? "Próximo nível" : "Concluir"}
          </button>
        </div>
      )}
    </div>
  );
}
