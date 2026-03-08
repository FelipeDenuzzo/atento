"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReportContext } from "@/components/AttentionTrainingGame";
import { buildTxtReportFileName } from "@/utils/reportFileName";
import {
  computeMetrics,
  computeRoundMetrics,
  handleKeyPress,
  spawnSign,
  startRound,
  updateCarPosition,
  updateSigns,
  updateTrack,
} from "./logic";
import type {
  DriveInputState,
  DriveSignsRoundConfig,
  DriveSignsRoundLog,
  DriveSignsRoundRuntime,
  DriveSignsSessionResult,
} from "./types";

type Props = {
  basePoints: number;
  startingLevel: number;
  maxLevelHint: number;
  reportContext?: ReportContext;
  onComplete: (result: { success: boolean; pointsEarned: number }) => void;
};

type Phase = "intro" | "running" | "round-feedback" | "result";

const ROUND_CONFIGS: DriveSignsRoundConfig[] = [
  {
    id: 1,
    name: "Fase 1",
    durationMs: 60000,
    arenaWidthPx: 380,
    arenaHeightPx: 460,
    laneWidthPx: 170,
    carWidthPx: 34,
    carHeightPx: 58,
    carMaxSpeedPxPerSec: 210,
    carAccelerationPxPerSec2: 620,
    carFrictionPerSec: 5,
    driftAmplitudePx: 24,
    driftPeriodMs: 5200,
    signSpawnMinMs: 2400,
    signSpawnMaxMs: 4200,
    signTargetProbability: 0.3,
    signFallMinPxPerSec: 120,
    signFallMaxPxPerSec: 165,
    targetMode: "pare-text",
  },
  {
    id: 2,
    name: "Fase 2",
    durationMs: 90000,
    arenaWidthPx: 380,
    arenaHeightPx: 460,
    laneWidthPx: 165,
    carWidthPx: 34,
    carHeightPx: 58,
    carMaxSpeedPxPerSec: 230,
    carAccelerationPxPerSec2: 690,
    carFrictionPerSec: 5.2,
    driftAmplitudePx: 32,
    driftPeriodMs: 4700,
    signSpawnMinMs: 1900,
    signSpawnMaxMs: 3200,
    signTargetProbability: 0.3,
    signFallMinPxPerSec: 140,
    signFallMaxPxPerSec: 190,
    targetMode: "pare-text",
  },
  {
    id: 3,
    name: "Fase 3",
    durationMs: 120000,
    arenaWidthPx: 380,
    arenaHeightPx: 460,
    laneWidthPx: 155,
    carWidthPx: 34,
    carHeightPx: 58,
    carMaxSpeedPxPerSec: 250,
    carAccelerationPxPerSec2: 760,
    carFrictionPerSec: 5.4,
    driftAmplitudePx: 42,
    driftPeriodMs: 4200,
    signSpawnMinMs: 1300,
    signSpawnMaxMs: 2500,
    signTargetProbability: 0.25,
    signFallMinPxPerSec: 160,
    signFallMaxPxPerSec: 210,
    targetMode: "red-sign",
  },
  {
    id: 4,
    name: "Fase 4",
    durationMs: 120000,
    arenaWidthPx: 380,
    arenaHeightPx: 460,
    laneWidthPx: 150,
    carWidthPx: 34,
    carHeightPx: 58,
    carMaxSpeedPxPerSec: 270,
    carAccelerationPxPerSec2: 820,
    carFrictionPerSec: 5.6,
    driftAmplitudePx: 48,
    driftPeriodMs: 3600,
    signSpawnMinMs: 900,
    signSpawnMaxMs: 2600,
    signTargetProbability: 0.24,
    signFallMinPxPerSec: 175,
    signFallMaxPxPerSec: 235,
    targetMode: "red-sign",
  },
];

function formatClock(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(sec / 60);
  const rest = sec % 60;
  return `${String(min).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)} s`;
}

function buildResultText(result: DriveSignsSessionResult, reportContext?: ReportContext): string {
  const lines: string[] = [];
  lines.push("=" + "=".repeat(60));
  lines.push("RESULTADO - DIRIJA + PLACAS");
  lines.push("=" + "=".repeat(60));
  lines.push("");

  if (reportContext) {
    lines.push(`Escopo: ${reportContext.mode === "sequence" ? "Trilha" : "Jogo individual"} (${reportContext.scopeLabel})`);
    lines.push("");
  }

  lines.push(`Tempo total: ${formatSeconds(result.elapsedMs)}`);
  lines.push(`Dual score médio: ${result.averageDualScore.toFixed(1)}%`);
  lines.push(`Direção (médio na faixa): ${result.averageInLanePercent.toFixed(1)}%`);
  lines.push(`Placas (média de acerto): ${result.averageHitRatePercent.toFixed(1)}%`);
  lines.push(`Tendência: ${result.trendSummary}`);
  lines.push("");

  result.rounds.forEach((round) => {
    lines.push(round.roundName);
    lines.push(`- Na faixa: ${round.metrics.inLanePercent.toFixed(1)}% (${formatSeconds(round.metrics.inLaneMs)})`);
    lines.push(`- Fora da faixa: ${formatSeconds(round.metrics.outLaneMs)}`);
    lines.push(`- Alvos: ${round.metrics.totalTargets} | acertos ${round.metrics.hits} | falsos positivos ${round.metrics.falsePositives} | omissões ${round.metrics.omissions}`);
    lines.push(`- Taxa de acerto: ${round.metrics.hitRatePercent.toFixed(1)}%`);
    lines.push(`- Dual score: ${round.metrics.dualScore.toFixed(1)}%`);
  });

  lines.push("");
  lines.push(`Finalizado em: ${new Date(result.endedAtIso).toLocaleString("pt-BR")}`);
  return lines.join("\n");
}

export function DirijaPlacasGame({ basePoints, reportContext, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [roundIndex, setRoundIndex] = useState(0);
  const [remainingMs, setRemainingMs] = useState(ROUND_CONFIGS[0]?.durationMs ?? 0);
  const [carX, setCarX] = useState((ROUND_CONFIGS[0]?.arenaWidthPx ?? 380) / 2);
  const [laneCenterX, setLaneCenterX] = useState((ROUND_CONFIGS[0]?.arenaWidthPx ?? 380) / 2);
  const [renderSigns, setRenderSigns] = useState<DriveSignsRoundRuntime["signs"]>([]);
  const [roundLogs, setRoundLogs] = useState<DriveSignsRoundLog[]>([]);
  const [sessionResult, setSessionResult] = useState<DriveSignsSessionResult | null>(null);

  const currentConfig = useMemo(() => ROUND_CONFIGS[roundIndex] ?? ROUND_CONFIGS[0], [roundIndex]);

  const frameRef = useRef<number | null>(null);
  const roundStartRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const lastSampleAtRef = useRef<number>(0);
  const runtimeRef = useRef<DriveSignsRoundRuntime | null>(null);
  const sessionStartedAtRef = useRef<number | null>(null);
  const inputRef = useRef<DriveInputState>({ leftPressed: false, rightPressed: false });

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, []);

  function stopRoundLoop() {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }

  function processRoundFrame(now: number) {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    if (!lastFrameRef.current) {
      lastFrameRef.current = now;
      lastSampleAtRef.current = now;
    }

    const dtMs = Math.max(0, now - lastFrameRef.current);
    lastFrameRef.current = now;

    const elapsedMs = Math.max(0, now - roundStartRef.current);
    const track = updateTrack({
      state: runtime.track,
      elapsedMs,
      config: runtime.config,
    });

    const car = updateCarPosition({
      state: runtime.car,
      input: inputRef.current,
      dtMs,
      config: runtime.config,
    });

    runtime.track = track;
    runtime.car = car;

    const laneHalf = runtime.config.laneWidthPx / 2;
    const carHalf = runtime.config.carWidthPx / 2;
    const insideLane = Math.abs(car.x - track.laneCenterX) <= laneHalf - carHalf;

    if (insideLane) {
      runtime.insideMs += dtMs;
    } else {
      runtime.outsideMs += dtMs;
    }

    if (elapsedMs >= runtime.nextSignAtMs && elapsedMs < runtime.config.durationMs) {
      const sign = spawnSign({
        atMs: elapsedMs,
        id: runtime.signSeq,
        config: runtime.config,
      });
      runtime.signs.push(sign);
      runtime.signSeq += 1;
      if (sign.kind === "target") {
        runtime.targetCount += 1;
      }

      const interval =
        runtime.config.signSpawnMinMs +
        Math.random() * (runtime.config.signSpawnMaxMs - runtime.config.signSpawnMinMs);
      runtime.nextSignAtMs = elapsedMs + Math.round(interval);
    }

    const signUpdate = updateSigns({
      signs: runtime.signs,
      dtMs,
      arenaHeightPx: runtime.config.arenaHeightPx,
    });

    runtime.signs = signUpdate.signs;
    runtime.archivedSigns.push(...signUpdate.archived);
    runtime.omissions += signUpdate.omissionsAdded;

    if (now - lastSampleAtRef.current >= 100) {
      runtime.carSamples.push({
        atMs: elapsedMs,
        carX: car.x,
        laneCenterX: track.laneCenterX,
        insideLane,
      });
      lastSampleAtRef.current = now;
    }

    setCarX(car.x);
    setLaneCenterX(track.laneCenterX);
    setRenderSigns(runtime.signs);

    const remaining = Math.max(0, runtime.config.durationMs - elapsedMs);
    setRemainingMs(remaining);

    if (elapsedMs >= runtime.config.durationMs) {
      finalizeRound();
      return;
    }

    frameRef.current = requestAnimationFrame(processRoundFrame);
  }

  function startCurrentRound() {
    if (!currentConfig) return;

    if (!sessionStartedAtRef.current) {
      sessionStartedAtRef.current = Date.now();
      setRoundLogs([]);
      setSessionResult(null);
    }

    const runtime = startRound(currentConfig);
    runtimeRef.current = runtime;

    setCarX(runtime.car.x);
    setLaneCenterX(runtime.track.laneCenterX);
    setRenderSigns([]);
    setRemainingMs(currentConfig.durationMs);

    inputRef.current = { leftPressed: false, rightPressed: false };

    roundStartRef.current = performance.now();
    lastFrameRef.current = roundStartRef.current;
    lastSampleAtRef.current = roundStartRef.current;

    setPhase("running");
    stopRoundLoop();
    frameRef.current = requestAnimationFrame(processRoundFrame);
  }

  function finalizeRound() {
    stopRoundLoop();
    const runtime = runtimeRef.current;
    if (!runtime) return;

    const endedAtMs = Date.now();

    const metrics = computeRoundMetrics({
      durationMs: runtime.config.durationMs,
      inLaneMs: runtime.insideMs,
      outLaneMs: runtime.outsideMs,
      totalTargets: runtime.targetCount,
      hits: runtime.hits,
      falsePositives: runtime.falsePositives,
      omissions: runtime.omissions,
    });

    const roundLog: DriveSignsRoundLog = {
      roundNumber: roundIndex + 1,
      roundName: runtime.config.name,
      startedAtIso: new Date(endedAtMs - runtime.config.durationMs).toISOString(),
      endedAtIso: new Date(endedAtMs).toISOString(),
      config: runtime.config,
      metrics,
      carSamples: runtime.carSamples,
      signs: [...runtime.archivedSigns, ...runtime.signs],
    };

    setRoundLogs((previous) => [...previous, roundLog]);

    if (roundIndex + 1 < ROUND_CONFIGS.length) {
      setPhase("round-feedback");
      return;
    }

    if (!sessionStartedAtRef.current) return;

    const finalRounds = [...roundLogs, roundLog];
    const result = computeMetrics({
      startedAtMs: sessionStartedAtRef.current,
      endedAtMs,
      rounds: finalRounds,
    });

    setSessionResult(result);
    setPhase("result");
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (phase !== "running") return;

      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        inputRef.current.leftPressed = true;
      }

      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        inputRef.current.rightPressed = true;
      }

      if (event.code === "Space") {
        event.preventDefault();
        const runtime = runtimeRef.current;
        if (!runtime) return;

        const elapsedMs = Math.max(0, performance.now() - roundStartRef.current);
        const resolved = handleKeyPress({
          key: event.key,
          atMs: elapsedMs,
          signs: runtime.signs,
          responseKey: " ",
        });

        runtime.signs = resolved.signs;
        if (resolved.hit) runtime.hits += 1;
        if (resolved.falsePositive) runtime.falsePositives += 1;
      }
    }

    function onKeyUp(event: KeyboardEvent) {
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        inputRef.current.leftPressed = false;
      }

      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        inputRef.current.rightPressed = false;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [phase]);

  function nextRound() {
    setRoundIndex((value) => value + 1);
    setPhase("intro");
  }

  function concludeExercise() {
    if (!sessionResult) {
      onComplete({ success: false, pointsEarned: 0 });
      return;
    }

    const success = sessionResult.averageDualScore >= 65;
    const pointsEarned = Math.round(basePoints * Math.min(1, sessionResult.averageDualScore / 100));
    onComplete({ success, pointsEarned });
  }

  function downloadText() {
    if (!sessionResult) return;
    const content = buildResultText(sessionResult, reportContext);
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
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
  }

  return (
    <div className="space-y-5">
      {phase === "intro" && currentConfig && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5">
          <h3 className="text-xl font-semibold text-zinc-900">Dirija + Placas</h3>
          <div className="rounded-lg border border-black/10 bg-zinc-50 p-4 text-sm text-zinc-700">
            <p className="font-semibold text-zinc-900">{currentConfig.name}</p>
            <p className="mt-1">Mantenha o carro dentro da faixa usando <strong>←/→</strong> ou <strong>A/D</strong>.</p>
            <p className="mt-1">Pressione <strong>ESPAÇO</strong> apenas para a placa-alvo.</p>
            <p className="mt-1">
              Alvo desta fase: {currentConfig.targetMode === "pare-text" ? "texto PARE" : "placa vermelha"}.
            </p>
            <p className="mt-1">Foco contínuo nas duas tarefas até o fim da fase.</p>
          </div>
          <button
            type="button"
            onClick={startCurrentRound}
            className="w-full rounded-lg bg-zinc-900 px-4 py-3 font-semibold text-white hover:bg-zinc-700"
          >
            Iniciar fase
          </button>
        </div>
      )}

      {phase === "running" && currentConfig && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Fase</p>
              <p className="font-semibold text-zinc-900">{roundIndex + 1}/{ROUND_CONFIGS.length}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Tempo restante</p>
              <p className="font-semibold text-zinc-900">{formatClock(remainingMs)}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div
              className="relative mx-auto overflow-hidden rounded-lg border border-zinc-300 bg-zinc-100"
              style={{ width: currentConfig.arenaWidthPx, height: currentConfig.arenaHeightPx }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.22)_1px,transparent_1px)] bg-[length:100%_28px]" />

              <div
                className="absolute top-0 h-full border-x-2 border-dashed border-zinc-500/70 bg-zinc-300/40"
                style={{
                  width: currentConfig.laneWidthPx,
                  left: laneCenterX - currentConfig.laneWidthPx / 2,
                }}
              />

              {renderSigns.map((sign) => (
                <div
                  key={sign.id}
                  className={`absolute left-1/2 -translate-x-1/2 rounded-md px-3 py-2 text-xs font-bold shadow-sm ${sign.visual.colorClass}`}
                  style={{ top: sign.y }}
                >
                  {sign.visual.label}
                </div>
              ))}

              <div
                className="absolute rounded-md bg-zinc-900"
                style={{
                  width: currentConfig.carWidthPx,
                  height: currentConfig.carHeightPx,
                  left: carX - currentConfig.carWidthPx / 2,
                  bottom: 18,
                }}
              />
            </div>

            <p className="text-xs text-zinc-600">
              Controles: ←/→ ou A/D para dirigir | Espaço para responder placa-alvo
            </p>
          </div>
        </div>
      )}

      {phase === "round-feedback" && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5">
          <h3 className="text-xl font-semibold text-zinc-900">Fase concluída</h3>
          <button
            type="button"
            onClick={nextRound}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Próxima fase
          </button>
        </div>
      )}

      {phase === "result" && sessionResult && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5">
          <h3 className="text-xl font-semibold text-zinc-900">Resultado final</h3>
          {reportContext && (
            <p className="text-sm text-zinc-600">
              {reportContext.mode === "sequence" ? "Trilha" : "Jogo individual"}: {reportContext.scopeLabel}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Dual score médio</p>
              <p className="font-semibold text-zinc-900">{sessionResult.averageDualScore.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Direção (na faixa)</p>
              <p className="font-semibold text-zinc-900">{sessionResult.averageInLanePercent.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Placas (acerto)</p>
              <p className="font-semibold text-zinc-900">{sessionResult.averageHitRatePercent.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3 sm:col-span-3">
              <p className="text-xs text-zinc-500">Tendência</p>
              <p className="font-semibold text-zinc-900">{sessionResult.trendSummary}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={downloadText}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              Baixar resultados (.txt)
            </button>
            <button
              type="button"
              onClick={concludeExercise}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Concluir exercício
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
