"use client";

import { useEffect, useMemo, useState, useRef } from "react";

type StimulusType = "GO" | "NOGO";

type GoNoGoLevelConfig = {
  id: number;
  name: string;
  stimulusDurationMs: number;
  goProbability: number;
  totalTrials: number;
};

type TrialResult = {
  id: number;
  type: StimulusType;
  isHit: boolean;
  isFalseAlarm: boolean;
  isOmission: boolean;
  reactionTimeMs?: number;
};

const LEVELS: GoNoGoLevelConfig[] = [
  {
    id: 1,
    name: "Nível 1 – Iniciante",
    stimulusDurationMs: 800,
    goProbability: 0.7,
    totalTrials: 60,
  },
  {
    id: 2,
    name: "Nível 2 – Intermediário",
    stimulusDurationMs: 600,
    goProbability: 0.75,
    totalTrials: 70,
  },
  {
    id: 3,
    name: "Nível 3 – Avançado",
    stimulusDurationMs: 500,
    goProbability: 0.8,
    totalTrials: 80,
  },
  {
    id: 4,
    name: "Nível 4 – Desafio",
    stimulusDurationMs: 400,
    goProbability: 0.85,
    totalTrials: 90,
  },
];

const goStimuli = [
  { id: "fruit-1", label: "🍎", description: "Maçã (GO)" },
  { id: "fruit-2", label: "🍌", description: "Banana (GO)" },
  { id: "fruit-3", label: "🍓", description: "Morango (GO)" },
];

const nogoStimuliEasy = [
  { id: "bomb-1", label: "💣", description: "Bomba (No-Go)" },
];

const nogoStimuliMedium = [
  { id: "junk-1", label: "🍩", description: "Doce (No-Go)" },
  { id: "junk-2", label: "🍟", description: "Fritura (No-Go)" },
];

const nogoStimuliHard = [
  { id: "ultra-1", label: "🥐", description: "Alimento tentador (No-Go)" },
  { id: "ultra-2", label: "🧁", description: "Doce sofisticado (No-Go)" },
];

function getNoGoStimuliForLevel(levelId: number) {
  if (levelId === 1) return nogoStimuliEasy;
  if (levelId === 2) return nogoStimuliMedium;
  return nogoStimuliHard;
}

export function GoNoGoQuickClickMobile() {
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTrialIndex, setCurrentTrialIndex] = useState(0);
  const [currentStimulusType, setCurrentStimulusType] = useState<StimulusType | null>(null);
  const [currentStimulusLabel, setCurrentStimulusLabel] = useState<string>("");
  const [trialStartTime, setTrialStartTime] = useState<number | null>(null);
  const [hasRespondedThisTrial, setHasRespondedThisTrial] = useState(false);
  const [results, setResults] = useState<TrialResult[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | null; message?: string }>({ type: null });
  const [stimulusVisible, setStimulusVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const level = LEVELS[currentLevelIndex];
  const currentNoGoStimuli = useMemo(() => getNoGoStimuliForLevel(level.id), [level.id]);

  function playSuccessSound() {
    // callback para som de acerto (mobile: conectar via prop se desejar)
  }
  function playErrorSound() {
    // callback para som de erro (mobile: conectar via prop se desejar)
  }

  function scheduleNextTrial() {
    if (currentTrialIndex + 1 >= level.totalTrials) {
      setIsRunning(false);
      setShowSummary(true);
      setCurrentStimulusType(null);
      setStimulusVisible(false);
      return;
    }
    timeoutRef.current = setTimeout(() => {
      startTrial(currentTrialIndex + 1);
    }, 400);
  }

  function startTrial(index: number) {
    const rand = Math.random();
    const isGo = rand < level.goProbability;
    const stimulusType: StimulusType = isGo ? "GO" : "NOGO";
    let label = "";
    if (stimulusType === "GO") {
      const item = goStimuli[Math.floor(Math.random() * goStimuli.length)];
      label = item.label;
    } else {
      const nogoSet = currentNoGoStimuli;
      const item = nogoSet[Math.floor(Math.random() * nogoSet.length)];
      label = item.label;
    }
    setCurrentTrialIndex(index);
    setCurrentStimulusType(stimulusType);
    setCurrentStimulusLabel(label);
    setHasRespondedThisTrial(false);
    setFeedback({ type: null });
    setStimulusVisible(true);
    const start = performance.now();
    setTrialStartTime(start);
    timeoutRef.current = setTimeout(() => {
      setStimulusVisible(false);
      if (!hasRespondedThisTrial && stimulusType === "GO") {
        const trialResult: TrialResult = {
          id: index,
          type: stimulusType,
          isHit: false,
          isFalseAlarm: false,
          isOmission: true,
        };
        setResults((prev) => [...prev, trialResult]);
      }
      scheduleNextTrial();
    }, level.stimulusDurationMs);
  }

  function handleStart() {
    setResults([]);
    setShowSummary(false);
    setCurrentTrialIndex(0);
    setIsRunning(true);
    startTrial(0);
  }

  function handleClickStimulus() {
    if (!isRunning || !stimulusVisible || !currentStimulusType) return;
    if (hasRespondedThisTrial) return;
    setHasRespondedThisTrial(true);
    const now = performance.now();
    const rt = trialStartTime ? now - trialStartTime : undefined;
    if (currentStimulusType === "GO") {
      const trialResult: TrialResult = {
        id: currentTrialIndex,
        type: "GO",
        isHit: true,
        isFalseAlarm: false,
        isOmission: false,
        reactionTimeMs: rt,
      };
      setResults((prev) => [...prev, trialResult]);
      setFeedback({ type: "success", message: "Boa! Você clicou no alvo." });
      playSuccessSound();
    } else {
      const trialResult: TrialResult = {
        id: currentTrialIndex,
        type: "NOGO",
        isHit: false,
        isFalseAlarm: true,
        isOmission: false,
      };
      setResults((prev) => [...prev, trialResult]);
      setFeedback({ type: "error", message: "Erro! Não era para clicar." });
      playErrorSound();
    }
  }

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  const summary = useMemo(() => {
    const goTrials = results.filter((r) => r.type === "GO");
    const hits = goTrials.filter((r) => r.isHit).length;
    const omissions = goTrials.filter((r) => r.isOmission).length;
    const falseAlarms = results.filter((r) => r.isFalseAlarm).length;
    const rtList = goTrials.filter((r) => r.isHit && r.reactionTimeMs != null).map((r) => r.reactionTimeMs as number);
    const avgRT = rtList.length > 0 ? Math.round(rtList.reduce((a, b) => a + b, 0) / rtList.length) : null;
    return { hits, omissions, falseAlarms, avgRT };
  }, [results]);

  return (
    <div style={{ maxWidth: 340, margin: "0 auto", padding: 12, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>Go / No-Go Mobile</h2>
        <p style={{ fontSize: 15, margin: 0 }}>
          Toque apenas nos <b>alvos</b> (GO), como frutas. Não toque nos <b>No-Go</b> (bombas, doces, etc).
        </p>
      </div>
      <div style={{ fontSize: 14, marginBottom: 8 }}>
        Nível: <strong>{level.name}</strong> <br />
        Estímulo: {currentTrialIndex + 1}/{level.totalTrials}
      </div>
      <div style={{ width: "100%", height: 180, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
        {stimulusVisible && currentStimulusType && (
          <button
            onClick={handleClickStimulus}
            style={{
              fontSize: 80,
              border: feedback.type === "success" ? "4px solid #22c55e" : feedback.type === "error" ? "4px solid #ef4444" : "2px solid #ddd",
              borderRadius: 24,
              width: 120,
              height: 120,
              background: "#fff",
              boxShadow: "0 2px 8px #0001",
              transition: "border 0.2s",
            }}
            disabled={!!feedback.type}
          >
            {currentStimulusLabel}
          </button>
        )}
      </div>
      {feedback.type && (
        <div style={{ fontSize: 15, color: feedback.type === "success" ? "#16a34a" : "#dc2626", marginBottom: 8 }}>
          {feedback.message}
        </div>
      )}
      <button
        onClick={handleStart}
        style={{ fontSize: 16, padding: "10px 24px", borderRadius: 8, background: "#2563eb", color: "#fff", border: "none", marginBottom: 8 }}
        disabled={isRunning}
      >
        {isRunning ? "Rodada em andamento..." : "Começar rodada"}
      </button>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button
          onClick={() => setCurrentLevelIndex((idx) => Math.max(0, idx - 1))}
          style={{ padding: "6px 12px", borderRadius: 6, background: "#eee", border: "none" }}
          disabled={currentLevelIndex === 0 || isRunning}
        >
          Nível anterior
        </button>
        <button
          onClick={() => setCurrentLevelIndex((idx) => Math.min(LEVELS.length - 1, idx + 1))}
          style={{ padding: "6px 12px", borderRadius: 6, background: "#eee", border: "none" }}
          disabled={currentLevelIndex >= LEVELS.length - 1 || isRunning}
        >
          Próximo nível
        </button>
      </div>
      {showSummary && (
        <div style={{ width: "100%", border: "1px solid #ddd", borderRadius: 10, padding: 12, background: "#fafafa", fontSize: 15, marginTop: 8 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, marginBottom: 6 }}>Resumo</h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            <li>Acertos em Go: {summary.hits}</li>
            <li>Erros em No-Go: {summary.falseAlarms}</li>
            <li>Omissões em Go: {summary.omissions}</li>
            <li>Tempo médio de reação: {summary.avgRT != null ? `${summary.avgRT} ms` : "—"}</li>
          </ul>
        </div>
      )}
    </div>
  );
}
