"use client";

import React, { useCallback, useRef, useState } from "react";

type Voice = "male" | "female";
type TrialAudioItem = {
  digit: number;
  voice: Voice;
  src: string;
};

type TrialResult = {
  trial: number;
  targetVoice: Voice;
  targetSequence: number[];
  distractorSequence: number[];
  fullSequence: Array<{ digit: number; voice: Voice }>;
  userAnswer: number[];
  correct: boolean;
  responseTimeMs: number;
};

type Props = {
  onComplete?: (report: any) => void;
  totalTrials?: number;
};

const TOTAL_DIGITS_PER_VOICE = 3;
const TOTAL_TRIALS_DEFAULT = 6;

function randomDigit() {
  return Math.floor(Math.random() * 10);
}

function sampleDigits(count: number) {
  return Array.from({ length: count }, () => randomDigit());
}

function voiceLabel(voice: Voice) {
  return voice === "male" ? "masculina" : "feminina";
}

function fileForDigit(digit: number, voice: Voice) {
  return `/audio/${digit}_${voice === "male" ? "masc" : "femi"}MP3`;
}

function buildTrial() {
  const targetVoice: Voice = Math.random() < 0.5 ? "male" : "female";
  const otherVoice: Voice = targetVoice === "male" ? "female" : "male";

  const maleDigits = sampleDigits(TOTAL_DIGITS_PER_VOICE);
  const femaleDigits = sampleDigits(TOTAL_DIGITS_PER_VOICE);

  const targetSequence = targetVoice === "male" ? maleDigits : femaleDigits;
  const distractorSequence = targetVoice === "male" ? femaleDigits : maleDigits;

  const fullSequence: TrialAudioItem[] = [];

  for (let i = 0; i < TOTAL_DIGITS_PER_VOICE; i++) {
    fullSequence.push({
      digit: targetSequence[i],
      voice: targetVoice,
      src: fileForDigit(targetSequence[i], targetVoice),
    });
    fullSequence.push({
      digit: distractorSequence[i],
      voice: otherVoice,
      src: fileForDigit(distractorSequence[i], otherVoice),
    });
  }

  return {
    targetVoice,
    targetSequence,
    distractorSequence,
    fullSequence,
  };
}

export function EscutaSeletivaCocktailPartyMobileGame({
  onComplete,
  totalTrials = TOTAL_TRIALS_DEFAULT,
}: Props) {
  const [phase, setPhase] = useState<"intro" | "ready" | "playing" | "answering" | "feedback" | "finished">("intro");
  const [trialIndex, setTrialIndex] = useState(0);
  const [currentTrial, setCurrentTrial] = useState(buildTrial);
  const [answer, setAnswer] = useState(["", "", ""]);
  const [feedback, setFeedback] = useState<null | { correct: boolean; expected: number[] }>(null);
  const [results, setResults] = useState<TrialResult[]>([]);
  const answerStartRef = useRef<number | null>(null);

  const isLastTrial = trialIndex >= totalTrials - 1;

  const playSingle = useCallback((src: string) => {
    return new Promise<void>((resolve, reject) => {
      const audio = new Audio(src);
      audio.preload = "auto";

      const cleanup = () => {
        audio.onended = null;
        audio.onerror = null;
      };

      audio.onended = () => {
        cleanup();
        resolve();
      };

      audio.onerror = () => {
        cleanup();
        reject(new Error(`Falha ao tocar áudio: ${src}`));
      };

      audio.play().catch(reject);
    });
  }, []);

  const playSequence = useCallback(async () => {
    setPhase("playing");
    for (const item of currentTrial.fullSequence) {
      await playSingle(item.src);
      await new Promise((r) => setTimeout(r, 400));
    }
    setPhase("answering");
    answerStartRef.current = performance.now();
  }, [currentTrial.fullSequence, playSingle]);

  const updateAnswer = (index: number, value: string) => {
    const sanitized = value.replace(/\D/g, "").slice(0, 1);
    setAnswer((prev) => {
      const next = [...prev];
      next[index] = sanitized;
      return next;
    });
  };

  const submitAnswer = useCallback(() => {
    if (answer.some((v) => v === "")) return;

    const userAnswer = answer.map((v) => Number(v));
    const expected = currentTrial.targetSequence;
    const correct = expected.every((digit, i) => digit === userAnswer[i]);
    const responseTimeMs = answerStartRef.current ? Math.round(performance.now() - answerStartRef.current) : 0;

    const result: TrialResult = {
      trial: trialIndex + 1,
      targetVoice: currentTrial.targetVoice,
      targetSequence: currentTrial.targetSequence,
      distractorSequence: currentTrial.distractorSequence,
      fullSequence: currentTrial.fullSequence.map((item) => ({ digit: item.digit, voice: item.voice })),
      userAnswer,
      correct,
      responseTimeMs,
    };

    const updated = [...results, result];
    setResults(updated);
    setFeedback({ correct, expected });

    if (isLastTrial) {
      const hits = updated.filter((r) => r.correct).length;
      onComplete?.({
        game: "escuta-seletiva-cocktail-party-mobile",
        totalTrials,
        hits,
        errors: totalTrials - hits,
        accuracy: totalTrials ? hits / totalTrials : 0,
        trials: updated,
        finishedAt: new Date().toISOString(),
      });
      setPhase("finished");
      return;
    }

    setPhase("feedback");
  }, [answer, currentTrial, isLastTrial, onComplete, results, totalTrials, trialIndex]);

  const nextTrial = useCallback(() => {
    const nextIndex = trialIndex + 1;
    setTrialIndex(nextIndex);
    setCurrentTrial(buildTrial());
    setAnswer(["", "", ""]);
    setFeedback(null);
    setPhase("ready");
  }, [trialIndex]);


  return (
    <div className="w-full max-w-md mx-auto rounded-2xl border border-white/10 bg-neutral-900 p-4 text-white">
      {phase === "intro" && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Escuta seletiva</h2>
          <p className="text-sm text-neutral-300">
            Você ouvirá 6 números alternando entre voz masculina e feminina. Foque apenas na voz-alvo indicada e depois digite os 3 números dessa voz, na ordem.
          </p>
          <button
            onClick={() => setPhase("ready")}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 font-medium"
          >
            Iniciar treino
          </button>
        </div>
      )}

      {phase === "ready" && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Rodada {trialIndex + 1}</h2>
          <p className="text-base">
            Voz-alvo: <strong>{voiceLabel(currentTrial.targetVoice)}</strong>
          </p>
          <button
            onClick={playSequence}
            className="w-full rounded-xl bg-green-600 px-4 py-3 font-medium"
          >
            Ouvir sequência
          </button>
          <button
            onClick={() => playSingle('/audio/0_masc.MP3')}
            className="w-full rounded-xl bg-yellow-600 px-4 py-3 font-medium"
          >
            Testar áudio
          </button>
        </div>
      )}

      {phase === "playing" && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Reproduzindo</h2>
          <p className="text-sm text-neutral-300">Escute apenas a voz-alvo.</p>
        </div>
      )}

      {phase === "answering" && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Sua resposta</h2>
          <p className="text-sm text-neutral-300">
            Digite os 3 números da voz <strong>{voiceLabel(currentTrial.targetVoice)}</strong>.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {answer.map((value, index) => (
              <input
                key={index}
                value={value}
                onChange={(e) => updateAnswer(index, e.target.value)}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                className="h-14 w-full rounded-xl border border-white/15 bg-neutral-800 text-center text-2xl outline-none"
              />
            ))}
          </div>
          <button
            onClick={submitAnswer}
            disabled={answer.some((v) => v === "")}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 font-medium disabled:opacity-40"
          >
            Confirmar
          </button>
        </div>
      )}

      {phase === "feedback" && feedback && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{feedback.correct ? "Correto" : "Incorreto"}</h2>
          <p className="text-sm text-neutral-300">Sequência correta: {feedback.expected.join(" - ")}</p>
          <button
            onClick={nextTrial}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 font-medium"
          >
            Próxima rodada
          </button>
        </div>
      )}

      {phase === "finished" && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Treino finalizado</h2>
          <p className="text-sm text-neutral-300">
            Acertos: {results.filter((r) => r.correct).length} de {results.length}
          </p>
        </div>
      )}
    </div>
  );
}
