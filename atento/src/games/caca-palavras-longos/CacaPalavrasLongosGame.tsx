"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReportContext } from "@/components/AttentionTrainingGame";
import { buildTxtReportFileName } from "@/utils/reportFileName";
import {
  computeMetrics,
  generateGrid,
  handleSelection,
} from "./logic";
import {
  WordSearchRound,
  WordSearchRoundConfig,
  WordSearchRoundLog,
  WordSearchSessionResult,
} from "./types";

type Props = {
  basePoints: number;
  startingLevel: number;
  maxLevelHint: number;
  reportContext?: ReportContext;
  onComplete: (result: { success: boolean; pointsEarned: number }) => void;
  hideInGameInfo?: boolean;
};

type Phase = "intro" | "running" | "round-feedback" | "result";

type RoundPreset = Omit<WordSearchRoundConfig, "seed"> & {
  id: number;
};

const ROUND_PRESETS: RoundPreset[] = [
  {
    id: 1,
    size: 12,
    words: ["ATENCAO", "CONSTANTE", "PERSISTENCIA", "MONOTONIA", "VIGILANCIA", "RESISTENCIA", "CONTINUIDADE", "CONCENTRAR", "PACIENCIA", "ESTABILIDADE"],
    allowedDirections: ["H", "V"],
    allowReverse: false,
  },
  {
    id: 2,
    size: 14,
    words: ["FOCALIZACAO", "MANUTENCAO", "DISCIPLINA", "PRECISAO", "RITMICO", "IMERSAO", "SUSTENTADA", "ATIVACAO", "REGULARIDADE", "RESOLUCAO", "DETECCAO", "CONTROLE"],
    allowedDirections: ["H", "V", "D"],
    allowReverse: false,
  },
  {
    id: 3,
    size: 18,
    words: ["PROCESSAMENTO", "SEQUENCIAMENTO", "OBSERVACAO", "DESEMPENHO", "CONTEMPLACAO", "LONGITUDINAL", "ALINHAMENTO", "ORIENTACAO", "EXATIDAO", "SELETOR", "ATIVIDADE", "CAPACIDADE", "INIBICAO", "PRESENCA", "CONTINUA"],
    allowedDirections: ["H", "V", "D"],
    allowReverse: true,
  },
  {
    id: 4,
    size: 20,
    words: ["AUTORREGULACAO", "SUSTENTABILIDADE", "PERSEVERANCA", "AUTOMONITORAMENTO", "CONFIABILIDADE", "DIRECIONAMENTO", "SINCRONIZACAO", "NEUROADAPTACAO", "CONSOLIDACAO", "ATENCAOFOCAL", "ESTABILIZACAO", "ORGANIZACAO", "PROCESSUAL", "MANUTENCAO", "QUALIDADE", "CONSISTENCIA", "ROBUSTEZ", "DETERMINACAO"],
    allowedDirections: ["H", "V", "D"],
    allowReverse: true,
  },
];

function formatClock(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function pathKey(path: Array<{ row: number; col: number }>): string {
  return path.map((item) => `${item.row}:${item.col}`).join("|");
}

function buildResultText(result: WordSearchSessionResult, reportContext?: ReportContext): string {
  const lines: string[] = [];
  lines.push("=" + "=".repeat(60));
  lines.push("RESULTADO - CAÇA-PALAVRAS LONGOS");
  lines.push("=" + "=".repeat(60));
  lines.push("");

  if (reportContext) {
    lines.push(`Escopo: ${reportContext.mode === "sequence" ? "Trilha" : "Jogo individual"} (${reportContext.scopeLabel})`);
    lines.push("");
  }

  lines.push(`Tempo total: ${(result.elapsedMs / 1000).toFixed(1)} s`);
  lines.push(`Palavras encontradas: ${result.wordsFoundTotal}/${result.wordsTotal}`);
  lines.push(`Tentativas inválidas: ${result.totalInvalidSelections}`);
  lines.push(`Tempo médio por palavra: ${(result.avgWordTimeMs / 1000).toFixed(2)} s`);
  lines.push(result.summaryText);
  lines.push("");

  result.rounds.forEach((round) => {
    lines.push(`Rodada ${round.roundNumber} (${round.size}x${round.size})`);
    lines.push(`- Encontradas: ${round.wordsFound}/${round.wordsTotal}`);
    lines.push(`- Erros de seleção: ${round.invalidSelections}`);
    lines.push(`- Tempo: ${(round.elapsedMs / 1000).toFixed(1)} s`);
  });

  lines.push("");
  lines.push(`Finalizado em: ${new Date(result.endedAtIso).toLocaleString("pt-BR")}`);

  return lines.join("\n");
}

export function CacaPalavrasLongosGame({ basePoints, reportContext, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [roundIndex, setRoundIndex] = useState(0);
  const [round, setRound] = useState<WordSearchRound | null>(null);
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [highlightPaths, setHighlightPaths] = useState<string[]>([]);
  const [previewPath, setPreviewPath] = useState<Array<{ row: number; col: number }>>([]);
  const [invalidSelections, setInvalidSelections] = useState(0);
  const [wrongAttemptsSinceLastHit, setWrongAttemptsSinceLastHit] = useState(0);
  const [foundWordLogs, setFoundWordLogs] = useState<Array<{ word: string; foundAtMs: number; wrongAttemptsBeforeHit: number }>>([]);
  const [roundLogs, setRoundLogs] = useState<WordSearchRoundLog[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [sessionResult, setSessionResult] = useState<WordSearchSessionResult | null>(null);

  const selectingRef = useRef(false);
  const startCellRef = useRef<{ row: number; col: number } | null>(null);
  const sessionStartedAtRef = useRef<number | null>(null);
  const roundStartedAtRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentWords = useMemo(() => round?.config.words ?? [], [round]);

  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function startTimer() {
    clearTimer();
    timerRef.current = setInterval(() => {
      if (!sessionStartedAtRef.current) return;
      setElapsedMs(Date.now() - sessionStartedAtRef.current);
    }, 200);
  }

  function startRound(index: number) {
    const preset = ROUND_PRESETS[index] ?? ROUND_PRESETS[0];
    const generated = generateGrid({
      ...preset,
      seed: `caca-${Date.now()}-${index}-${Math.random()}`,
    });

    setRound(generated);
    setRoundIndex(index);
    setFoundWords(new Set());
    setHighlightPaths([]);
    setPreviewPath([]);
    setInvalidSelections(0);
    setWrongAttemptsSinceLastHit(0);
    setFoundWordLogs([]);
    selectingRef.current = false;
    startCellRef.current = null;
    roundStartedAtRef.current = Date.now();
    setPhase("running");
  }

  function startSession() {
    const now = Date.now();
    sessionStartedAtRef.current = now;
    roundStartedAtRef.current = now;
    setElapsedMs(0);
    setRoundLogs([]);
    setSessionResult(null);
    startRound(0);
    startTimer();
  }

  function finishRound(goNext: boolean) {
    if (!round || !roundStartedAtRef.current) return;

    const now = Date.now();
    const roundLog: WordSearchRoundLog = {
      roundNumber: roundIndex + 1,
      size: round.config.size,
      startedAtIso: new Date(roundStartedAtRef.current).toISOString(),
      endedAtIso: new Date(now).toISOString(),
      elapsedMs: now - roundStartedAtRef.current,
      wordsTotal: round.config.words.length,
      wordsFound: foundWords.size,
      invalidSelections,
      foundWords: foundWordLogs,
    };

    setRoundLogs((prev) => [...prev, roundLog]);

    if (goNext && roundIndex + 1 < ROUND_PRESETS.length) {
      setPhase("round-feedback");
      return;
    }

    if (!sessionStartedAtRef.current) return;

    const finalLogs = [...roundLogs, roundLog];
    const result = computeMetrics({
      startedAtMs: sessionStartedAtRef.current,
      endedAtMs: now,
      roundLogs: finalLogs,
    });

    setSessionResult(result);
    clearTimer();
    setPhase("result");
  }

  function onCellStart(row: number, col: number) {
    if (phase !== "running") return;
    selectingRef.current = true;
    startCellRef.current = { row, col };
    setPreviewPath([{ row, col }]);
  }

  function onCellEnter(row: number, col: number) {
    if (!selectingRef.current || !startCellRef.current || !round) return;
    const candidate = handleSelection({
      grid: round.grid,
      start: startCellRef.current,
      end: { row, col },
      wordsToFind: currentWords,
      foundWords,
    });
    if (candidate.path) {
      setPreviewPath(candidate.path);
    }
  }

  function applySelection(endRow: number, endCol: number) {
    if (!startCellRef.current || !round || phase !== "running") return;

    const result = handleSelection({
      grid: round.grid,
      start: startCellRef.current,
      end: { row: endRow, col: endCol },
      wordsToFind: currentWords,
      foundWords,
    });

    if (result.valid && result.word && result.path) {
      setFoundWords((prev) => new Set(prev).add(result.word!));
      setHighlightPaths((prev) => [...prev, pathKey(result.path!)]);

      const foundAtMs = sessionStartedAtRef.current ? Date.now() - sessionStartedAtRef.current : 0;
      setFoundWordLogs((prev) => [
        ...prev,
        {
          word: result.word!,
          foundAtMs,
          wrongAttemptsBeforeHit: wrongAttemptsSinceLastHit,
        },
      ]);
      setWrongAttemptsSinceLastHit(0);
    } else {
      setInvalidSelections((value) => value + 1);
      setWrongAttemptsSinceLastHit((value) => value + 1);
    }

    selectingRef.current = false;
    startCellRef.current = null;
    setPreviewPath([]);
  }

  function onCellEnd(row: number, col: number) {
    applySelection(row, col);
  }

  function onCellClick(row: number, col: number) {
    if (!startCellRef.current) {
      onCellStart(row, col);
      return;
    }
    applySelection(row, col);
  }

  function onMouseLeaveGrid() {
    if (!selectingRef.current) return;
    selectingRef.current = false;
    startCellRef.current = null;
    setPreviewPath([]);
  }

  useEffect(() => {
    if (!round || phase !== "running") return;
    if (foundWords.size === round.config.words.length && round.config.words.length > 0) {
      finishRound(true);
    }
  }, [foundWords, phase, round]);

  useEffect(() => {
    return () => clearTimer();
  }, []);

  function downloadText() {
    if (!sessionResult) return;
    const txt = buildResultText(sessionResult, reportContext);
    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
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

  function concludeExercise() {
    if (!sessionResult) {
      onComplete({ success: false, pointsEarned: 0 });
      return;
    }
    const quality = sessionResult.wordsTotal > 0 ? sessionResult.wordsFoundTotal / sessionResult.wordsTotal : 0;
    const success = quality >= 0.7;
    const pointsEarned = Math.round(basePoints * quality);
    onComplete({ success, pointsEarned });
  }

  function cellIsHighlighted(row: number, col: number): boolean {
    const previewHit = previewPath.some((p) => p.row === row && p.col === col);
    if (previewHit) return true;

    return highlightPaths.some((path) => {
      const set = path.split("|");
      return set.includes(`${row}:${col}`);
    });
  }

  return (
    <div className="space-y-5">
      {phase === "intro" && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5">
          <button
            type="button"
            onClick={startSession}
            className="w-full rounded-lg bg-zinc-900 px-4 py-3 font-semibold text-white hover:bg-zinc-700"
          >
            Iniciar treino
          </button>
        </div>
      )}

      {phase === "running" && round && (
        <div className="space-y-4">

          <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
            <div
              className="grid gap-1 rounded-lg border border-zinc-200 bg-white p-2"
              style={{ gridTemplateColumns: `repeat(${round.config.size}, minmax(0, 1fr))` }}
              onMouseLeave={onMouseLeaveGrid}
            >
              {round.grid.map((rowValues, row) =>
                rowValues.map((value, col) => (
                  <button
                    key={`${row}-${col}`}
                    type="button"
                    onMouseDown={() => onCellStart(row, col)}
                    onMouseEnter={() => onCellEnter(row, col)}
                    onMouseUp={() => onCellEnd(row, col)}
                    onClick={() => onCellClick(row, col)}
                    disabled={phase !== "running"}
                    className={`aspect-square rounded border text-xs font-bold transition sm:text-sm ${
                      cellIsHighlighted(row, col)
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-zinc-50 text-zinc-900 hover:bg-zinc-100"
                    }`}
                  >
                    {value}
                  </button>
                )),
              )}
            </div>

            <div className="space-y-3 rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Lista de palavras</p>
              <div className="max-h-[28rem] space-y-1 overflow-auto pr-1 text-sm">
                {round.config.words.map((word) => {
                  const done = foundWords.has(word);
                  return (
                    <p
                      key={word}
                      className={done ? "font-semibold text-zinc-900 line-through" : "text-zinc-700"}
                    >
                      {word}
                    </p>
                  );
                })}
              </div>
              {/* Nenhuma info extra, apenas barra de progresso e grid */}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => finishRound(true)}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Finalizar fase
            </button>
          </div>
        </div>
      )}

      {phase === "round-feedback" && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-5">
          <h3 className="text-xl font-semibold text-zinc-900">Fase concluída</h3>
          <button
            type="button"
            onClick={() => {
              const next = roundIndex + 1;
              if (next >= ROUND_PRESETS.length) {
                if (!sessionStartedAtRef.current) return;
                const result = computeMetrics({
                  startedAtMs: sessionStartedAtRef.current,
                  endedAtMs: Date.now(),
                  roundLogs,
                });
                setSessionResult(result);
                clearTimer();
                setPhase("result");
              } else {
                startRound(next);
              }
            }}
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
              <p className="text-xs text-zinc-500">Tempo total</p>
              <p className="font-semibold text-zinc-900">{(sessionResult.elapsedMs / 1000).toFixed(1)} s</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Palavras encontradas</p>
              <p className="font-semibold text-zinc-900">{sessionResult.wordsFoundTotal}/{sessionResult.wordsTotal}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Tentativas inválidas</p>
              <p className="font-semibold text-zinc-900">{sessionResult.totalInvalidSelections}</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-3 sm:col-span-3">
              <p className="text-xs text-zinc-500">Desempenho</p>
              <p className="font-semibold text-zinc-900">{sessionResult.summaryText}</p>
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
