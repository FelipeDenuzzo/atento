// (Removido: useEffect duplicado fora do componente)
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
} from "./logic";
import type {
  RadarState,
  RadarToneRoundConfig,
  RadarToneRoundLog,
  RadarToneRoundRuntime,
  RadarToneSessionResult,
  ToneEvent,
  ToneType,
} from "./types";

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
    toneIntervalMinMs: 2500,
    toneIntervalMaxMs: 3500,
    toneProbabilityAgudo: 0.5,
    responseWindowMinMs: 0,
    responseWindowMaxMs: 2000,
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
    toneIntervalMinMs: 2500,
    toneIntervalMaxMs: 3500,
    toneProbabilityAgudo: 0.5,
    responseWindowMinMs: 0,
    responseWindowMaxMs: 2000,
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
    toneIntervalMinMs: 2500,
    toneIntervalMaxMs: 3500,
    toneProbabilityAgudo: 0.5,
    responseWindowMinMs: 0,
    responseWindowMaxMs: 2000,
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
    toneIntervalMinMs: 2500,
    toneIntervalMaxMs: 3500,
    toneProbabilityAgudo: 0.5,
    responseWindowMinMs: 0,
    responseWindowMaxMs: 2000,
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


export function RadarTonoGame({ basePoints, reportContext, onComplete }: Props) {
  // O controle de fase (intro, instrução, etc) será feito externamente
  const [phase, setPhase] = useState<Phase>("running");
  const [roundIndex, setRoundIndex] = useState(0);
  const [remainingMs, setRemainingMs] = useState(ROUND_CONFIGS[0]?.durationMs ?? 0);
  const [dotPosition, setDotPosition] = useState<{ x: number; y: number }>({ x: 180, y: 180 });
  const [isHoveringDot, setIsHoveringDot] = useState(false);
  const [redDotPosition, setRedDotPosition] = useState<{ x: number; y: number } | null>(null);
  const [roundLogs, setRoundLogs] = useState<RadarToneRoundLog[]>([]);
  const [sessionResult, setSessionResult] = useState<RadarToneSessionResult | null>(null);
  // Estado para régua visual da janela de resposta
  const [responseWindow, setResponseWindow] = useState<{ open: boolean; startedAt: number; remaining: number }>({ open: false, startedAt: 0, remaining: 0 });

  // Inicia o round automaticamente ao montar ou mudar de round
  useEffect(() => {
    startCurrentRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIndex]);

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

  function updateMousePosition(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    mouseRef.current = { x, y, valid: true };
    // Verifica se o mouse está sobre a esfera preta
    const distance = Math.hypot(x - dotPosition.x, y - dotPosition.y);
    if (distance <= currentConfig.dotRadiusPx + currentConfig.hitTolerancePx) {
      setIsHoveringDot(true);
    } else {
      setIsHoveringDot(false);
    }
  }

  function clearMousePosition() {
    mouseRef.current = { x: 0, y: 0, valid: false };
    setIsHoveringDot(false);
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
    let responseWindowOpened = false;
    const updatedTones = tonesRef.current.map((tone) => {
      if (!tone.played && elapsedMs >= tone.startAtMs) {
        playTone(audioContextRef.current, tone.type);
        changed = true;
        responseWindowOpened = true;
        return { ...tone, played: true, responseWindowStartedAt: now };
      }
      return tone;
    });

    if (changed) {
      tonesRef.current = updatedTones;
    }

    // Controle da régua visual da janela de resposta
   // Controle da régua visual da janela de resposta
const activeTone = tonesRef.current.find((tone) => {
  const startedAt = tone.responseWindowStartedAt;

  return (
    tone.played &&
    tone.response === undefined &&
    startedAt !== undefined &&
    now - startedAt < config.responseWindowMaxMs
  );
});

if (activeTone && activeTone.responseWindowStartedAt !== undefined) {
  const startedAt = activeTone.responseWindowStartedAt;

  setResponseWindow({
    open: true,
    startedAt,
    remaining: Math.max(
      0,
      config.responseWindowMaxMs - (now - startedAt)
    ),
  });
} else {
  setResponseWindow((prev) =>
    prev.open ? { open: false, startedAt: 0, remaining: 0 } : prev
  );
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

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (phase !== "running" || !roundRuntimeRef.current) return;
      if (event.repeat) return;

      const letterKey = normalizeLetterKey(event);
      if (!letterKey) return;

      const elapsedMs = Math.max(0, performance.now() - roundStartRef.current);
      const handled = handleKeyPress({
        key: letterKey,
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

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase]);

  function nextRound() {
    setRoundIndex((prev) => prev + 1);
    setPhase("running");
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

  // O componente agora só renderiza o exercício, sem instruções/tela inicial/resultados popup
  return (
    <div className="space-y-5">
      {phase === "round-feedback" ? (
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
      ) : (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5">
          <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Tempo restante</p>
              <p className="font-semibold text-zinc-900">{formatClock(remainingMs)}</p>
          </div>
          {/* Régua visual da janela de resposta */}
          {responseWindow.open && (
            <div className="w-full h-3 bg-zinc-200 rounded-lg overflow-hidden mb-2">
              <div
                className="h-full bg-blue-500 transition-all duration-100"
                style={{ width: `${(responseWindow.remaining / 2000) * 100}%` }}
              />
              <span className="absolute left-1/2 -translate-x-1/2 text-xs text-blue-900 font-semibold" style={{top: '-1.5rem'}}>
                Janela de resposta aberta ({(responseWindow.remaining / 1000).toFixed(2)}s)
              </span>
            </div>
          )}
          <div className="space-y-3">
            <div
              onMouseMove={updateMousePosition}
              onMouseLeave={clearMousePosition}
              className="relative mx-auto rounded-lg border border-zinc-300 bg-zinc-50"
              style={{ width: currentConfig.arenaSizePx, height: currentConfig.arenaSizePx }}
            >
              {/* Área sensível: dobro do tamanho da esfera */}
              <div
                className="absolute rounded-full border-2 border-blue-300 opacity-30 pointer-events-none"
                style={{
                  width: currentConfig.dotRadiusPx * 4,
                  height: currentConfig.dotRadiusPx * 4,
                  left: dotPosition.x - currentConfig.dotRadiusPx * 2,
                  top: dotPosition.y - currentConfig.dotRadiusPx * 2,
                  zIndex: 1,
                }}
              />
              {/* Feedback verde ao passar o mouse */}
              {isHoveringDot && (
                <div
                  className="absolute rounded-full border-4 border-green-500 pointer-events-none animate-pulse"
                  style={{
                    width: currentConfig.dotRadiusPx * 2.6,
                    height: currentConfig.dotRadiusPx * 2.6,
                    left: dotPosition.x - currentConfig.dotRadiusPx * 1.3,
                    top: dotPosition.y - currentConfig.dotRadiusPx * 1.3,
                    zIndex: 3,
                    boxShadow: '0 0 12px 4px #22c55e55',
                  }}
                />
              )}
              {/* Esfera central */}
              <div
                className="absolute rounded-full bg-zinc-900"
                style={{
                  width: currentConfig.dotRadiusPx * 2,
                  height: currentConfig.dotRadiusPx * 2,
                  left: dotPosition.x - currentConfig.dotRadiusPx,
                  top: dotPosition.y - currentConfig.dotRadiusPx,
                  zIndex: 2,
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
            <p className="text-xs text-zinc-600">
              Grave = J | Agudo = K
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
