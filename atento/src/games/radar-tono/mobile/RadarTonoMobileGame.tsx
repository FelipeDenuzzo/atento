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

type Phase = "intro" | "running" | "round-feedback" | "result";

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

function toneFrequencyForUi(config: RadarToneRoundConfig): number {
  const avgIntervalMs = (config.toneIntervalMinMs + config.toneIntervalMaxMs) / 2;
  return Math.round(60000 / avgIntervalMs);
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
  lines.push("RESULTADO - RADAR + TONO");
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
  const [remainingMs, setRemainingMs] = useState(ROUND_CONFIGS[0]?.durationMs ?? 0);
  const [dotPosition, setDotPosition] = useState<{ x: number; y: number }>({ x: 180, y: 180 });
  const [redDotPosition, setRedDotPosition] = useState<{ x: number; y: number } | null>(null);
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
  const sessionStartedAtRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  function stopRoundLoop() {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }

  function updatePointerPosition(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    mouseRef.current = { x, y, valid: true };
  }

  function clearMousePosition() {
    mouseRef.current = { x: 0, y: 0, valid: false };
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

    if (mouseRef.current.valid) {
      const distance = Math.hypot(mouseRef.current.x - nextBlackState.x, mouseRef.current.y - nextBlackState.y);
      if (distance <= config.dotRadiusPx + config.hitTolerancePx) {
        trackedMsRef.current += dtMs;
      }
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

    const runtime = startRound(currentConfig);
    roundRuntimeRef.current = runtime;
    radarStateRef.current = runtime.radarInitialState;
    redRadarStateRef.current = currentConfig.hasDistractorSphere
      ? {
          x: currentConfig.arenaSizePx * 0.25,
          y: currentConfig.arenaSizePx * 0.75,
          vx: (currentConfig.distractorBaseSpeedPxPerSec ?? currentConfig.radarSpeedPxPerSec) * Math.cos(Math.PI / 6),
          vy: (currentConfig.distractorBaseSpeedPxPerSec ?? currentConfig.radarSpeedPxPerSec) * Math.sin(Math.PI / 6),
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
    setRemainingMs(currentConfig.durationMs);

    roundStartRef.current = performance.now();
    lastFrameRef.current = roundStartRef.current;
    setPhase("running");
    stopRoundLoop();
    frameRef.current = requestAnimationFrame(processRoundFrame);
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

  function handleToneTouch(key: "j" | "k") {
    if (phase !== "running" || !roundRuntimeRef.current) return;
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
          <h3 className="text-xl font-semibold text-zinc-900">Radar + Tono</h3>
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
            onClick={startCurrentRound}
            className="w-full rounded-lg bg-zinc-900 px-4 py-3 font-semibold text-white hover:bg-zinc-700"
          >
            Iniciar fase
          </button>
        </div>
      )}

      {phase === "running" && currentConfig && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Fase</p>
              <p className="font-semibold text-zinc-900">{roundIndex + 1}/{ROUND_CONFIGS.length}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Tempo restante</p>
              <p className="font-semibold text-zinc-900">{formatClock(remainingMs)}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Tons (ritmo)</p>
              <p className="font-semibold text-zinc-900">~{toneFrequencyForUi(currentConfig)}/min</p>
            </div>
          </div>

          <div className="space-y-3">
            <div
              onPointerDown={updatePointerPosition}
              onPointerMove={updatePointerPosition}
              onPointerUp={clearMousePosition}
              onPointerCancel={clearMousePosition}
              onPointerLeave={clearMousePosition}
              className="relative mx-auto touch-none rounded-lg border border-zinc-300 bg-zinc-50"
              style={{ width: currentConfig.arenaSizePx, height: currentConfig.arenaSizePx }}
            >
              <div
                className="absolute rounded-full bg-zinc-900"
                style={{
                  width: currentConfig.dotRadiusPx * 2,
                  height: currentConfig.dotRadiusPx * 2,
                  left: dotPosition.x - currentConfig.dotRadiusPx,
                  top: dotPosition.y - currentConfig.dotRadiusPx,
                }}
              />
              {redDotPosition && (
                <div
                  className="absolute rounded-full bg-red-600"
                  style={{
                    width: currentConfig.dotRadiusPx * 2,
                    height: currentConfig.dotRadiusPx * 2,
                    left: redDotPosition.x - currentConfig.dotRadiusPx,
                    top: redDotPosition.y - currentConfig.dotRadiusPx,
                  }}
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onPointerDown={() => handleToneTouch("j")}
                className="rounded-lg border border-zinc-300 bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-900"
              >
                Tom grave
              </button>
              <button
                type="button"
                onPointerDown={() => handleToneTouch("k")}
                className="rounded-lg border border-zinc-300 bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-900"
              >
                Tom agudo
              </button>
            </div>
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
