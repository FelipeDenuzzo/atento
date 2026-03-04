"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReportContext } from "@/components/AttentionTrainingGame";
import { defaultSymbolMapLevels } from "./levels";
import {
  buildLevelLog,
  buildLevelResult,
  evaluateCellClick,
  generateBoard,
  isRoundCompleted,
  saveLevelLog,
} from "./logic";
import { SymbolMapCell, SymbolMapLevelResult } from "./types";

type Props = {
  basePoints: number;
  startingLevel: number;
  maxLevelHint: number;
  reportContext?: ReportContext;
  onComplete: (result: { success: boolean; pointsEarned: number }) => void;
};

type Phase = "intro" | "running" | "result";

function playTone(kind: "hit" | "miss") {
  try {
    const audio = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.connect(gain);
    gain.connect(audio.destination);

    if (kind === "hit") {
      osc.frequency.value = 920;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.2, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audio.currentTime + 0.08);
      osc.start();
      osc.stop(audio.currentTime + 0.08);
    } else {
      osc.frequency.value = 180;
      osc.type = "sawtooth";
      gain.gain.setValueAtTime(0.16, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audio.currentTime + 0.15);
      osc.start();
      osc.stop(audio.currentTime + 0.15);
    }
  } catch {
    // sem áudio disponível
  }
}

function formatSec(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function MapaDeSimbolosGame({
  basePoints,
  startingLevel,
  maxLevelHint,
  reportContext,
  onComplete,
}: Props) {
  const levels = useMemo(() => defaultSymbolMapLevels(), []);
  const firstLevelIndex = Math.max(0, levels.findIndex((level) => level.id >= startingLevel));
  const lastAllowedLevelId = Math.max(startingLevel, maxLevelHint);

  const [levelIndex, setLevelIndex] = useState(firstLevelIndex);
  const [phase, setPhase] = useState<Phase>("intro");
  const [board, setBoard] = useState<SymbolMapCell[]>([]);
  const [targetsFound, setTargetsFound] = useState(0);
  const [misses, setMisses] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [result, setResult] = useState<SymbolMapLevelResult | null>(null);
  const [history, setHistory] = useState<SymbolMapLevelResult[]>([]);
  const [flashMissId, setFlashMissId] = useState<string | null>(null);

  const startedAtRef = useRef<number | null>(null);

  const level = levels[levelIndex];
  const totalTargets = board.filter((cell) => cell.isTarget).length;
  const remainingTargets = Math.max(0, totalTargets - targetsFound);
  const canAdvanceLevel =
    levelIndex < levels.length - 1 && levels[levelIndex + 1].id <= lastAllowedLevelId;
  const remainingSec = Math.max(0, level.timeLimitSec - Math.floor(elapsedMs / 1000));

  function startLevel() {
    const generated = generateBoard(level);
    setBoard(generated);
    setTargetsFound(0);
    setMisses(0);
    setElapsedMs(0);
    setResult(null);
    setFlashMissId(null);
    startedAtRef.current = performance.now();
    setPhase("running");
  }

  const finishLevel = useCallback((success: boolean, elapsed: number) => {
    const levelResult = buildLevelResult({
      level,
      timeElapsedMs: elapsed,
      board,
      targetsFound,
      misses,
      completed: success,
    });

    setResult(levelResult);
    setHistory((prev) => [...prev, levelResult]);
    saveLevelLog(buildLevelLog(levelResult, reportContext));
    setPhase("result");
  }, [board, level, misses, reportContext, targetsFound]);

  useEffect(() => {
    if (phase !== "running" || !startedAtRef.current) return;

    const timer = window.setInterval(() => {
      if (!startedAtRef.current) return;
      const currentElapsed = performance.now() - startedAtRef.current;
      setElapsedMs(currentElapsed);

      const completion = isRoundCompleted({
        targetsFound,
        totalTargets,
        elapsedMs: currentElapsed,
        timeLimitSec: level.timeLimitSec,
      });

      if (completion.completed) {
        window.clearInterval(timer);
        finishLevel(completion.success, currentElapsed);
      }
    }, 100);

    return () => window.clearInterval(timer);
  }, [finishLevel, phase, level.timeLimitSec, targetsFound, totalTargets]);

  function onCellClick(cell: SymbolMapCell) {
    if (phase !== "running") return;

    const click = evaluateCellClick(board, cell.id);
    setBoard(click.updatedCells);

    if (click.outcome === "hit") {
      setTargetsFound((value) => value + click.foundIncrement);
      playTone("hit");
      return;
    }

    if (click.outcome === "miss") {
      setMisses((value) => value + click.missIncrement);
      setFlashMissId(cell.id);
      playTone("miss");
      window.setTimeout(() => setFlashMissId((id) => (id === cell.id ? null : id)), 180);
    }
  }

  function goNext() {
    if (canAdvanceLevel) {
      setLevelIndex((value) => value + 1);
      setPhase("intro");
      return;
    }

    const all = result ? [...history.slice(0, -1), result] : history;
    const avgAccuracy =
      all.length > 0
        ? all.reduce((sum, item) => sum + item.accuracy, 0) / all.length
        : 0;

    const success = avgAccuracy >= 0.65;
    const pointsEarned = Math.max(0, Math.round(basePoints * avgAccuracy));
    onComplete({ success, pointsEarned });
  }

  return (
    <div className="space-y-5">
      {phase === "intro" && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-6">
          <p className="text-sm text-zinc-500">{level.name}</p>
          <h3 className="text-xl font-semibold text-zinc-900">Mapa de Símbolos</h3>
          <p className="text-sm text-zinc-700">
            Encontre e clique em todas as ocorrências do(s) alvo(s) na grade.
          </p>

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs text-zinc-500">ALVO(S)</p>
            <p className="mt-2 text-3xl font-bold tracking-widest text-zinc-900">
              {level.targetSymbols.join("  ")}
            </p>
            <p className="mt-2 text-sm text-zinc-600">
              Grade {level.rows}x{level.cols} · Tempo {level.timeLimitSec}s
            </p>
          </div>

          <button
            type="button"
            onClick={startLevel}
            className="w-full rounded-lg bg-zinc-900 px-4 py-3 font-semibold text-white hover:bg-zinc-700"
          >
            Começar fase
          </button>
        </div>
      )}

      {phase === "running" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Tempo</p>
              <p className="font-semibold text-zinc-900">{formatSec(remainingSec)}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Alvo(s)</p>
              <p className="font-semibold text-zinc-900">{level.targetSymbols.join(" ")}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Acertos</p>
              <p className="font-semibold text-zinc-900">{targetsFound}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Erros</p>
              <p className="font-semibold text-zinc-900">{misses}</p>
            </div>
          </div>

          <div className="rounded-lg border border-black/10 bg-zinc-50 p-3 text-sm text-zinc-700">
            Faltam <strong>{remainingTargets}</strong> alvos
          </div>

          <div
            className="grid gap-1 rounded-lg border border-zinc-200 bg-white p-2"
            style={{
              gridTemplateColumns: `repeat(${level.cols}, minmax(0, 1fr))`,
            }}
          >
            {board.map((cell) => {
              const isFlashingMiss = flashMissId === cell.id;
              const isFound = cell.isTarget && cell.found;
              return (
                <button
                  key={cell.id}
                  type="button"
                  onClick={() => onCellClick(cell)}
                  className={`aspect-square rounded-md border text-xl transition ${
                    isFound
                      ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                      : isFlashingMiss
                        ? "border-rose-300 bg-rose-100 text-rose-700"
                        : "border-zinc-200 bg-zinc-50 text-zinc-800 hover:bg-zinc-100"
                  }`}
                >
                  {cell.symbol}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {phase === "result" && result && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-6">
          <h3 className="text-xl font-semibold text-zinc-900">
            {result.completed ? "Fase concluída!" : "Tempo esgotado"}
          </h3>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Tempo</p>
              <p className="font-semibold text-zinc-900">{Math.round(result.timeElapsedMs / 1000)}s</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Alvos encontrados</p>
              <p className="font-semibold text-zinc-900">{result.targetsFound}/{result.totalTargets}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Precisão</p>
              <p className="font-semibold text-zinc-900">{Math.round(result.accuracy * 100)}%</p>
            </div>
          </div>

          <div className="rounded-lg border border-black/10 bg-zinc-50 p-3 text-sm text-zinc-700">
            Erros: <strong>{result.misses}</strong> · Faltantes: <strong>{result.totalTargets - result.targetsFound}</strong>
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
