"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReportContext } from "@/components/AttentionTrainingGame";
import { buildTxtReportFileName } from "@/utils/reportFileName";
import {
  computeMetrics,
  computeRoundMetrics,
  getEffectiveRadarSpeed,
  handleKeyPress,
  startRound,
  updateRadar,
} from "../logic";
import type {
  RadarState,
  RadarToneRoundConfig,
  RadarToneRoundLog,
  RadarToneRoundRuntime,
  RadarToneSessionResult,
  ToneEvent,
  ToneType,
} from "../types";

type Props = {
  basePoints: number;
  startingLevel: number;
  maxLevelHint: number;
  reportContext?: ReportContext;
  onComplete: (result: { success: boolean; pointsEarned: number }) => void;
};

type Phase = "intro" | "orientation" | "running" | "round-feedback" | "result";

const MOBILE_SIDE_BUTTON_WIDTH_PX = 96;
const MOBILE_LAYOUT_GAP_PX = 12;
const MOBILE_HORIZONTAL_PADDING_PX = 24;
const MOBILE_VERTICAL_RESERVED_PX = 140;
const MOBILE_MIN_ARENA_WIDTH_PX = 180;
const MOBILE_MAX_ARENA_WIDTH_PX = 720;
const MOBILE_MIN_ARENA_HEIGHT_PX = 180;
const MOBILE_MAX_ARENA_HEIGHT_PX = 360;
const MOBILE_GHOST_TARGET_OFFSET_RENDER_PX = 34;

const ROUND_CONFIGS: RadarToneRoundConfig[] = [
  {
    id: 1,
    name: "Fase 1",
    durationMs: 60000,
    arenaSizePx: 360,
    dotRadiusPx: 12,
    hitTolerancePx: 14,
    radarSpeedPxPerSec: 55,
    toneIntervalMinMs: 2000,
    toneIntervalMaxMs: 3000,
    toneProbabilityAgudo: 0.5,
    responseWindowMinMs: 150,
    responseWindowMaxMs: 1500,
    keyMap: { grave: "j", agudo: "k" },
  },
  {
    id: 2,
    name: "Fase 2",
    durationMs: 90000,
    arenaSizePx: 360,
    dotRadiusPx: 12,
    hitTolerancePx: 14,
    radarSpeedPxPerSec: 72,
    toneIntervalMinMs: 1500,
    toneIntervalMaxMs: 2400,
    toneProbabilityAgudo: 0.5,
    responseWindowMinMs: 150,
    responseWindowMaxMs: 1500,
    keyMap: { grave: "j", agudo: "k" },
  },
  {
    id: 3,
    name: "Fase 3",
    durationMs: 120000,
    arenaSizePx: 360,
    dotRadiusPx: 12,
    hitTolerancePx: 14,
    radarSpeedPxPerSec: 90,
    toneIntervalMinMs: 1100,
    toneIntervalMaxMs: 1800,
    toneProbabilityAgudo: 0.5,
    responseWindowMinMs: 150,
    responseWindowMaxMs: 1500,
    keyMap: { grave: "j", agudo: "k" },
    speedModulationMode: "alternating-up-only",
    abruptBoostMultiplier: 1.5,
    gradualBoostMultiplier: 1.22,
    modulationWindowMs: 2200,
  },
  {
    id: 4,
    name: "Fase 4",
    durationMs: 120000,
    arenaSizePx: 360,
    dotRadiusPx: 12,
    hitTolerancePx: 14,
    radarSpeedPxPerSec: 105,
    toneIntervalMinMs: 850,
    toneIntervalMaxMs: 1700,
    toneProbabilityAgudo: 0.5,
    responseWindowMinMs: 150,
    responseWindowMaxMs: 1500,
    keyMap: { grave: "j", agudo: "k" },
    speedModulationMode: "alternating-up-only",
    abruptBoostMultiplier: 1.65,
    gradualBoostMultiplier: 1.3,
    modulationWindowMs: 1800,
    hasDistractorSphere: true,
    distractorBaseSpeedPxPerSec: 95,
    distractorOscillationAmplitude: 0.45,
    distractorOscillationPeriodMs: 1800,
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

function createAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return Ctx ? new Ctx() : null;
}

function playTone(audioContext: AudioContext | null, type: ToneType): void {
  if (!audioContext) return;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = "sine";
  osc.frequency.value = type === "agudo" ? 860 : 320;
  gain.gain.value = 0.05;
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start();
  osc.stop(audioContext.currentTime + 0.11);
}

function normalizeLetterKey(event: KeyboardEvent): string | null {
  const key = event.key?.trim().toLowerCase();
  if (key && key.length === 1 && key >= "a" && key <= "z") {
    return key;
  }

  const code = event.code?.trim();
  if (code?.startsWith("Key") && code.length === 4) {
    return code.slice(3).toLowerCase();
  }

  return null;
}

function scaleVelocityToSpeed(state: RadarState, targetSpeed: number): RadarState {
  const magnitude = Math.hypot(state.vx, state.vy);
  if (magnitude <= 0) {
    return { ...state, vx: targetSpeed, vy: 0 };
  }
  const scale = targetSpeed / magnitude;
  return {
    ...state,
    vx: state.vx * scale,
    vy: state.vy * scale,
  };
}

function clamp(min: number, value: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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
    (MOBILE_SIDE_BUTTON_WIDTH_PX * 2 + MOBILE_LAYOUT_GAP_PX * 2 + MOBILE_HORIZONTAL_PADDING_PX);
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

function applySphereCollision(params: {
  black: RadarState;
  red: RadarState;
  radius: number;
}): { black: RadarState; red: RadarState } {
  const dx = params.black.x - params.red.x;
  const dy = params.black.y - params.red.y;
  const distance = Math.hypot(dx, dy);
  const minDistance = params.radius * 2;

  if (distance <= 0 || distance >= minDistance) {
    return { black: params.black, red: params.red };
  }

  const nx = dx / distance;
  const ny = dy / distance;
  const tx = -ny;
  const ty = nx;

  const v1n = params.black.vx * nx + params.black.vy * ny;
  const v1t = params.black.vx * tx + params.black.vy * ty;
  const v2n = params.red.vx * nx + params.red.vy * ny;
  const v2t = params.red.vx * tx + params.red.vy * ty;

  const blackAfter: RadarState = {
    ...params.black,
    vx: v2n * nx + v1t * tx,
    vy: v2n * ny + v1t * ty,
  };

  const redAfter: RadarState = {
    ...params.red,
    vx: v1n * nx + v2t * tx,
    vy: v1n * ny + v2t * ty,
  };

  const overlap = minDistance - distance;
  if (overlap > 0) {
    blackAfter.x += nx * (overlap / 2);
    blackAfter.y += ny * (overlap / 2);
    redAfter.x -= nx * (overlap / 2);
    redAfter.y -= ny * (overlap / 2);
  }

  return { black: blackAfter, red: redAfter };
}

function buildResultText(result: RadarToneSessionResult, reportContext?: ReportContext): string {
  const lines: string[] = [];
  lines.push("=" + "=".repeat(60));
  lines.push("RESULTADO - RADAR E TOM");
  lines.push("=" + "=".repeat(60));
  lines.push("");
  if (reportContext) {
    lines.push(`Escopo: ${reportContext.mode === "sequence" ? "Trilha" : "Jogo individual"} (${reportContext.scopeLabel})`);
    lines.push("");
  }

  lines.push(`Tempo total: ${formatSeconds(result.elapsedMs)}`);
  lines.push(`Dual score médio: ${result.averageDualScore.toFixed(1)}%`);
  lines.push(`Radar médio: ${result.averageRadarTrackedPercent.toFixed(1)}%`);
  lines.push(`Tons (acerto médio): ${result.averageToneAccuracyPercent.toFixed(1)}%`);
  lines.push(`Tendência: ${result.trendSummary}`);
  lines.push("");

  result.rounds.forEach((round) => {
    lines.push(`${round.roundName}`);
    lines.push(`- Radar: ${round.metrics.radarTrackedPercent.toFixed(1)}% (${formatSeconds(round.metrics.radarTrackedMs)})`);
    lines.push(`- Tons: ${round.metrics.toneHits}/${round.metrics.totalTones} acertos | erros ${round.metrics.toneErrors} | omissões ${round.metrics.toneOmissions}`);
    lines.push(`- Dual score: ${round.metrics.dualScore.toFixed(1)}%`);
  });

  lines.push("");
  lines.push(`Finalizado em: ${new Date(result.endedAtIso).toLocaleString("pt-BR")}`);
  return lines.join("\n");
}

export function RadarTonoMobileGame({ basePoints, reportContext, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [roundIndex, setRoundIndex] = useState(0);
  const [orientationCountdown, setOrientationCountdown] = useState(4);
  const [remainingMs, setRemainingMs] = useState(ROUND_CONFIGS[0]?.durationMs ?? 0);
  const [dotPosition, setDotPosition] = useState<{ x: number; y: number }>({ x: 180, y: 180 });
  const [redDotPosition, setRedDotPosition] = useState<{ x: number; y: number } | null>(null);
  const [arenaRectPx, setArenaRectPx] = useState<{ width: number; height: number }>({ width: 360, height: 300 });
  const [isTrackingTarget, setIsTrackingTarget] = useState(false);
  const [ghostPointerPosition, setGhostPointerPosition] = useState<{ x: number; y: number } | null>(null);
  const [activeToneButton, setActiveToneButton] = useState<ToneType | null>(null);
  const [roundLogs, setRoundLogs] = useState<RadarToneRoundLog[]>([]);
  const [sessionResult, setSessionResult] = useState<RadarToneSessionResult | null>(null);

  const currentConfig = useMemo(() => ROUND_CONFIGS[roundIndex] ?? ROUND_CONFIGS[0], [roundIndex]);

  const frameRef = useRef<number | null>(null);
  const roundStartRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const roundRuntimeRef = useRef<RadarToneRoundRuntime | null>(null);
  const radarStateRef = useRef<RadarState>({ x: 180, y: 180, vx: 40, vy: 40 });
  const redRadarStateRef = useRef<RadarState | null>(null);
  const tonesRef = useRef<ToneEvent[]>([]);
  const trackedMsRef = useRef(0);
  const mouseRef = useRef<{ x: number; y: number; valid: boolean }>({ x: 0, y: 0, valid: false });
  const trackingStateRef = useRef(false);
  const sessionStartedAtRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const toneFeedbackTimeoutRef = useRef<number | null>(null);

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
      if (toneFeedbackTimeoutRef.current) {
        window.clearTimeout(toneFeedbackTimeoutRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
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

  function updatePointerPosition(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const logicalArenaSize = roundRuntimeRef.current?.config.arenaSizePx ?? currentConfig.arenaSizePx;
    const xRatio = clamp(0, (event.clientX - rect.left) / rect.width, 1);
    const yRatio = clamp(0, (event.clientY - rect.top) / rect.height, 1);
    const pointerX = xRatio * logicalArenaSize;
    const pointerY = yRatio * logicalArenaSize;

    const ghostOffsetLogicalY = (MOBILE_GHOST_TARGET_OFFSET_RENDER_PX / Math.max(rect.height, 1)) * logicalArenaSize;
    const ghostX = pointerX;
    const ghostY = clamp(0, pointerY - ghostOffsetLogicalY, logicalArenaSize);

    mouseRef.current = { x: ghostX, y: ghostY, valid: true };
    setGhostPointerPosition({ x: ghostX, y: ghostY });
  }

  function clearMousePosition() {
    setGhostPointerPosition(null);
    mouseRef.current = { x: 0, y: 0, valid: false };
    if (trackingStateRef.current) {
      trackingStateRef.current = false;
      setIsTrackingTarget(false);
    }
  }

  function processRoundFrame(now: number) {
    if (!roundRuntimeRef.current) return;

    const config = roundRuntimeRef.current.config;
    if (!lastFrameRef.current) {
      lastFrameRef.current = now;
    }

    const dtMs = Math.max(0, now - lastFrameRef.current);
    lastFrameRef.current = now;

    const elapsedMs = Math.max(0, now - roundStartRef.current);
    const effectiveSpeed = getEffectiveRadarSpeed(elapsedMs, config);
    const speedAdjustedState = scaleVelocityToSpeed(radarStateRef.current, effectiveSpeed);

    let nextBlackState = updateRadar({
      state: speedAdjustedState,
      dtMs,
      arenaSizePx: config.arenaSizePx,
      dotRadiusPx: config.dotRadiusPx,
    });

    let nextRedState: RadarState | null = null;
    if (config.hasDistractorSphere && redRadarStateRef.current) {
      const redBase = Math.max(
        config.radarSpeedPxPerSec,
        config.distractorBaseSpeedPxPerSec ?? config.radarSpeedPxPerSec,
      );
      const redAmp = Math.max(0, config.distractorOscillationAmplitude ?? 0.35);
      const redPeriod = Math.max(500, config.distractorOscillationPeriodMs ?? 1800);
      const wave = Math.abs(Math.sin((Math.PI * 2 * elapsedMs) / redPeriod));
      const redSpeed = redBase * (1 + redAmp * wave);

      const redAdjusted = scaleVelocityToSpeed(redRadarStateRef.current, redSpeed);
      nextRedState = updateRadar({
        state: redAdjusted,
        dtMs,
        arenaSizePx: config.arenaSizePx,
        dotRadiusPx: config.dotRadiusPx,
      });

      const collided = applySphereCollision({
        black: nextBlackState,
        red: nextRedState,
        radius: config.dotRadiusPx,
      });
      nextBlackState = collided.black;
      nextRedState = collided.red;
    }

    radarStateRef.current = nextBlackState;
    redRadarStateRef.current = nextRedState;
    setDotPosition({ x: nextBlackState.x, y: nextBlackState.y });
    setRedDotPosition(nextRedState ? { x: nextRedState.x, y: nextRedState.y } : null);

    let trackingNow = false;
    if (mouseRef.current.valid) {
      const distance = Math.hypot(mouseRef.current.x - nextBlackState.x, mouseRef.current.y - nextBlackState.y);
      if (distance <= config.dotRadiusPx + config.hitTolerancePx) {
        trackedMsRef.current += dtMs;
        trackingNow = true;
      }
    }

    if (trackingNow !== trackingStateRef.current) {
      trackingStateRef.current = trackingNow;
      setIsTrackingTarget(trackingNow);
    }

    let changed = false;
    const updatedTones = tonesRef.current.map((tone) => {
      if (!tone.played && elapsedMs >= tone.startAtMs) {
        playTone(audioContextRef.current, tone.type);
        changed = true;
        return { ...tone, played: true };
      }
      return tone;
    });

    if (changed) {
      tonesRef.current = updatedTones;
    }

    const remaining = Math.max(0, config.durationMs - elapsedMs);
    setRemainingMs(remaining);

    if (elapsedMs >= config.durationMs) {
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

    if (!audioContextRef.current) {
      audioContextRef.current = createAudioContext();
    }

    const roundConfig: RadarToneRoundConfig = { ...currentConfig };

    const runtime = startRound(roundConfig);
    roundRuntimeRef.current = runtime;
    radarStateRef.current = runtime.radarInitialState;
    redRadarStateRef.current = roundConfig.hasDistractorSphere
      ? {
          x: roundConfig.arenaSizePx * 0.25,
          y: roundConfig.arenaSizePx * 0.75,
          vx: (roundConfig.distractorBaseSpeedPxPerSec ?? roundConfig.radarSpeedPxPerSec) * Math.cos(Math.PI / 6),
          vy: (roundConfig.distractorBaseSpeedPxPerSec ?? roundConfig.radarSpeedPxPerSec) * Math.sin(Math.PI / 6),
        }
      : null;
    tonesRef.current = runtime.tones;
    trackedMsRef.current = 0;
    mouseRef.current = { x: 0, y: 0, valid: false };
    setDotPosition({ x: runtime.radarInitialState.x, y: runtime.radarInitialState.y });
    setRedDotPosition(
      redRadarStateRef.current
        ? { x: redRadarStateRef.current.x, y: redRadarStateRef.current.y }
        : null,
    );
    setRemainingMs(roundConfig.durationMs);

    roundStartRef.current = performance.now();
    lastFrameRef.current = roundStartRef.current;
    setPhase("running");
    stopRoundLoop();
    frameRef.current = requestAnimationFrame(processRoundFrame);
  }

  function beginRoundOrientationPopup() {
    setPhase("orientation");
  }

  function finalizeRound() {
    stopRoundLoop();

    const runtime = roundRuntimeRef.current;
    if (!runtime) return;

    const metrics = computeRoundMetrics({
      durationMs: runtime.config.durationMs,
      radarTrackedMs: trackedMsRef.current,
      events: tonesRef.current,
    });

    const endedAt = Date.now();
    const roundLog: RadarToneRoundLog = {
      roundNumber: roundIndex + 1,
      roundName: runtime.config.name,
      startedAtIso: new Date(endedAt - runtime.config.durationMs).toISOString(),
      endedAtIso: new Date(endedAt).toISOString(),
      metrics,
    };

    setRoundLogs((prev) => [...prev, roundLog]);

    if (roundIndex + 1 < ROUND_CONFIGS.length) {
      setPhase("round-feedback");
      return;
    }

    if (!sessionStartedAtRef.current) return;
    const finalRounds = [...roundLogs, roundLog];
    const result = computeMetrics({
      startedAtMs: sessionStartedAtRef.current,
      endedAtMs: endedAt,
      rounds: finalRounds,
    });
    setSessionResult(result);
    setPhase("result");
  }

  function handleToneTouch(tone: ToneType) {
    if (phase !== "running" || !roundRuntimeRef.current) return;

    setActiveToneButton(tone);
    if (toneFeedbackTimeoutRef.current) {
      window.clearTimeout(toneFeedbackTimeoutRef.current);
    }
    toneFeedbackTimeoutRef.current = window.setTimeout(() => {
      setActiveToneButton((value) => (value === tone ? null : value));
    }, 160);

    const key = tone === "grave" ? "j" : "k";
    const elapsedMs = Math.max(0, performance.now() - roundStartRef.current);
    const handled = handleKeyPress({
      key,
      atMs: elapsedMs,
      events: tonesRef.current,
      keyMap: roundRuntimeRef.current.config.keyMap,
      responseWindowMinMs: roundRuntimeRef.current.config.responseWindowMinMs,
      responseWindowMaxMs: roundRuntimeRef.current.config.responseWindowMaxMs,
    });

    if (handled.matched) {
      tonesRef.current = handled.events;
    }
  }

  function nextRound() {
    setRoundIndex((prev) => prev + 1);
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
          <h3 className="text-xl font-semibold text-zinc-900">Radar e Tom</h3>
          <div className="rounded-lg border border-black/10 bg-zinc-50 p-4 text-sm text-zinc-700">
            <p className="font-semibold text-zinc-900">{currentConfig.name}</p>
            <p className="mt-1">Mantenha o dedo sobre a arena, acompanhando o ponto preto em movimento.</p>
            <p className="mt-1">Ao ouvir tom grave, toque no botão grave. Ao ouvir tom agudo, toque no botão agudo.</p>
            <p className="mt-1">Recomendado: use o celular na posição horizontal para mais conforto.</p>
            {currentConfig.hasDistractorSphere && (
              <p className="mt-1">Nesta fase há uma esfera vermelha de distração. Siga e conte apenas a esfera preta.</p>
            )}
            <p className="mt-1">Foco contínuo nas duas tarefas até o fim da fase.</p>
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
        <div
          className="space-y-3 rounded-lg border border-black/10 bg-white p-3 sm:p-4 select-none"
          style={{ WebkitUserSelect: "none", userSelect: "none" }}
        >
          <div className="flex justify-center">
            <div className="rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-center" style={{ width: MOBILE_SIDE_BUTTON_WIDTH_PX }}>
              <p className="text-[11px] leading-tight text-zinc-500">Tempo</p>
              <p className="text-sm font-semibold text-zinc-900">{formatClock(remainingMs)}</p>
            </div>
          </div>

          <div className="mx-auto flex w-full items-center justify-center gap-3 overflow-hidden">
            <button
              type="button"
              onPointerDown={() => handleToneTouch("grave")}
              onPointerUp={() => setActiveToneButton(null)}
              onPointerCancel={() => setActiveToneButton(null)}
              className={`h-[58%] min-h-[180px] rounded-xl border px-3 text-sm font-semibold transition-all ${
                activeToneButton === "grave"
                  ? "scale-[0.98] border-zinc-900 bg-zinc-900 text-white shadow-inner"
                  : "border-zinc-300 bg-zinc-100 text-zinc-900"
              }`}
              style={{ width: MOBILE_SIDE_BUTTON_WIDTH_PX }}
            >
              Tom grave
            </button>

            <div
              onPointerDown={updatePointerPosition}
              onPointerMove={updatePointerPosition}
              onPointerUp={clearMousePosition}
              onPointerCancel={clearMousePosition}
              onPointerLeave={clearMousePosition}
              onContextMenu={(event) => event.preventDefault()}
              className="relative touch-none rounded-lg border border-zinc-300 bg-zinc-50"
              style={{
                width: arenaRectPx.width,
                height: arenaRectPx.height,
                WebkitUserSelect: "none",
                userSelect: "none",
                WebkitTouchCallout: "none",
                touchAction: "none",
              }}
            >
              <div
                className="absolute rounded-full bg-zinc-900 transition-shadow"
                style={{
                  width: currentConfig.dotRadiusPx * 2,
                  height: currentConfig.dotRadiusPx * 2,
                  left: clamp(
                    0,
                    (dotPosition.x / currentConfig.arenaSizePx) * arenaRectPx.width - currentConfig.dotRadiusPx,
                    arenaRectPx.width - currentConfig.dotRadiusPx * 2,
                  ),
                  top: clamp(
                    0,
                    (dotPosition.y / currentConfig.arenaSizePx) * arenaRectPx.height - currentConfig.dotRadiusPx,
                    arenaRectPx.height - currentConfig.dotRadiusPx * 2,
                  ),
                  boxShadow: isTrackingTarget ? "0 0 0 10px rgba(37, 99, 235, 0.35)" : "none",
                }}
              />
              {redDotPosition && (
                <div
                  className="absolute rounded-full bg-red-600"
                  style={{
                    width: currentConfig.dotRadiusPx * 2,
                    height: currentConfig.dotRadiusPx * 2,
                    left: clamp(
                      0,
                      (redDotPosition.x / currentConfig.arenaSizePx) * arenaRectPx.width - currentConfig.dotRadiusPx,
                      arenaRectPx.width - currentConfig.dotRadiusPx * 2,
                    ),
                    top: clamp(
                      0,
                      (redDotPosition.y / currentConfig.arenaSizePx) * arenaRectPx.height - currentConfig.dotRadiusPx,
                      arenaRectPx.height - currentConfig.dotRadiusPx * 2,
                    ),
                  }}
                />
              )}

              {ghostPointerPosition && (
                <div
                  className="pointer-events-none absolute rounded-full border-2 border-sky-500/80"
                  style={{
                    width: 28,
                    height: 28,
                    left: clamp(
                      0,
                      (ghostPointerPosition.x / currentConfig.arenaSizePx) * arenaRectPx.width - 14,
                      arenaRectPx.width - 28,
                    ),
                    top: clamp(
                      0,
                      (ghostPointerPosition.y / currentConfig.arenaSizePx) * arenaRectPx.height - 14,
                      arenaRectPx.height - 28,
                    ),
                    boxShadow: "0 0 0 4px rgba(56, 189, 248, 0.2)",
                  }}
                />
              )}
            </div>

            <button
              type="button"
              onPointerDown={() => handleToneTouch("agudo")}
              onPointerUp={() => setActiveToneButton(null)}
              onPointerCancel={() => setActiveToneButton(null)}
              className={`h-[58%] min-h-[180px] rounded-xl border px-3 text-sm font-semibold transition-all ${
                activeToneButton === "agudo"
                  ? "scale-[0.98] border-zinc-900 bg-zinc-900 text-white shadow-inner"
                  : "border-zinc-300 bg-zinc-100 text-zinc-900"
              }`}
              style={{ width: MOBILE_SIDE_BUTTON_WIDTH_PX }}
            >
              Tom agudo
            </button>
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
              <p className="text-xs text-zinc-500">Radar (tempo em cima)</p>
              <p className="font-semibold text-zinc-900">{sessionResult.averageRadarTrackedPercent.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Tons (taxa de acerto)</p>
              <p className="font-semibold text-zinc-900">{sessionResult.averageToneAccuracyPercent.toFixed(1)}%</p>
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
