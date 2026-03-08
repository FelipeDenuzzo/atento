import { describe, expect, it } from "vitest";
import {
  buildRoundLog,
  computeMetrics,
  handleAnomalyKeyPress,
  handleChatResponse,
  spawnAnomaly,
  spawnChatMessage,
  startRound,
  updateRuntime,
} from "./logic";
import type { ChatErrorRoundConfig } from "./types";

const config: ChatErrorRoundConfig = {
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
};

describe("chat-vigilancia-erros logic", () => {
  it("inicia rodada com estado base", () => {
    const runtime = startRound(config, () => 0.4);
    expect(runtime.messages.length).toBe(0);
    expect(runtime.anomalies.length).toBe(0);
    expect(runtime.currentMessage).toBeNull();
  });

  it("registra resposta correta no chat com tempo", () => {
    const runtime = startRound(config, () => 0.2);
    const message = spawnChatMessage(runtime, 1000, () => 0.1);
    const correct = message.options.find((option) => option.isCorrect);
    expect(correct).toBeDefined();

    const response = handleChatResponse({
      runtime,
      optionId: correct?.id ?? "",
      atMs: 1800,
    });

    expect(response.accepted).toBe(true);
    expect(response.correct).toBe(true);
    expect(message.responseTimeMs).toBe(800);
  });

  it("registra detecção de anomalia e falso alarme", () => {
    const runtime = startRound(config, () => 0.3);
    const anomaly = spawnAnomaly(runtime, 2000, () => 0.6);

    const detected = handleAnomalyKeyPress({ runtime, atMs: 2500 });
    expect(detected.detected).toBe(true);
    expect(anomaly.reactionMs).toBe(500);

    const falseAlarm = handleAnomalyKeyPress({ runtime, atMs: 2800 });
    expect(falseAlarm.falseAlarm).toBe(true);
    expect(runtime.falseAlarms).toBe(1);
  });

  it("marca conflito quando anomalia surge com mensagem ativa", () => {
    const runtime = startRound(config, () => 0.2);
    spawnChatMessage(runtime, 1000, () => 0.1);
    const anomaly = spawnAnomaly(runtime, 1200, () => 0.8);

    expect(anomaly.conflictWithActiveMessage).toBe(true);
  });

  it("consolida métricas de rodada e sessão", () => {
    const runtime = startRound(config, () => 0.5);

    const msg = spawnChatMessage(runtime, 1000, () => 0.1);
    const correct = msg.options.find((option) => option.isCorrect);
    handleChatResponse({ runtime, optionId: correct?.id ?? "", atMs: 1700 });

    const anomaly = spawnAnomaly(runtime, 3000, () => 0.2);
    handleAnomalyKeyPress({ runtime, atMs: 3400 });

    updateRuntime(runtime, 65000, () => 0.4);
    if (runtime.activeAnomaly && runtime.activeAnomaly.detectedAtMs == null) {
      runtime.activeAnomaly.missed = true;
      runtime.activeAnomaly = null;
    }

    const round = buildRoundLog({
      runtime,
      roundNumber: 1,
      startedAtIso: new Date(1000).toISOString(),
      endedAtIso: new Date(61000).toISOString(),
    });

    const result = computeMetrics({
      startedAtMs: 1000,
      endedAtMs: 61000,
      rounds: [round],
    });

    expect(round.metrics.chatTotal).toBeGreaterThan(0);
    expect(round.metrics.anomalyTotal).toBeGreaterThan(0);
    expect(result.averageDualScore).toBeGreaterThan(0);
  });
});
