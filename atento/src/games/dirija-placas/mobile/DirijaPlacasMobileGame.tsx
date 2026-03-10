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
} from "../logic";
import type {
  DriveInputState,
  DriveSignsRoundConfig,
  DriveSignsRoundLog,
  DriveSignsRoundRuntime,
  DriveSignsSessionResult,
} from "../types";

type Props = {
  basePoints: number;
  startingLevel: number;
  maxLevelHint: number;
  reportContext?: ReportContext;
  onComplete: (result: { success: boolean; pointsEarned: number }) => void;
};

type Phase = "intro" | "orientation" | "running" | "round-feedback" | "result";

const MOBILE_CONTROL_BUTTON_WIDTH_PX = 92;
const MOBILE_CONTROL_GAP_PX = 10;
const MOBILE_HORIZONTAL_PADDING_PX = 24;
const MOBILE_VERTICAL_RESERVED_PX = 210;
const MOBILE_MIN_ARENA_WIDTH_PX = 180;
const MOBILE_MAX_ARENA_WIDTH_PX = 640;
const MOBILE_MIN_ARENA_HEIGHT_PX = 220;
const MOBILE_MAX_ARENA_HEIGHT_PX = 560;

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

function clamp(min: number, value: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formatClock(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(sec / 60);
  const rest = sec % 60;
  return `${String(min).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)} s`;
}

function getViewportSize(): { width: number; height: number } {
  if (typeof window === "undefined") {
    return { width: 390, height: 844 };
  }

  const viewport = window.visualViewport;
  return {
    width: Math.round(viewport?.width ?? window.innerWidth),
    height: Math.round(viewport?.height ?? window.innerHeight),
  };
}

function getMobileArenaRectPx(): { width: number; height: number } {
  const viewport = getViewportSize();

  const widthBudget =
    viewport.width -
    (MOBILE_CONTROL_BUTTON_WIDTH_PX * 2 + MOBILE_CONTROL_GAP_PX * 2 + MOBILE_HORIZONTAL_PADDING_PX);
  const heightBudget = viewport.height - MOBILE_VERTICAL_RESERVED_PX;

  const width = clamp(
    MOBILE_MIN_ARENA_WIDTH_PX,
    Math.floor(widthBudget),
    MOBILE_MAX_ARENA_WIDTH_PX,
  );
  const height = clamp(
    MOBILE_MIN_ARENA_HEIGHT_PX,
    Math.floor(heightBudget),
    MOBILE_MAX_ARENA_HEIGHT_PX,
  );

  return { width, height };
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
  lines.push(`Dual score medio: ${result.averageDualScore.toFixed(1)}%`);
  lines.push(`Direcao (medio na faixa): ${result.averageInLanePercent.toFixed(1)}%`);
  lines.push(`Placas (media de acerto): ${result.averageHitRatePercent.toFixed(1)}%`);
  lines.push(`Tendencia: ${result.trendSummary}`);
  lines.push("");

  result.rounds.forEach((round) => {
    lines.push(round.roundName);
    lines.push(`- Na faixa: ${round.metrics.inLanePercent.toFixed(1)}% (${formatSeconds(round.metrics.inLaneMs)})`);
    lines.push(`- Fora da faixa: ${formatSeconds(round.metrics.outLaneMs)}`);
    lines.push(`- Alvos: ${round.metrics.totalTargets} | acertos ${round.metrics.hits} | falsos positivos ${round.metrics.falsePositives} | omissoes ${round.metrics.omissions}`);
    lines.push(`- Taxa de acerto: ${round.metrics.hitRatePercent.toFixed(1)}%`);
    lines.push(`- Dual score: ${round.metrics.dualScore.toFixed(1)}%`);
  });

  lines.push("");
  lines.push(`Finalizado em: ${new Date(result.endedAtIso).toLocaleString("pt-BR")}`);
  return lines.join("\n");
}

export function DirijaPlacasMobileGame({ basePoints, reportContext, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [roundIndex, setRoundIndex] = useState(0);
  const [orientationCountdown, setOrientationCountdown] = useState(4);
  const [remainingMs, setRemainingMs] = useState(ROUND_CONFIGS[0]?.durationMs ?? 0);
  const [carX, setCarX] = useState((ROUND_CONFIGS[0]?.arenaWidthPx ?? 380) / 2);
  const [laneCenterX, setLaneCenterX] = useState((ROUND_CONFIGS[0]?.arenaWidthPx ?? 380) / 2);
  const [renderSigns, setRenderSigns] = useState<DriveSignsRoundRuntime["signs"]>([]);
  const [roundLogs, setRoundLogs] = useState<DriveSignsRoundLog[]>([]);
  const [sessionResult, setSessionResult] = useState<DriveSignsSessionResult | null>(null);
  const [arenaRectPx, setArenaRectPx] = useState<{ width: number; height: number }>({
    width: 240,
    height: 320,
  });
  const [steeringActive, setSteeringActive] = useState<"left" | "right" | null>(null);
  const [targetButtonActive, setTargetButtonActive] = useState(false);

  const currentConfig = useMemo(() => ROUND_CONFIGS[roundIndex] ?? ROUND_CONFIGS[0], [roundIndex]);

  const frameRef = useRef<number | null>(null);
  const roundStartRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const lastSampleAtRef = useRef<number>(0);
  const runtimeRef = useRef<DriveSignsRoundRuntime | null>(null);
  const sessionStartedAtRef = useRef<number | null>(null);
  const inputRef = useRef<DriveInputState>({ leftPressed: false, rightPressed: false });
  const targetFeedbackTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setArenaRectPx(getMobileArenaRectPx());

    function updateArenaRect() {
      setArenaRectPx(getMobileArenaRectPx());
    }

    window.addEventListener("resize", updateArenaRect);
    window.addEventListener("orientationchange", updateArenaRect);
    window.visualViewport?.addEventListener("resize", updateArenaRect);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      if (targetFeedbackTimeoutRef.current) {
        window.clearTimeout(targetFeedbackTimeoutRef.current);
      }
      window.removeEventListener("resize", updateArenaRect);
      window.removeEventListener("orientationchange", updateArenaRect);
      window.visualViewport?.removeEventListener("resize", updateArenaRect);
    };
  }, []);

  useEffect(() => {
    if (phase !== "orientation") return;

    setOrientationCountdown(4);
    const intervalId = window.setInterval(() => {
      setOrientationCountdown((value) => (value > 0 ? value - 1 : 0));
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "orientation") return;
    if (orientationCountdown !== 0) return;
    startCurrentRound();
  }, [phase, orientationCountdown]);

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
    setSteeringActive(null);

    roundStartRef.current = performance.now();
    lastFrameRef.current = roundStartRef.current;
    lastSampleAtRef.current = roundStartRef.current;

    setPhase("running");
    stopRoundLoop();
    frameRef.current = requestAnimationFrame(processRoundFrame);
  }

  function beginRoundOrientationPopup() {
    setPhase("orientation");
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

  function setSteer(direction: "left" | "right", pressed: boolean) {
    if (direction === "left") {
      inputRef.current.leftPressed = pressed;
    }

    if (direction === "right") {
      inputRef.current.rightPressed = pressed;
    }

    if (!pressed && steeringActive === direction) {
      setSteeringActive(null);
      return;
    }

    if (pressed) {
      setSteeringActive(direction);
    }
  }

  function clearSteering() {
    inputRef.current.leftPressed = false;
    inputRef.current.rightPressed = false;
    setSteeringActive(null);
  }

  function respondTarget() {
    if (phase !== "running") return;

    const runtime = runtimeRef.current;
    if (!runtime) return;

    const elapsedMs = Math.max(0, performance.now() - roundStartRef.current);
    const resolved = handleKeyPress({
      key: " ",
      atMs: elapsedMs,
      signs: runtime.signs,
      responseKey: " ",
    });

    runtime.signs = resolved.signs;
    if (resolved.hit) runtime.hits += 1;
    if (resolved.falsePositive) runtime.falsePositives += 1;

    setTargetButtonActive(true);
    if (targetFeedbackTimeoutRef.current) {
      window.clearTimeout(targetFeedbackTimeoutRef.current);
    }
    targetFeedbackTimeoutRef.current = window.setTimeout(() => {
      setTargetButtonActive(false);
    }, 160);
  }

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
    <div className="space-y-5 select-none" style={{ WebkitUserSelect: "none", userSelect: "none" }}>
      {phase === "intro" && currentConfig && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5">
          <h3 className="text-xl font-semibold text-zinc-900">Dirija + Placas</h3>
          <div className="rounded-lg border border-black/10 bg-zinc-50 p-4 text-sm text-zinc-700">
            <p className="font-semibold text-zinc-900">{currentConfig.name}</p>
            <p className="mt-1">Mantenha o carro na faixa com os botoes laterais.</p>
            <p className="mt-1">Toque no botao de resposta somente para a placa-alvo.</p>
            <p className="mt-1">
              Alvo desta fase: {currentConfig.targetMode === "pare-text" ? "texto PARE" : "placa vermelha"}.
            </p>
            <p className="mt-1">Recomendado: usar o celular na horizontal para maior area de jogo.</p>
          </div>
          <button
            type="button"
            onClick={beginRoundOrientationPopup}
            className="w-full rounded-lg bg-zinc-900 px-4 py-3 font-semibold text-white hover:bg-zinc-700"
          >
            Iniciar fase
          </button>
        </div>
      )}

      {phase === "orientation" && currentConfig && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5">
          <h3 className="text-xl font-semibold text-zinc-900">Prepare-se</h3>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Gire o celular para horizontal</p>
            <p className="mt-1">A fase {currentConfig.id} vai iniciar automaticamente em {orientationCountdown}s.</p>
          </div>
        </div>
      )}

      {phase === "running" && currentConfig && (
        <div className="space-y-3 rounded-lg border border-black/10 bg-white p-3 sm:p-4">
          <div className="flex items-center justify-center gap-3">
            <div className="rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-center" style={{ width: 92 }}>
              <p className="text-[11px] leading-tight text-zinc-500">Tempo</p>
              <p className="text-sm font-semibold text-zinc-900">{formatClock(remainingMs)}</p>
            </div>
            <button
              type="button"
              onPointerDown={(event) => {
                event.preventDefault();
                respondTarget();
              }}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-all ${
                targetButtonActive
                  ? "scale-[0.98] border-zinc-900 bg-zinc-900 text-white shadow-inner"
                  : "border-zinc-300 bg-zinc-100 text-zinc-900"
              }`}
              style={{ width: 120 }}
            >
              Placa-alvo
            </button>
          </div>

          <div className="mx-auto flex w-full items-center justify-center gap-[10px] overflow-hidden">
            <button
              type="button"
              onPointerDown={(event) => {
                event.preventDefault();
                setSteer("left", true);
              }}
              onPointerUp={() => setSteer("left", false)}
              onPointerCancel={() => setSteer("left", false)}
              onPointerLeave={() => setSteer("left", false)}
              className={`h-[58%] min-h-[180px] rounded-xl border px-3 text-sm font-semibold transition-all ${
                steeringActive === "left"
                  ? "scale-[0.98] border-zinc-900 bg-zinc-900 text-white shadow-inner"
                  : "border-zinc-300 bg-zinc-100 text-zinc-900"
              }`}
              style={{ width: MOBILE_CONTROL_BUTTON_WIDTH_PX }}
            >
              Esquerda
            </button>

            <div
              className="relative overflow-hidden rounded-lg border border-zinc-300 bg-zinc-100"
              style={{
                width: arenaRectPx.width,
                height: arenaRectPx.height,
                WebkitUserSelect: "none",
                userSelect: "none",
                WebkitTouchCallout: "none",
                touchAction: "none",
              }}
              onPointerUp={clearSteering}
              onPointerCancel={clearSteering}
              onPointerLeave={clearSteering}
            >
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.22)_1px,transparent_1px)] bg-[length:100%_28px]" />

              <div
                className="absolute top-0 h-full border-x-2 border-dashed border-zinc-500/70 bg-zinc-300/40"
                style={{
                  width: (currentConfig.laneWidthPx / currentConfig.arenaWidthPx) * arenaRectPx.width,
                  left: clamp(
                    0,
                    (laneCenterX / currentConfig.arenaWidthPx) * arenaRectPx.width -
                      ((currentConfig.laneWidthPx / currentConfig.arenaWidthPx) * arenaRectPx.width) / 2,
                    arenaRectPx.width - (currentConfig.laneWidthPx / currentConfig.arenaWidthPx) * arenaRectPx.width,
                  ),
                }}
              />

              {renderSigns.map((sign) => (
                <div
                  key={sign.id}
                  className={`absolute left-1/2 -translate-x-1/2 rounded-md px-2 py-1 text-[10px] font-bold shadow-sm ${sign.visual.colorClass}`}
                  style={{
                    top: clamp(
                      -24,
                      (sign.y / currentConfig.arenaHeightPx) * arenaRectPx.height,
                      arenaRectPx.height + 24,
                    ),
                  }}
                >
                  {sign.visual.label}
                </div>
              ))}

              <div
                className="absolute rounded-md bg-zinc-900"
                style={{
                  width: (currentConfig.carWidthPx / currentConfig.arenaWidthPx) * arenaRectPx.width,
                  height: (currentConfig.carHeightPx / currentConfig.arenaHeightPx) * arenaRectPx.height,
                  left: clamp(
                    0,
                    (carX / currentConfig.arenaWidthPx) * arenaRectPx.width -
                      ((currentConfig.carWidthPx / currentConfig.arenaWidthPx) * arenaRectPx.width) / 2,
                    arenaRectPx.width - (currentConfig.carWidthPx / currentConfig.arenaWidthPx) * arenaRectPx.width,
                  ),
                  bottom: 12,
                }}
              />
            </div>

            <button
              type="button"
              onPointerDown={(event) => {
                event.preventDefault();
                setSteer("right", true);
              }}
              onPointerUp={() => setSteer("right", false)}
              onPointerCancel={() => setSteer("right", false)}
              onPointerLeave={() => setSteer("right", false)}
              className={`h-[58%] min-h-[180px] rounded-xl border px-3 text-sm font-semibold transition-all ${
                steeringActive === "right"
                  ? "scale-[0.98] border-zinc-900 bg-zinc-900 text-white shadow-inner"
                  : "border-zinc-300 bg-zinc-100 text-zinc-900"
              }`}
              style={{ width: MOBILE_CONTROL_BUTTON_WIDTH_PX }}
            >
              Direita
            </button>
          </div>
        </div>
      )}

      {phase === "round-feedback" && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5">
          <h3 className="text-xl font-semibold text-zinc-900">Fase concluida</h3>
          <button
            type="button"
            onClick={nextRound}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Proxima fase
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
              <p className="text-xs text-zinc-500">Dual score medio</p>
              <p className="font-semibold text-zinc-900">{sessionResult.averageDualScore.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Direcao (na faixa)</p>
              <p className="font-semibold text-zinc-900">{sessionResult.averageInLanePercent.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Placas (acerto)</p>
              <p className="font-semibold text-zinc-900">{sessionResult.averageHitRatePercent.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3 sm:col-span-3">
              <p className="text-xs text-zinc-500">Tendencia</p>
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
              Concluir exercicio
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
