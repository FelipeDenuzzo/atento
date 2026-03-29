"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReportContext } from "@/components/AttentionTrainingGame";
import { buildTxtReportFileName } from "@/utils/reportFileName";
import {
  buildRoundLog,
  computeMetrics,
  handleAnomalyKeyPress,
  handleChatResponse,
  startRound,
  updateRuntime,
} from "./logic";
import type {
  AnomalyType,
  ChatErrorRoundConfig,
  ChatErrorRoundLog,
  ChatErrorRoundRuntime,
  ChatErrorSessionResult,
} from "./types";

type Props = {
  basePoints: number;
  startingLevel: number;
  maxLevelHint: number;
  reportContext?: ReportContext;
  onComplete: (result: { success: boolean; pointsEarned: number }) => void;
};

type Phase = "intro" | "running" | "round-feedback" | "result";

const ROUND_CONFIGS: ChatErrorRoundConfig[] = [
  {
    id: 1,
    name: "Fase 1",
    durationMs: 60000,
    messageIntervalMinMs: 4000,
    messageIntervalMaxMs: 6000,
    chatResponseWindowMs: 5000,
    chatOptionsMin: 2,
    chatOptionsMax: 3,
    anomalyIntervalMinMs: 10000,
    anomalyIntervalMaxMs: 15000,
    anomalyVisibleMs: 2200,
  },
  {
    id: 2,
    name: "Fase 2",
    durationMs: 90000,
    messageIntervalMinMs: 3600,
    messageIntervalMaxMs: 5200,
    chatResponseWindowMs: 4300,
    chatOptionsMin: 3,
    chatOptionsMax: 4,
    anomalyIntervalMinMs: 8000,
    anomalyIntervalMaxMs: 12000,
    anomalyVisibleMs: 2000,
  },
  {
    id: 3,
    name: "Fase 3",
    durationMs: 120000,
    messageIntervalMinMs: 3200,
    messageIntervalMaxMs: 4700,
    chatResponseWindowMs: 3600,
    chatOptionsMin: 3,
    chatOptionsMax: 4,
    anomalyIntervalMinMs: 5500,
    anomalyIntervalMaxMs: 8500,
    anomalyVisibleMs: 1700,
  },
  {
    id: 4,
    name: "Fase 4",
    durationMs: 120000,
    messageIntervalMinMs: 2800,
    messageIntervalMaxMs: 4200,
    chatResponseWindowMs: 3200,
    chatOptionsMin: 3,
    chatOptionsMax: 4,
    anomalyIntervalMinMs: 3500,
    anomalyIntervalMaxMs: 6500,
    anomalyVisibleMs: 1500,
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

function buildResultText(result: ChatErrorSessionResult, reportContext?: ReportContext): string {
  const lines: string[] = [];
  const totalAnswered = result.rounds.reduce((sum, round) => sum + round.metrics.chatAnswered, 0);
  const totalCorrect = result.rounds.reduce((sum, round) => sum + round.metrics.chatCorrect, 0);
  lines.push("=" + "=".repeat(60));
  lines.push("RESULTADO - CHAT + VIGILÂNCIA DE ERROS");
  lines.push("=" + "=".repeat(60));
  lines.push("");

  if (reportContext) {
    lines.push(`Escopo: ${reportContext.mode === "sequence" ? "Trilha" : "Jogo individual"} (${reportContext.scopeLabel})`);
    lines.push("");
  }

  lines.push(`Tempo total: ${formatSeconds(result.elapsedMs)}`);
  lines.push(`Dual score médio: ${result.averageDualScore.toFixed(1)}%`);
  lines.push(`Chat (acerto médio): ${result.averageChatAccuracyPercent.toFixed(1)}%`);
  lines.push(`Chat (respondidas): ${totalAnswered}`);
  lines.push(`Chat (respondidas certas): ${totalCorrect}`);
  lines.push(`Vigilância (detecção média): ${result.averageAnomalyDetectionPercent.toFixed(1)}%`);
  lines.push(`Tendência: ${result.trendSummary}`);
  lines.push("");

  result.rounds.forEach((round) => {
    lines.push(round.roundName);
    lines.push(`- Chat: ${round.metrics.chatCorrect}/${round.metrics.chatTotal} (${round.metrics.chatAccuracyPercent.toFixed(1)}%) | tempo médio ${round.metrics.chatMeanResponseMs.toFixed(0)} ms`);
    lines.push(`- Vigilância: detectadas ${round.metrics.anomalyDetected}/${round.metrics.anomalyTotal} (${round.metrics.anomalyDetectionRatePercent.toFixed(1)}%) | reação média ${round.metrics.anomalyMeanReactionMs.toFixed(0)} ms`);
    lines.push(`- Falsos alarmes: ${round.metrics.falseAlarms} | omissões: ${round.metrics.anomalyMissed}`);
    lines.push(`- Conflitos (anomalia com chat ativo): ${round.metrics.conflictCount}`);
    lines.push(`- Dual score: ${round.metrics.dualScore.toFixed(1)}%`);
  });

  lines.push("");
  lines.push(`Finalizado em: ${new Date(result.endedAtIso).toLocaleString("pt-BR")}`);
  return lines.join("\n");
}

export function ChatVigilanciaErrosGame({
  basePoints,
  reportContext,
  onComplete,
}: Props) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [roundIndex, setRoundIndex] = useState(0);
  const [remainingMs, setRemainingMs] = useState(ROUND_CONFIGS[0]?.durationMs ?? 0);
  const [roundLogs, setRoundLogs] = useState<ChatErrorRoundLog[]>([]);
  const [sessionResult, setSessionResult] = useState<ChatErrorSessionResult | null>(null);

  const [chatPrompt, setChatPrompt] = useState<string>("Aguardando próxima mensagem...");
  const [chatOptions, setChatOptions] = useState<Array<{ id: string; text: string }>>([]);
  const [activeAnomalyType, setActiveAnomalyType] = useState<AnomalyType | null>(null);
  const [topBarAlert, setTopBarAlert] = useState(false);

  const totals = useMemo(() => {
    if (!sessionResult) {
      return {
        chatAnswered: 0,
        chatCorrect: 0,
      };
    }

    return sessionResult.rounds.reduce(
      (acc, round) => {
        acc.chatAnswered += round.metrics.chatAnswered;
        acc.chatCorrect += round.metrics.chatCorrect;
        return acc;
      },
      { chatAnswered: 0, chatCorrect: 0 },
    );
  }, [sessionResult]);

  const frameRef = useRef<number | null>(null);
  const roundStartRef = useRef<number>(0);
  const runtimeRef = useRef<ChatErrorRoundRuntime | null>(null);
  const sessionStartedAtRef = useRef<number | null>(null);

  const currentConfig = useMemo(() => ROUND_CONFIGS[roundIndex] ?? ROUND_CONFIGS[0], [roundIndex]);

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, []);

  function stopLoop() {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }

  function syncUiFromRuntime(runtime: ChatErrorRoundRuntime) {
    setChatPrompt(runtime.currentMessage?.prompt ?? "Aguardando próxima mensagem...");
    setChatOptions(
      runtime.currentMessage?.options.map((item) => ({ id: item.id, text: item.text })) ?? [],
    );

    const anomalyType = runtime.activeAnomaly?.type ?? null;
    setActiveAnomalyType(anomalyType);
    setTopBarAlert(anomalyType === "bar-color");
  }

  function runFrame(now: number) {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    const elapsedMs = Math.max(0, now - roundStartRef.current);
    updateRuntime(runtime, elapsedMs);
    syncUiFromRuntime(runtime);

    setRemainingMs(Math.max(0, runtime.config.durationMs - elapsedMs));

    if (elapsedMs >= runtime.config.durationMs) {
      finalizeRound();
      return;
    }

    frameRef.current = requestAnimationFrame(runFrame);
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

    setRemainingMs(currentConfig.durationMs);
    syncUiFromRuntime(runtime);

    roundStartRef.current = performance.now();
    setPhase("running");
    stopLoop();
    frameRef.current = requestAnimationFrame(runFrame);
  }

  function finalizeRound() {
    stopLoop();

    const runtime = runtimeRef.current;
    if (!runtime) return;

    const endedAtMs = Date.now();

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

  function chooseOption(optionId: string) {
    const runtime = runtimeRef.current;
    if (!runtime || phase !== "running") return;

    const elapsedMs = Math.max(0, performance.now() - roundStartRef.current);
    const response = handleChatResponse({
      runtime,
      optionId,
      atMs: elapsedMs,
    });

    if (!response.accepted) return;
    syncUiFromRuntime(runtime);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (phase !== "running") return;
      if (event.code !== "Space") return;
      if (event.repeat) return;

      event.preventDefault();

      const runtime = runtimeRef.current;
      if (!runtime) return;

      const elapsedMs = Math.max(0, performance.now() - roundStartRef.current);
      handleAnomalyKeyPress({ runtime, atMs: elapsedMs });
      syncUiFromRuntime(runtime);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
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
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5 text-left text-black">
          <p>Você terá <strong>duas tarefas ao mesmo tempo</strong>:</p>
          <p>
            💬 <strong>Tarefa de chat</strong> → leia mensagens curtas que aparecem na tela e escolha a resposta mais adequada entre as opções apresentadas
            <br />
            👁️ <strong>Tarefa de vigilância</strong> → ao mesmo tempo, fique atento ao fundo da tela e clique imediatamente quando aparecer uma <strong>anomalia visual</strong> — como um ícone proibido, uma cor errada ou um alerta
          </p>
          <p>Sua pontuação depende do desempenho nas <strong>duas tarefas juntas</strong>. Focar demais em uma e ignorar a outra reduz sua pontuação. A cada fase, as mensagens ficam mais complexas e as anomalias mais sutis.</p>
          <button
            type="button"
            onClick={startCurrentRound}
            className="w-full rounded-lg bg-zinc-900 px-4 py-3 font-semibold text-white hover:bg-zinc-700"
          >
            Iniciar fase
          </button>
        </div>
      )}
      )

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

          <div
            className={`relative overflow-hidden rounded-lg border border-black/10 p-4 ${
              activeAnomalyType ? "bg-rose-50" : "bg-zinc-100"
            }`}
          >
            <div className={`mb-3 h-2 rounded-full ${topBarAlert ? "bg-rose-500" : "bg-zinc-300"}`} />

            <div className="mb-3 rounded-lg border border-black/10 bg-white/80 px-3 py-2 text-xs font-semibold text-zinc-700">
              {activeAnomalyType
                ? `ANOMALIA ATIVA: ${
                    activeAnomalyType === "prohibited-icon"
                      ? "Ícone proibido"
                      : activeAnomalyType === "bar-color"
                        ? "Mudança de cor da barra"
                        : "Símbolo de alerta"
                  } — pressione ESPAÇO`
                : "Sem anomalia ativa"}
            </div>

            <div className="relative mx-auto max-w-xl rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Mensagem ativa</p>
              <p className="mt-2 text-sm font-medium text-zinc-900">{chatPrompt}</p>

              <div className="mt-4 grid gap-2">
                {chatOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => chooseOption(option.id)}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50"
                  >
                    {option.text}
                  </button>
                ))}
                {chatOptions.length === 0 && (
                  <p className="rounded-lg border border-dashed border-zinc-200 px-3 py-3 text-sm text-zinc-500">
                    Aguardando próxima mensagem...
                  </p>
                )}
              </div>
            </div>

            {activeAnomalyType === "prohibited-icon" && (
              <div className="absolute right-4 top-16 rounded-md border-2 border-rose-500 bg-rose-100 px-3 py-2 text-base font-bold text-rose-700 shadow-sm">
                ⛔ PROIBIDO
              </div>
            )}

            {activeAnomalyType === "alert-flash" && (
              <div className="absolute bottom-4 left-4 animate-pulse rounded-md border-2 border-amber-400 bg-amber-100 px-3 py-2 text-sm font-bold text-amber-700 shadow-sm">
                ⚠ ALERTA VISUAL
              </div>
            )}

            <p className="mt-4 text-xs text-zinc-600">Pressione ESPAÇO quando detectar anomalia visual no fundo.</p>
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
              <p className="text-xs text-zinc-500">Chat (acerto)</p>
              <p className="font-semibold text-zinc-900">{sessionResult.averageChatAccuracyPercent.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Vigilância (detecção)</p>
              <p className="font-semibold text-zinc-900">{sessionResult.averageAnomalyDetectionPercent.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3 sm:col-span-3">
              <p className="text-xs text-zinc-500">Chat (quantidade)</p>
              <p className="font-semibold text-zinc-900">
                Respondidas: {totals.chatAnswered} | respondidas certas: {totals.chatCorrect}
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
