"use client";


import { useEffect, useState, useCallback } from "react";
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

// Estrutura para logar detecções de anomalia
type AnomaliaLog = {
  timestamp: number;
  via: "mouse" | "teclado";
};

// ...existing code...

type Props = {
  basePoints: number;
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

export function ChatVigilanciaErrosGame({ basePoints, reportContext, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [roundIndex, setRoundIndex] = useState(0);
  const [remainingMs, setRemainingMs] = useState(ROUND_CONFIGS[0]?.durationMs ?? 0);
  const [roundLogs, setRoundLogs] = useState<ChatErrorRoundLog[]>([]);
  const [sessionResult, setSessionResult] = useState<ChatErrorSessionResult | null>(null);
  const [perguntaAtual, setPerguntaAtual] = useState<null | { pergunta: string; respostas_certas: string[]; respostas_erradas: string[] }>(null);
  const [opcoes, setOpcoes] = useState<string[]>([]);
  const [respostaSelecionada, setRespostaSelecionada] = useState<string | null>(null);
  const [carregandoPergunta, setCarregandoPergunta] = useState(false);
  const ERROS = ["erro1","erro2","erro3","erro4","erro5","erro6","erro7","erro8","erro9","erro10"];
  const [erroAtivo, setErroAtivo] = useState<string | null>(null);
  const [anomaliaLogs, setAnomaliaLogs] = useState<AnomaliaLog[]>([]);
  const marcarAnomalia = useCallback((via: "mouse" | "teclado") => {
    setAnomaliaLogs((prev) => [...prev, { timestamp: Date.now(), via }]);
  }, []);
  useEffect(() => {
    if (phase !== "running") return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        marcarAnomalia("teclado");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, marcarAnomalia]);
  useEffect(() => {
    if (!erroAtivo) return;
    const timeout = setTimeout(() => setErroAtivo(null), 3000);
    return () => clearTimeout(timeout);
  }, [erroAtivo]);
  function sortearErro() {
    return ERROS[Math.floor(Math.random() * ERROS.length)];
  }
  const temas = [
    { tema: "tema1", arquivo: "pergunta1.json" },
    { tema: "tema2", arquivo: "pergunta2.json" },
    { tema: "tema3", arquivo: "pergunta3.json" },
    { tema: "tema4", arquivo: "pergunta4.json" },
    { tema: "tema5", arquivo: "pergunta5.json" },
    { tema: "tema6", arquivo: "pergunta6.json" },
    { tema: "tema7", arquivo: "pergunta7.json" },
    { tema: "tema8", arquivo: "pergunta8.json" },
  ];
  function shuffle<T>(arr: T[]): T[] {
    return arr.map((item) => ({ item, sort: Math.random() })).sort((a, b) => a.sort - b.sort).map(({ item }) => item);
  }
  function getRandomInt(max: number) {
    return Math.floor(Math.random() * max);
  }
  async function carregarPerguntaAleatoria() {
    setCarregandoPergunta(true);
    setRespostaSelecionada(null);
    try {
      const tema = temas[getRandomInt(temas.length)];
      const url = `/perguntas/${tema.tema}/${tema.arquivo}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("Erro ao buscar pergunta");
      const data = await resp.json();
      if (!Array.isArray(data) || !data[0]) throw new Error("Pergunta inválida");
      const pergunta = data[0];
      if (!pergunta.respostas_certas?.length || !pergunta.respostas_erradas?.length) throw new Error("Pergunta sem respostas válidas");
      const certa = shuffle(pergunta.respostas_certas)[0];
      const erradas = shuffle(pergunta.respostas_erradas).slice(0, 2);
      const opcoesEmbaralhadas = shuffle([certa, ...erradas]);
      setPerguntaAtual(pergunta);
      setOpcoes(opcoesEmbaralhadas as string[]);
      setErroAtivo(sortearErro());
    } catch (e) {
      setPerguntaAtual(null);
      setOpcoes([]);
    }
    setCarregandoPergunta(false);
  }
  useEffect(() => {
    if (phase === "running") {
      carregarPerguntaAleatoria();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);
  function handleClickOpcao(opcao: string) {
    if (respostaSelecionada || carregandoPergunta) return;
    setRespostaSelecionada(opcao);
    setTimeout(() => {
      carregarPerguntaAleatoria();
    }, 1000);
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
    <div className="space-y-5">
      {/* ... JSX do componente ... */}
      {phase === "intro" && (
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
            onClick={() => setPhase("running")}
            className="w-full rounded-lg bg-zinc-900 px-4 py-3 font-semibold text-white hover:bg-zinc-700"
          >
            Iniciar fase
          </button>
        </div>
      )}
      {phase === "running" && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5 relative">
          <h2 className="text-lg font-semibold">Pergunta</h2>
          {carregandoPergunta && <p>Carregando pergunta...</p>}
          {!carregandoPergunta && perguntaAtual && (
            <>
              <p className="mb-2 text-base font-medium">{perguntaAtual.pergunta}</p>
              <div className="grid gap-2">
                {opcoes.map((opcao) => (
                  <button
                    key={opcao}
                    type="button"
                    onClick={() => handleClickOpcao(opcao)}
                    className={`rounded-lg border border-zinc-200 px-3 py-2 text-left text-sm text-black hover:bg-zinc-50 ${
                      respostaSelecionada === opcao ? "bg-blue-100 border-blue-400" : ""
                    }`}
                    disabled={!!respostaSelecionada}
                  >
                    {opcao}
                  </button>
                ))}
              </div>
              {/* ERRO 7: Trovões piscando */}
              {erroAtivo === "erro7" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="animate-erro7 text-yellow-400 text-6xl">⚡⚡⚡⚡⚡</span>
                </div>
              )}
              {/* ERRO 8: Piscar error.png */}
              {erroAtivo === "erro8" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-erro8">
                  <img src="/error/error.png" alt="erro8" className="max-w-xs w-full h-auto" />
                </div>
              )}
              {/* ERRO 9: Piscar error1.png */}
              {erroAtivo === "erro9" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-erro9">
                  <img src="/error/error1.png" alt="erro9" className="max-w-xs w-full h-auto" />
                </div>
              )}
              {/* ERRO 10: Piscar listra.png */}
              {erroAtivo === "erro10" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-erro10">
                  <img src="/error/listra.png" alt="erro10" className="max-w-xs w-full h-auto" />
                </div>
              )}
              <div className="mt-6 flex flex-col items-center">
                <button
                  type="button"
                  className="rounded-lg border-2 border-rose-400 bg-rose-100 px-6 py-3 text-lg font-bold text-rose-700 shadow hover:bg-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  onClick={() => marcarAnomalia("mouse")}
                >
                  Detectar erro/anomalia (Espaço ou clique)
                </button>
              </div>
            </>
          )}
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
            {/* Chat (quantidade) removido pois não há mais tracking de respostas */}
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