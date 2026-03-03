"use client";

import { useEffect, useMemo, useState } from "react";

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

export function GoNoGoQuickClick() {
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTrialIndex, setCurrentTrialIndex] = useState(0);
  const [currentStimulusType, setCurrentStimulusType] =
    useState<StimulusType | null>(null);
  const [currentStimulusLabel, setCurrentStimulusLabel] = useState<string>("");
  const [trialStartTime, setTrialStartTime] = useState<number | null>(null);
  const [hasRespondedThisTrial, setHasRespondedThisTrial] = useState(false);
  const [results, setResults] = useState<TrialResult[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | null;
    message?: string;
  }>({ type: null });
  const [stimulusVisible, setStimulusVisible] = useState(false);

  const level = LEVELS[currentLevelIndex];

  const currentNoGoStimuli = useMemo(
    () => getNoGoStimuliForLevel(level.id),
    [level.id]
  );

  function playSuccessSound() {
    try {
      const ctx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 880;
      osc.connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        osc.stop();
        ctx.close();
      }, 120);
    } catch {}
  }

  function playErrorSound() {
    try {
      const ctx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.value = 220;
      osc.connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        osc.stop();
        ctx.close();
      }, 200);
    } catch {}
  }

  function scheduleNextTrial() {
    if (currentTrialIndex + 1 >= level.totalTrials) {
      setIsRunning(false);
      setShowSummary(true);
      setCurrentStimulusType(null);
      setStimulusVisible(false);
      return;
    }

    setTimeout(() => {
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

    setTimeout(() => {
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
      setFeedback({
        type: "error",
        message: "Erro! Não era para clicar neste estímulo.",
      });
      playErrorSound();
    }
  }

  useEffect(() => {
    function handleSpace(e: KeyboardEvent) {
      if (e.code === "Space") {
        e.preventDefault();
        handleClickStimulus();
      }
    }
    window.addEventListener("keydown", handleSpace);
    return () => window.removeEventListener("keydown", handleSpace);
  });

  const summary = useMemo(() => {
    const goTrials = results.filter((r) => r.type === "GO");
    const hits = goTrials.filter((r) => r.isHit).length;
    const omissions = goTrials.filter((r) => r.isOmission).length;
    const falseAlarms = results.filter((r) => r.isFalseAlarm).length;
    const rtList = goTrials
      .filter((r) => r.isHit && r.reactionTimeMs != null)
      .map((r) => r.reactionTimeMs as number);

    const avgRT =
      rtList.length > 0
        ? Math.round(rtList.reduce((a, b) => a + b, 0) / rtList.length)
        : null;

    return { hits, omissions, falseAlarms, avgRT };
  }, [results]);

  return (
    <div className="flex flex-col gap-4 items-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold">
          Go / No-Go — Clique Rápido
        </h2>
        <p className="text-sm text-gray-700 max-w-xl mt-1">
          Clique apenas nos <span className="font-semibold">alvos</span> (GO),
          como frutas. Não clique nas <span className="font-semibold">bombas</span>
          ou outros estímulos No-Go. Você precisa responder rápido e 
          inibir o impulso de clicar quando o estímulo não for alvo.
        </p>
      </div>

      <div className="flex flex-col items-center gap-2 text-sm text-gray-700">
        <div>Nível atual: <strong>{level.name}</strong></div>
        <div>
          Estímulos: {currentTrialIndex + 1}/{level.totalTrials}
        </div>
        <div>
          Duração de cada estímulo: {level.stimulusDurationMs} ms •
          Proporção Go/No-Go ≈ {Math.round(level.goProbability * 100)}% /{" "}
          {100 - Math.round(level.goProbability * 100)}%
        </div>
        <div>
          Controles: clique/touch no estímulo (ou barra de espaço como atalho).
        </div>
      </div>

      <div
        className="relative mt-4 flex items-center justify-center w-64 h-64 border rounded-lg bg-white shadow-inner overflow-hidden"
      >
        {stimulusVisible && currentStimulusType && (
          <button
            onClick={handleClickStimulus}
            className={`text-7xl transition-transform duration-75 ${
              feedback.type === "success"
                ? "ring-4 ring-green-400 scale-110"
                : feedback.type === "error"
                ? "ring-4 ring-red-500 animate-shake"
                : ""
            }`}
          >
            {currentStimulusLabel}
          </button>
        )}

        {!stimulusVisible && !isRunning && !showSummary && (
          <div className="text-center px-4 text-sm text-gray-700">
            <p>
              Quando o jogo começar, um estímulo aparecerá de cada vez
              no centro. Clique apenas quando for um alvo (GO).
              Se for No-Go, não clique.
            </p>
          </div>
        )}
      </div>

      {feedback.type && (
        <div
          className={`text-sm ${
            feedback.type === "success"
              ? "text-green-700"
              : "text-red-700"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="flex gap-2 mt-2">
        <button
          onClick={handleStart}
          className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
          disabled={isRunning}
        >
          {isRunning ? "Rodada em andamento..." : "Começar rodada"}
        </button>

        <button
          onClick={() => {
            if (currentLevelIndex < LEVELS.length - 1) {
              setCurrentLevelIndex((idx) => idx + 1);
            }
          }}
          className="px-4 py-2 rounded bg-gray-200 text-sm hover:bg-gray-300 disabled:opacity-50"
          disabled={currentLevelIndex >= LEVELS.length - 1 || isRunning}
        >
          Próximo nível
        </button>

        <button
          onClick={() => {
            if (currentLevelIndex > 0) {
              setCurrentLevelIndex((idx) => idx - 1);
            }
          }}
          className="px-4 py-2 rounded bg-gray-200 text-sm hover:bg-gray-300 disabled:opacity-50"
          disabled={currentLevelIndex === 0 || isRunning}
        >
          Nível anterior
        </button>
      </div>

      {showSummary && (
        <div className="mt-4 w-full max-w-md border rounded-lg p-4 bg-white text-sm">
          <h3 className="font-semibold mb-2">Resumo da rodada</h3>
          <ul className="space-y-1">
            <li>Acertos em Go: {summary.hits}</li>
            <li>Erros em No-Go (cliques indevidos): {summary.falseAlarms}</li>
            <li>Omissões em Go (não clicou no alvo): {summary.omissions}</li>
            <li>
              Tempo médio de reação (Go corretos):{" "}
              {summary.avgRT != null ? `${summary.avgRT} ms` : "—"}
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
