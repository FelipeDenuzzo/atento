"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";

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
  onComplete: (report: {
    success: boolean;
    pointsEarned: number;
    report: any;
  }) => void;
  totalTrials: number;
  basePoints: number;
  reportContext: any;
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
  return `/audio/${digit}_${voice === "male" ? "masc" : "femi"}.MP3`;
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

export function EscutaSeletivaCocktailPartyDesktopGame({
  onComplete,
  totalTrials,
  basePoints,
  reportContext,
}: Props) {
  // Confirma execução do componente
  console.error("[ATENTO] EscutaSeletivaCocktailPartyDesktopGame EXECUTADO", { basePoints, totalTrials, reportContext });
  const [phase, setPhase] = useState<"intro" | "countdown" | "playing" | "answering" | "feedback" | "finished">("intro");
  const [trialIndex, setTrialIndex] = useState(0);
  const [currentTrial, setCurrentTrial] = useState(buildTrial);
  const [answer, setAnswer] = useState(["", "", ""]);
  const [feedback, setFeedback] = useState<null | { correct: boolean; expected: number[] }>(null);
  const [results, setResults] = useState<TrialResult[]>([]);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const answerStartRef = useRef<number | null>(null);
  const isLastTrial = trialIndex >= totalTrials - 1;

  const instructions = useMemo(
    () =>
      `Neste treino, você ouvirá uma sequência de 6 números, alternando entre uma voz masculina e uma feminina. Sua tarefa é prestar atenção apenas na voz-alvo indicada e, ao final, digitar os 3 números falados por essa voz, ignorando os números da outra voz. Recomendamos o uso de fones de ouvido.`,
    []
  );

  const unlockAudio = useCallback(async () => {
    try {
      const audio = new Audio();
      audio.volume = 0;
      setAudioUnlocked(true);
    } catch {
      setAudioUnlocked(false);
    }
  }, []);

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
      console.log('[ATENTO][PLAY SEQUENCE] Tocando áudio:', item.src);
      await playSingle(item.src);
      await new Promise((r) => setTimeout(r, 350));
    }
    console.log('[ATENTO][PLAY SEQUENCE] Fim da sequência, indo para answering');
    setPhase("answering");
    answerStartRef.current = performance.now();
  }, [currentTrial.fullSequence, playSingle]);


  // Função para iniciar a reprodução após a contagem
const beginPlayback = useCallback(async () => {
  console.log('[ATENTO][BEGIN PLAYBACK] Iniciando beginPlayback');
  await unlockAudio();
  await playSequence();
}, [playSequence, unlockAudio]);

  // Inicia a contagem regressiva ao clicar em "Iniciar treino"
  const startCountdown = useCallback(() => {
    setCountdown(3);
    setPhase("countdown");
    if (countdownRef.current) clearInterval(countdownRef.current);
    let current = 3;
    countdownRef.current = setInterval(() => {
      current -= 1;
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          setPhase("playing");
          // beginPlayback será chamado via useEffect abaixo
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Garante que beginPlayback é chamado sempre que a fase muda para 'playing'
  React.useEffect(() => {
    if (phase === "playing") {
      beginPlayback();
    }
  }, [phase, beginPlayback]);

  const updateAnswer = (index: number, value: string) => {
    const sanitized = value.replace(/\D/g, "").slice(0, 1);
    setAnswer((prev) => {
      const next = [...prev];
      next[index] = sanitized;
      return next;
    });
  };

  const submitAnswer = useCallback(() => {
    const userAnswer = answer.map((v) => Number(v));
    if (answer.some((v) => v === "")) return;

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
    setPhase("feedback");

    if (isLastTrial) {
      const hits = updated.filter((r) => r.correct).length;
      const report = {
        game: "escuta-seletiva-cocktail-party",
        totalTrials,
        hits,
        errors: totalTrials - hits,
        accuracy: totalTrials ? hits / totalTrials : 0,
        trials: updated,
        finishedAt: new Date().toISOString(),
        ...reportContext,
      };
      const pointsEarned = hits * basePoints;
      onComplete({
        success: hits === totalTrials,
        pointsEarned,
        report,
      });
      setPhase("finished");
    }
  }, [answer, currentTrial, isLastTrial, onComplete, results, totalTrials, trialIndex]);

  const nextTrial = useCallback(() => {
    const nextIndex = trialIndex + 1;
    if (nextIndex >= totalTrials) {
      setPhase("finished");
      return;
    }
    setTrialIndex(nextIndex);
    setCurrentTrial(buildTrial());
    setAnswer(["", "", ""]);
    setFeedback(null);
    setCountdown(3);
    setPhase("countdown");
    // O startCountdown não é chamado aqui, pois a transição para 'playing' já será tratada pelo useEffect
  }, [totalTrials, trialIndex]);


  return (
    <div className="w-full max-w-3xl mx-auto rounded-2xl border border-white/10 bg-neutral-900 p-6 text-white">
      {phase === "intro" && (
        <div className="space-y-4">
          <p className="text-sm text-neutral-300">
            Neste treino, você ouvirá uma sequência de 6 números, alternando entre uma voz masculina e uma feminina. Sua tarefa é prestar atenção apenas na voz-alvo indicada e, ao final, digitar os 3 números falados por essa voz, ignorando os números da outra voz. Recomendamos o uso de fones de ouvido.
          </p>

          <button
            onClick={() => playSingle('/audio/0_masc.MP3')}
            className="rounded-xl bg-yellow-600 px-4 py-2 font-medium hover:bg-yellow-500"
          >
            Testar áudio
          </button>

          <p className="text-base text-neutral-200 mt-2">
            Voz-alvo desta rodada: {" "}
            <span className="font-semibold">
              {voiceLabel(currentTrial.targetVoice).toUpperCase()}
            </span>
          </p>

          <button
            onClick={startCountdown}
            className="rounded-xl bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500"
          >
            Iniciar treino
          </button>
        </div>
      )}

      {phase === "countdown" && (
        <div className="flex flex-col items-center justify-center space-y-4 min-h-[180px]">
          <p className="text-3xl font-bold">{countdown}</p>
          <p className="text-base text-neutral-200 mt-2">
            Voz-alvo desta rodada: <span className="font-semibold">{voiceLabel(currentTrial.targetVoice).toUpperCase()}</span>
          </p>
          <p className="text-sm text-neutral-300">Prepare-se! O treino começará em instantes.</p>
        </div>
      )}

      {phase === "playing" && (
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold">Reproduzindo</h2>
          <p className="text-neutral-300">Escute com atenção apenas a voz-alvo.</p>
        </div>
      )}

      {phase === "answering" && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Digite a sequência</h2>
          <p className="text-neutral-300">
            Digite os 3 números da voz alvo <strong>{voiceLabel(currentTrial.targetVoice)}</strong>.
          </p>
          <div className="flex gap-3">
            {answer.map((value, index) => (
              <input
                key={index}
                value={value}
                onChange={(e) => updateAnswer(index, e.target.value)}
                inputMode="numeric"
                maxLength={1}
                className="h-14 w-14 rounded-xl border border-white/15 bg-neutral-800 text-center text-2xl outline-none"
              />
            ))}
          </div>
          <button
            onClick={submitAnswer}
            disabled={answer.some((v) => v === "")}
            className="rounded-xl bg-blue-600 px-4 py-2 font-medium disabled:opacity-40"
          >
            Confirmar
          </button>
        </div>
      )}

      {phase === "feedback" && feedback && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">{feedback.correct ? "Correto" : "Incorreto"}</h2>
          <p className="text-neutral-300">
            Sequência correta: {feedback.expected.join(" - ")}
          </p>
          <button
            onClick={() => {
              if (isLastTrial) {
                // Garante chamada de onComplete caso usuário clique em Finalizar
                const hits = [...results, {
                  trial: trialIndex + 1,
                  targetVoice: currentTrial.targetVoice,
                  targetSequence: currentTrial.targetSequence,
                  distractorSequence: currentTrial.distractorSequence,
                  fullSequence: currentTrial.fullSequence.map((item) => ({ digit: item.digit, voice: item.voice })),
                  userAnswer: answer.map((v) => Number(v)),
                  correct: feedback.correct,
                  responseTimeMs: answerStartRef.current ? Math.round(performance.now() - answerStartRef.current) : 0,
                }];
                const totalHits = hits.filter((r) => r.correct).length;
                const report = {
                  game: "escuta-seletiva-cocktail-party",
                  totalTrials,
                  hits: totalHits,
                  errors: totalTrials - totalHits,
                  accuracy: totalTrials ? totalHits / totalTrials : 0,
                  trials: hits,
                  finishedAt: new Date().toISOString(),
                  ...reportContext,
                };
                const pointsEarned = totalHits * basePoints;
                onComplete({
                  success: totalHits === totalTrials,
                  pointsEarned,
                  report,
                });
                setPhase("finished");
              } else {
                nextTrial();
              }
            }}
            className="rounded-xl bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500"
          >
            {isLastTrial ? "Finalizar" : "Próxima rodada"}
          </button>
        </div>
      )}

      {phase === "finished" && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Treino finalizado</h2>
          <p className="text-neutral-300">
            Acertos: {results.filter((r) => r.correct).length} de {results.length}
          </p>
        </div>
      )}
    </div>
  );
}
