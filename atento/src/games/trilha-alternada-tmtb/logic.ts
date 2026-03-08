import type {
  TmtbClickLog,
  TmtbConfig,
  TmtbNode,
  TmtbPhaseMetric,
  TmtbSequenceItem,
  TmtbSessionResult,
} from "./types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(min: number, max: number, rng: () => number): number {
  return min + rng() * (max - min);
}

function toLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

export function buildAlternatingSequence(config: {
  numbersCount: number;
  lettersCount: number;
}): TmtbSequenceItem[] {
  const numbersCount = Math.max(1, Math.floor(config.numbersCount));
  const lettersCount = Math.max(1, Math.floor(config.lettersCount));

  const items: TmtbSequenceItem[] = [];
  let seqIndex = 0;

  const paired = Math.min(numbersCount, lettersCount);
  for (let i = 1; i <= paired; i += 1) {
    items.push({ seqIndex, label: String(i), kind: "number" });
    seqIndex += 1;
    items.push({ seqIndex, label: toLetter(i - 1), kind: "letter" });
    seqIndex += 1;
  }

  for (let i = paired + 1; i <= numbersCount; i += 1) {
    items.push({ seqIndex, label: String(i), kind: "number" });
    seqIndex += 1;
  }

  for (let i = paired + 1; i <= lettersCount; i += 1) {
    items.push({ seqIndex, label: toLetter(i - 1), kind: "letter" });
    seqIndex += 1;
  }

  return items;
}

export function generateNodeLayout(params: {
  items: TmtbSequenceItem[];
  minDistancePct: number;
  rng?: () => number;
}): TmtbNode[] {
  const rng = params.rng ?? Math.random;
  const minDistance = clamp(params.minDistancePct, 4, 30);
  const nodes: TmtbNode[] = [];
  const minX = 8;
  const maxX = 92;
  const minY = 12;
  const maxY = 88;

  for (const item of params.items) {
    let attempts = 0;
    let x = 50;
    let y = 50;
    let placed = false;

    while (attempts < 1000) {
      x = randomBetween(minX, maxX, rng);
      y = randomBetween(minY, maxY, rng);
      const overlaps = nodes.some((node) => Math.hypot(node.xPct - x, node.yPct - y) < minDistance);
      if (!overlaps) {
        placed = true;
        break;
      }
      attempts += 1;
    }

    if (!placed) {
      const step = 2.5;
      outer: for (let yy = minY; yy <= maxY; yy += step) {
        for (let xx = minX; xx <= maxX; xx += step) {
          const overlaps = nodes.some((node) => Math.hypot(node.xPct - xx, node.yPct - yy) < minDistance);
          if (!overlaps) {
            x = xx;
            y = yy;
            placed = true;
            break outer;
          }
        }
      }
    }

    if (!placed) {
      const index = nodes.length;
      const columns = Math.max(1, Math.floor((maxX - minX) / minDistance));
      const col = index % columns;
      const row = Math.floor(index / columns);
      x = clamp(minX + col * minDistance, minX, maxX);
      y = clamp(minY + row * minDistance, minY, maxY);
    }

    nodes.push({
      ...item,
      id: `${item.label}-${item.seqIndex}`,
      xPct: x,
      yPct: y,
    });
  }

  return nodes;
}

export function evaluateClick(params: {
  clickedSeqIndex: number;
  currentSeqIndex: number;
  penaltyMode: TmtbConfig["penaltyMode"];
  backStepsOnError: number;
}): { correct: boolean; nextSeqIndex: number; backStepsApplied: number } {
  if (params.clickedSeqIndex === params.currentSeqIndex) {
    return {
      correct: true,
      nextSeqIndex: params.currentSeqIndex + 1,
      backStepsApplied: 0,
    };
  }

  if (params.penaltyMode === "keep-position") {
    return {
      correct: false,
      nextSeqIndex: params.currentSeqIndex,
      backStepsApplied: 0,
    };
  }

  const maxBack = Math.max(1, Math.floor(params.backStepsOnError));
  const nextSeqIndex = Math.max(0, params.currentSeqIndex - maxBack);
  return {
    correct: false,
    nextSeqIndex,
    backStepsApplied: params.currentSeqIndex - nextSeqIndex,
  };
}

export function buildSessionResult(params: {
  participantId?: string;
  startedAtMs: number;
  endedAtMs: number;
  sequenceLength: number;
  errorsTotal: number;
  errorsOnNumberTarget: number;
  errorsOnLetterTarget: number;
  backStepsApplied: number;
  clicks: TmtbClickLog[];
  phaseDurationsMs?: Partial<Record<1 | 2 | 3, number>>;
}): TmtbSessionResult {
  const totalTimeMs = Math.max(0, params.endedAtMs - params.startedAtMs);
  const totalTimeSeconds = totalTimeMs / 1000;
  const sortedClicks = [...params.clicks].sort((a, b) => a.atMs - b.atMs);
  const totalClickRatePerSecond =
    totalTimeSeconds > 0 ? Number((params.clicks.length / totalTimeSeconds).toFixed(3)) : 0;
  let maxInterClickMs = 0;
  for (let index = 1; index < sortedClicks.length; index += 1) {
    const delta = Math.max(0, sortedClicks[index]!.atMs - sortedClicks[index - 1]!.atMs);
    if (delta > maxInterClickMs) {
      maxInterClickMs = delta;
    }
  }

  const phaseDefinitions = [
    { phaseId: 1 as const, sessionKind: "phase-1" as const },
    { phaseId: 2 as const, sessionKind: "phase-2" as const },
    { phaseId: 3 as const, sessionKind: "phase-3" as const },
  ];

  const phaseMetrics: TmtbPhaseMetric[] = phaseDefinitions.map(({ phaseId, sessionKind }) => {
    const phaseClicks = sortedClicks.filter((click) => click.sessionKind === sessionKind);
    const declaredDurationMs = Math.max(0, params.phaseDurationsMs?.[phaseId] ?? 0);
    const inferredDurationMs =
      phaseClicks.length >= 2
        ? Math.max(0, phaseClicks[phaseClicks.length - 1]!.atMs - phaseClicks[0]!.atMs)
        : 0;
    const totalTimeMs = declaredDurationMs > 0 ? declaredDurationMs : inferredDurationMs;
    const totalTimeSeconds = totalTimeMs / 1000;
    const clickCount = phaseClicks.length;
    const clickRatePerSecond = totalTimeSeconds > 0 ? Number((clickCount / totalTimeSeconds).toFixed(3)) : 0;

    let phaseMaxInterClickMs = 0;
    for (let index = 1; index < phaseClicks.length; index += 1) {
      const delta = Math.max(0, phaseClicks[index]!.atMs - phaseClicks[index - 1]!.atMs);
      if (delta > phaseMaxInterClickMs) {
        phaseMaxInterClickMs = delta;
      }
    }

    return {
      phaseId,
      totalTimeMs,
      totalTimeSeconds,
      clickCount,
      clickRatePerSecond,
      maxInterClickMs: phaseMaxInterClickMs,
    };
  });

  const accuracyPercent =
    params.sequenceLength > 0
      ? clamp(((params.sequenceLength - params.errorsTotal) / params.sequenceLength) * 100, 0, 100)
      : 0;

  const expectedMs = params.sequenceLength * 1800;
  const speedScore =
    totalTimeMs <= 0 ? 100 : clamp((expectedMs / totalTimeMs) * 100, 0, 100);

  const finalScore = clamp(accuracyPercent * 0.75 + speedScore * 0.25, 0, 100);

  const interpretation =
    finalScore >= 85
      ? "Excelente desempenho em alternância entre números e letras, com boa precisão e ritmo." 
      : finalScore >= 70
        ? "Bom desempenho geral, com pequenas perdas de ritmo ou precisão." 
        : finalScore >= 50
          ? "Desempenho intermediário; vale reforçar a alternância sequencial com menos impulsividade." 
          : "Desempenho abaixo do esperado; priorize precisão na sequência antes de acelerar.";

  return {
    participantId: params.participantId,
    startedAtIso: new Date(params.startedAtMs).toISOString(),
    endedAtIso: new Date(params.endedAtMs).toISOString(),
    totalTimeMs,
    totalTimeSeconds,
    sequenceLength: params.sequenceLength,
    errorsTotal: params.errorsTotal,
    errorsOnNumberTarget: params.errorsOnNumberTarget,
    errorsOnLetterTarget: params.errorsOnLetterTarget,
    backStepsApplied: params.backStepsApplied,
    totalClickRatePerSecond,
    maxInterClickMs,
    phaseMetrics,
    accuracyPercent,
    speedScore,
    finalScore,
    interpretation,
    clicks: params.clicks,
  };
}

function escapeCsv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function exportCSV(result: TmtbSessionResult): string {
  const summaryHeader = [
    "participantId",
    "startedAtIso",
    "endedAtIso",
    "totalTimeMs",
    "totalTimeSeconds",
    "sequenceLength",
    "errorsTotal",
    "errorsOnNumberTarget",
    "errorsOnLetterTarget",
    "backStepsApplied",
    "totalClickRatePerSecond",
    "maxInterClickMs",
    "accuracyPercent",
    "speedScore",
    "finalScore",
  ];

  const summaryRow = [
    result.participantId ?? "",
    result.startedAtIso,
    result.endedAtIso,
    String(result.totalTimeMs),
    result.totalTimeSeconds.toFixed(3),
    String(result.sequenceLength),
    String(result.errorsTotal),
    String(result.errorsOnNumberTarget),
    String(result.errorsOnLetterTarget),
    String(result.backStepsApplied),
    result.totalClickRatePerSecond.toFixed(3),
    String(result.maxInterClickMs),
    result.accuracyPercent.toFixed(2),
    result.speedScore.toFixed(2),
    result.finalScore.toFixed(2),
  ].map(escapeCsv);

  const clickHeader = [
    "sessionKind",
    "atMs",
    "clickedLabel",
    "clickedSeqIndex",
    "expectedLabel",
    "expectedSeqIndex",
    "correct",
  ];

  const clickRows = result.clicks.map((click) =>
    [
      click.sessionKind,
      String(click.atMs),
      click.clickedLabel,
      String(click.clickedSeqIndex),
      click.expectedLabel,
      String(click.expectedSeqIndex),
      click.correct ? "true" : "false",
    ]
      .map(escapeCsv)
      .join(","),
  );

  return [
    summaryHeader.join(","),
    summaryRow.join(","),
    "",
    clickHeader.join(","),
    ...clickRows,
  ].join("\n");
}

export function exportJSON(result: TmtbSessionResult): string {
  return JSON.stringify(result, null, 2);
}

export function exportTXT(result: TmtbSessionResult): string {
  const lines: string[] = [];
  lines.push("=" + "=".repeat(68));
  lines.push("RELATÓRIO DIDÁTICO - TRILHA ALTERNADA 1-A-2-B (TMT-B ONLINE)");
  lines.push("=" + "=".repeat(68));
  lines.push("");
  lines.push("Resumo");
  lines.push(`- Tempo total para concluir a trilha: ${result.totalTimeSeconds.toFixed(2)} s.`);
  lines.push(`- Velocidade total da fase: ${result.totalClickRatePerSecond.toFixed(3)} cliques/s.`);
  lines.push(`- Maior intervalo entre um clique e outro: ${(result.maxInterClickMs / 1000).toFixed(2)} s.`);
  lines.push(`- Erros totais: ${result.errorsTotal}.`);
  lines.push(`- Passos de recuo aplicados por penalização: ${result.backStepsApplied}.`);
  lines.push(`- Pontuação final: ${result.finalScore.toFixed(1)}%.`);
  lines.push("");
  lines.push("Como ler os resultados");
  lines.push(`- Acurácia: ${result.accuracyPercent.toFixed(1)}% (quanto maior, melhor).`);
  lines.push(`- Velocidade: ${result.speedScore.toFixed(1)}% (quanto maior, mais rápido).`);
  lines.push(`- Erros quando o próximo alvo era número: ${result.errorsOnNumberTarget}.`);
  lines.push(`- Erros quando o próximo alvo era letra: ${result.errorsOnLetterTarget}.`);
  lines.push("");
  lines.push("Interpretação");
  lines.push(`- ${result.interpretation}`);
  lines.push("");
  lines.push("Métricas por fase");
  for (const metric of result.phaseMetrics) {
    lines.push(
      `- Fase ${metric.phaseId}: velocidade ${metric.clickRatePerSecond.toFixed(3)} cliques/s | maior intervalo ${(metric.maxInterClickMs / 1000).toFixed(2)} s.`,
    );
  }
  lines.push("");
  lines.push("Observação");
  lines.push("- O bloco de treino é apenas familiarização e não entra na validação final.");
  return lines.join("\n");
}
