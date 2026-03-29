"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReportContext } from "@/components/AttentionTrainingGame";
import { buildTxtReportFileName } from "@/utils/reportFileName";
import {
  buildRoundLog,
  computeMetrics,
  handleKeyDown,
  isMarkerInsideGreen,
  startRound,
  stopRound,
  updateFrame,
} from "./logic";
import type {
  DriveWordRoundConfig,
  DriveWordRoundLog,
  DriveWordRoundRuntime,
  DriveWordSessionResult,
} from "./types";

type Props = {
  basePoints: number;
  startingLevel: number;
  maxLevelHint: number;
  reportContext?: ReportContext;
  onComplete: (result: { success: boolean; pointsEarned: number }) => void;
};

type Phase = "intro" | "running" | "round-feedback" | "result";

const WORD_SET = [
  "CASA",
  "RUA",
  "AZUL",
  "PORTA",
  "LIVRO",
  "PONTE",
  "NORTE",
  "CAMPO",
  "VIDRO",
  "LUZ",
  "SOM",
  "COR",
  "LINHA",
  "PONTO",
  "MESA",
  "TELA",
];

const ROUND_CONFIGS: DriveWordRoundConfig[] = [
  {
    id: 1,
    name: "Fase 1",
    durationMs: 60000,
    arenaWidthPx: 380,
    arenaHeightPx: 460,
    bandWidthPx: 240,
    greenZoneRatio: 0.58,
    markerWidthPx: 26,
    markerMaxSpeedPxPerSec: 210,
    markerAccelerationPxPerSec2: 620,
    markerFrictionPerSec: 5,
    bandMaxSpeedPxPerSec: 95,
    bandAccelerationPxPerSec2: 120,
    earlyReturnChance: 0.2,
    greenMaxSpeedPxPerSec: 72,
    greenAccelerationPxPerSec2: 95,
    greenEarlyReturnChance: 0.25,
    responseLineTolerancePx: 20,
    spawnMinMs: 1200,
    spawnMaxMs: 1800,
    targetProbability: 0.22,
    blockFallMinPxPerSec: 95,
    blockFallMaxPxPerSec: 125,
    words: WORD_SET,
    targetWord: "AZUL",
  },
  {
    id: 2,
    name: "Fase 2",
    durationMs: 90000,
    arenaWidthPx: 380,
    arenaHeightPx: 460,
    bandWidthPx: 240,
    greenZoneRatio: 0.48,
    markerWidthPx: 26,
    markerMaxSpeedPxPerSec: 235,
    markerAccelerationPxPerSec2: 680,
    markerFrictionPerSec: 5.3,
    bandMaxSpeedPxPerSec: 120,
    bandAccelerationPxPerSec2: 155,
    earlyReturnChance: 0.35,
    greenMaxSpeedPxPerSec: 95,
    greenAccelerationPxPerSec2: 130,
    greenEarlyReturnChance: 0.3,
    responseLineTolerancePx: 18,
    spawnMinMs: 1000,
    spawnMaxMs: 1500,
    targetProbability: 0.24,
    blockFallMinPxPerSec: 105,
    blockFallMaxPxPerSec: 140,
    words: WORD_SET,
    targetWord: "PORTA",
  },
  {
    id: 3,
    name: "Fase 3",
    durationMs: 120000,
    arenaWidthPx: 380,
    arenaHeightPx: 460,
    bandWidthPx: 240,
    greenZoneRatio: 0.266,
    markerWidthPx: 26,
    markerMaxSpeedPxPerSec: 255,
    markerAccelerationPxPerSec2: 740,
    markerFrictionPerSec: 5.5,
    bandMaxSpeedPxPerSec: 145,
    bandAccelerationPxPerSec2: 205,
    earlyReturnChance: 0.5,
    greenMaxSpeedPxPerSec: 165,
    greenAccelerationPxPerSec2: 260,
    greenEarlyReturnChance: 0.55,
    responseLineTolerancePx: 16,
    spawnMinMs: 900,
    spawnMaxMs: 1300,
    targetProbability: 0.2,
    blockFallMinPxPerSec: 115,
    blockFallMaxPxPerSec: 155,
    words: WORD_SET,
    targetWord: "RUA",
  },
  {
    id: 4,
    name: "Fase 4",
    durationMs: 120000,
    arenaWidthPx: 380,
    arenaHeightPx: 460,
    bandWidthPx: 240,
    greenZoneRatio: 0.21,
    markerWidthPx: 26,
    markerMaxSpeedPxPerSec: 275,
    markerAccelerationPxPerSec2: 800,
    markerFrictionPerSec: 5.7,
    bandMaxSpeedPxPerSec: 175,
    bandAccelerationPxPerSec2: 280,
    earlyReturnChance: 0.65,
    greenMaxSpeedPxPerSec: 210,
    greenAccelerationPxPerSec2: 340,
    greenEarlyReturnChance: 0.65,
    responseLineTolerancePx: 14,
    spawnMinMs: 800,
    spawnMaxMs: 1700,
    targetProbability: 0.26,
    blockFallMinPxPerSec: 125,
    blockFallMaxPxPerSec: 170,
    words: WORD_SET,
    targetWord: "LUZ",
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

function playFeedbackTone(type: "positive" | "negative") {
  if (typeof window === "undefined") return;
  const Ctx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;

  const audioContext = new Ctx();
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = "sine";
  osc.frequency.value = type === "positive" ? 860 : 220;
  gain.gain.value = 0.05;
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start();
  osc.stop(audioContext.currentTime + 0.08);
  window.setTimeout(() => {
    audioContext.close();
  }, 120);
}

function startContinuousErrorTone(params: {
  audioContextRef: React.MutableRefObject<AudioContext | null>;
  oscillatorRef: React.MutableRefObject<OscillatorNode | null>;
  gainRef: React.MutableRefObject<GainNode | null>;
}) {
  if (typeof window === "undefined") return;
  if (params.oscillatorRef.current) return;

  const Ctx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;

  if (!params.audioContextRef.current) {
    params.audioContextRef.current = new Ctx();
  }

  const audioContext = params.audioContextRef.current;
  if (!audioContext) return;

  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = "sine";
  osc.frequency.value = 170;
  gain.gain.value = 0.03;
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start();

  params.oscillatorRef.current = osc;
  params.gainRef.current = gain;
}

function stopContinuousErrorTone(params: {
  oscillatorRef: React.MutableRefObject<OscillatorNode | null>;
  gainRef: React.MutableRefObject<GainNode | null>;
}) {
  if (!params.oscillatorRef.current) return;

  try {
    params.oscillatorRef.current.stop();
  } catch {
    // no-op
  }

  params.oscillatorRef.current.disconnect();
  params.gainRef.current?.disconnect();
  params.oscillatorRef.current = null;
  params.gainRef.current = null;
}

function buildResultText(result: DriveWordSessionResult, reportContext?: ReportContext): string {
  const lines: string[] = [];
  lines.push("=" + "=".repeat(60));
  lines.push("RESULTADO - DIRIJA + PALAVRAS-ALVO");
  lines.push("=" + "=".repeat(60));
  lines.push("");

  if (reportContext) {
    lines.push(`Escopo: ${reportContext.mode === "sequence" ? "Trilha" : "Jogo individual"} (${reportContext.scopeLabel})`);
    lines.push("");
  }

  lines.push(`Tempo total: ${formatSeconds(result.elapsedMs)}`);
  lines.push(`Dual score médio: ${result.averageDualScore.toFixed(1)}%`);
  lines.push(`Faixa (médio dentro): ${result.averageInsidePercent.toFixed(1)}%`);
  lines.push(`Palavras (média de acerto): ${result.averageHitRatePercent.toFixed(1)}%`);
  lines.push(`Tendência: ${result.trendSummary}`);
  lines.push("");

  result.rounds.forEach((round) => {
    lines.push(round.roundName);
    lines.push(`- Dentro da faixa: ${round.metrics.insidePercent.toFixed(1)}% (${formatSeconds(round.metrics.insideMs)})`);
    lines.push(`- Fora da faixa: ${formatSeconds(round.metrics.outsideMs)}`);
    lines.push(`- Blocos: ${round.metrics.totalBlocks} | alvos ${round.metrics.targetBlocks}`);
    lines.push(`- Acertos com ESPAÇO: ${round.metrics.hits}`);
    lines.push(`- Acertos com ESPAÇO + cursor na área verde: ${round.metrics.hitsInsideGreen}`);
    lines.push(`- Espaço em palavra errada: ${round.metrics.falsePositives}`);
    lines.push(`- Omissões: ${round.metrics.omissions}`);
    lines.push(`- Taxa de acerto geral: ${round.metrics.hitRatePercent.toFixed(1)}%`);
    lines.push(`- Taxa de acerto qualificado (na área verde): ${round.metrics.hitInsideGreenRatePercent.toFixed(1)}%`);
    lines.push(`- Dual score: ${round.metrics.dualScore.toFixed(1)}%`);
  });

  lines.push("");
  lines.push(`Finalizado em: ${new Date(result.endedAtIso).toLocaleString("pt-BR")}`);
  return lines.join("\n");
}

export function DirijaPalavrasAlvoGame({
  basePoints,
  reportContext,
  onComplete,
}: Props) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [roundIndex, setRoundIndex] = useState(0);
  const [remainingMs, setRemainingMs] = useState(ROUND_CONFIGS[0]?.durationMs ?? 0);
  const [bandCenterX, setBandCenterX] = useState((ROUND_CONFIGS[0]?.arenaWidthPx ?? 380) / 2);
  const [greenCenterX, setGreenCenterX] = useState((ROUND_CONFIGS[0]?.arenaWidthPx ?? 380) / 2);
  const [markerX, setMarkerX] = useState((ROUND_CONFIGS[0]?.arenaWidthPx ?? 380) / 2);
  const [renderBlocks, setRenderBlocks] = useState<DriveWordRoundRuntime["activeBlocks"]>([]);
  const [roundLogs, setRoundLogs] = useState<DriveWordRoundLog[]>([]);
  const [sessionResult, setSessionResult] = useState<DriveWordSessionResult | null>(null);

  const currentConfig = useMemo(
    () => ROUND_CONFIGS[roundIndex] ?? ROUND_CONFIGS[0],
    [roundIndex],
  );

  const frameRef = useRef<number | null>(null);
  const roundStartRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const lastSampleAtRef = useRef<number>(0);
  const runtimeRef = useRef<DriveWordRoundRuntime | null>(null);
  const sessionStartedAtRef = useRef<number | null>(null);
  const wasInsideGreenRef = useRef<boolean>(true);
  const errorAudioContextRef = useRef<AudioContext | null>(null);
  const errorOscillatorRef = useRef<OscillatorNode | null>(null);
  const errorGainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    return () => {
      stopContinuousErrorTone({
        oscillatorRef: errorOscillatorRef,
        gainRef: errorGainRef,
      });
      if (errorAudioContextRef.current) {
        errorAudioContextRef.current.close();
      }
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

    const frame = updateFrame({
      runtime,
      elapsedMs,
      dtMs,
      nowMs: now,
      sampleIntervalMs: 100,
      lastSampleAtMs: lastSampleAtRef.current,
    });

    lastSampleAtRef.current = frame.lastSampleAtMs;

    setBandCenterX(runtime.bandCenterX);
    setGreenCenterX(runtime.bandCenterX + runtime.greenOffsetX);
    setMarkerX(runtime.markerX);
    setRenderBlocks(runtime.activeBlocks);
    setRemainingMs(Math.max(0, runtime.config.durationMs - elapsedMs));

    if (wasInsideGreenRef.current && !frame.insideBand) {
      playFeedbackTone("negative");
      startContinuousErrorTone({
        audioContextRef: errorAudioContextRef,
        oscillatorRef: errorOscillatorRef,
        gainRef: errorGainRef,
      });
    }

    if (!wasInsideGreenRef.current && frame.insideBand) {
      stopContinuousErrorTone({
        oscillatorRef: errorOscillatorRef,
        gainRef: errorGainRef,
      });
    }
    wasInsideGreenRef.current = frame.insideBand;

    if (frame.finished) {
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

    setBandCenterX(runtime.bandCenterX);
    setGreenCenterX(runtime.bandCenterX + runtime.greenOffsetX);
    setMarkerX(runtime.markerX);
    setRenderBlocks([]);
    setRemainingMs(currentConfig.durationMs);
    wasInsideGreenRef.current = true;

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
    stopContinuousErrorTone({
      oscillatorRef: errorOscillatorRef,
      gainRef: errorGainRef,
    });
    runtimeRef.current = stopRound(runtime);

    const roundLog = buildRoundLog({
      runtime,
      roundNumber: roundIndex + 1,
      startedAtIso: new Date(endedAtMs - runtime.config.durationMs).toISOString(),
      endedAtIso: new Date(endedAtMs).toISOString(),
    });

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
      if (phase !== "running" || !runtimeRef.current) return;

      if (event.code === "Space") {
        event.preventDefault();
        if (event.repeat) return;
      }

      const elapsedMs = Math.max(0, performance.now() - roundStartRef.current);
      const resolved = handleKeyDown({
        runtime: runtimeRef.current,
        key: event.key,
        code: event.code,
        atMs: elapsedMs,
        responseLineY: runtimeRef.current.config.arenaHeightPx / 2,
      });

      if (resolved.hit) {
        if (isMarkerInsideGreen(runtimeRef.current)) {
          runtimeRef.current.hitsInsideGreen += 1;
        }
        playFeedbackTone("positive");
      }
    }

    function onKeyUp(event: KeyboardEvent) {
      const runtime = runtimeRef.current;
      if (!runtime) return;

      const key = event.key.toLowerCase();
      if (key === "arrowleft" || key === "a") {
        runtime.input.leftPressed = false;
      }

      if (key === "arrowright" || key === "d") {
        runtime.input.rightPressed = false;
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
    const pointsEarned = Math.round(
      basePoints * Math.min(1, sessionResult.averageDualScore / 100),
    );
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
          <div className="space-y-3 text-zinc-700 text-sm">
            <p>
              Neste exercício, você precisa fazer duas coisas ao mesmo tempo:
              <strong>“dirigir” o marcador</strong> dentro de uma faixa móvel
              e <strong>prestar atenção nas palavras</strong> que caem dos lados da tela.
            </p>
            <p>
              Use o teclado para manter o marcador dentro da <strong>área verde</strong> na parte de baixo,
              enquanto observa as palavras que descem pelas laterais.
              Aperte a <strong>barra de espaço</strong> apenas quando a
              <strong>palavra-alvo</strong> aparecer na <strong>linha horizontal do meio</strong>.
            </p>
            <p>
              À medida que as fases avançam, a faixa se move mais,
              a área verde fica menor e as palavras aparecem mais rápido,
              deixando o desafio mais intenso para <strong>dividir o foco sem perder a precisão</strong>.
            </p>
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
              <p className="font-semibold text-zinc-900">
                {roundIndex + 1}/{ROUND_CONFIGS.length}
              </p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Tempo restante</p>
              <p className="font-semibold text-zinc-900">{formatClock(remainingMs)}</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-zinc-700">
              Palavra-alvo: <span className="font-semibold text-zinc-900">{currentConfig.targetWord}</span>
            </p>

            <div
              className="relative mx-auto overflow-hidden rounded-lg border border-zinc-300 bg-zinc-100"
              style={{ width: currentConfig.arenaWidthPx, height: currentConfig.arenaHeightPx }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.22)_1px,transparent_1px)] bg-[length:100%_24px]" />

              <div
                className="absolute left-0 right-0 border-t-2 border-emerald-500/80"
                style={{ top: currentConfig.arenaHeightPx / 2 }}
              />

              <div
                className="absolute bottom-5 h-10 rounded-md border border-zinc-500/60 bg-zinc-300/65"
                style={{
                  width: currentConfig.bandWidthPx,
                  left: bandCenterX - currentConfig.bandWidthPx / 2,
                }}
              >
                <div
                  className="absolute inset-y-0 rounded-md bg-emerald-500/45"
                  style={{
                    width: currentConfig.bandWidthPx * currentConfig.greenZoneRatio,
                    left:
                      greenCenterX -
                      (bandCenterX - currentConfig.bandWidthPx / 2) -
                      (currentConfig.bandWidthPx * currentConfig.greenZoneRatio) / 2,
                  }}
                />
              </div>

              <div
                className="absolute bottom-[30px] rounded-md bg-zinc-900"
                style={{
                  width: currentConfig.markerWidthPx,
                  height: 18,
                  left: markerX - currentConfig.markerWidthPx / 2,
                }}
              />

              {renderBlocks.map((block) => (
                <div
                  key={block.id}
                  className="absolute rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-bold text-zinc-800 shadow-sm"
                  style={{
                    top: block.y,
                    left: block.side === "left" ? 10 : undefined,
                    right: block.side === "right" ? 10 : undefined,
                  }}
                >
                  {block.word}
                </div>
              ))}
            </div>

            <p className="text-xs text-zinc-600">
              Controles: ←/→ ou A/D para marcador | Espaço para palavra-alvo
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
              <p className="text-xs text-zinc-500">Faixa (dentro)</p>
              <p className="font-semibold text-zinc-900">{sessionResult.averageInsidePercent.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Palavras (acerto)</p>
              <p className="font-semibold text-zinc-900">{sessionResult.averageHitRatePercent.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3 sm:col-span-3">
              <p className="text-xs text-zinc-500">Detalhes da última fase</p>
              <p className="font-semibold text-zinc-900">
                Acertos com ESPAÇO: {sessionResult.rounds[sessionResult.rounds.length - 1]?.metrics.hits ?? 0} | 
                acertos com cursor na área verde: {sessionResult.rounds[sessionResult.rounds.length - 1]?.metrics.hitsInsideGreen ?? 0} | 
                espaço em palavra errada: {sessionResult.rounds[sessionResult.rounds.length - 1]?.metrics.falsePositives ?? 0}
              </p>
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
