"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

// --- Ajuste aqui para mudar as cores disponíveis ---
const COLORS = [
  { name: "vermelho", label: "Vermelho", hex: "#dc2626" },
  { name: "azul", label: "Azul", hex: "#2563eb" },
  { name: "verde", label: "Verde", hex: "#16a34a" },
  { name: "amarelo", label: "Amarelo", hex: "#eab308" },
  { name: "roxo", label: "Roxo", hex: "#9333ea" },
  { name: "laranja", label: "Laranja", hex: "#ea580c" },
];
type ColorName = (typeof COLORS)[number]["name"];

// --- Ajuste aqui para mudar o número de trials ---
const TOTAL_TRIALS = 36;

// --- Ajuste aqui para lógica de progressão ---
const PROGRESSION = [
  { activeColors: 3, time: 3500 }, // início fácil
  { activeColors: 4, time: 3000 },
  { activeColors: 5, time: 2500 },
  { activeColors: 6, time: 2000 }, // mais difícil
];

type StroopInvertidoProps = {
  basePoints: number;
  startingLevel: number;
  maxLevelHint: number;
  onComplete: (result: {
    totalTrials: number;
    correct: number;
    wrong: number;
    accuracy: number;
    reactionTimes?: number[];
    finalLevel?: number;
    totalPoints?: number;
  }) => void;
  onEnd?: (result: {
    totalTrials: number;
    correct: number;
    wrong: number;
    accuracy: number;
    reactionTimes?: number[];
  }) => void;
  onCorrectSound?: () => void;
  onErrorSound?: () => void;
};

type Trial = {
  word: ColorName;
  ink: ColorName;
  congruent: boolean;
};

export const StroopInvertido: React.FC<StroopInvertidoProps> = ({
  basePoints,
  startingLevel,
  maxLevelHint,
  onComplete,
  onEnd,
  onCorrectSound,
  onErrorSound,
}) => {
  const [step, setStep] = useState<"instructions" | "playing" | "finished">(
    "instructions",
  );
  const [trials, setTrials] = useState<Trial[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<{ correct: boolean; rt: number }[]>(
    [],
  );
  const [startTime, setStartTime] = useState<number>(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Gera os trials da sessão
  useEffect(() => {
    if (step === "playing") {
      const generated: Trial[] = [];
      let progIdx = 0;
      for (let i = 0; i < TOTAL_TRIALS; i++) {
        if (
          i > 0 &&
          i % Math.ceil(TOTAL_TRIALS / PROGRESSION.length) === 0 &&
          progIdx < PROGRESSION.length - 1
        )
          progIdx++;
        const { activeColors } = PROGRESSION[progIdx];
        const colorSet = COLORS.slice(0, activeColors);
        const congruent = Math.random() < 0.5;
        let word: ColorName, ink: ColorName;
        if (congruent) {
          word = ink =
            colorSet[Math.floor(Math.random() * colorSet.length)].name;
        } else {
          word = colorSet[Math.floor(Math.random() * colorSet.length)].name;
          do {
            ink = colorSet[Math.floor(Math.random() * colorSet.length)].name;
          } while (ink === word);
        }
        generated.push({ word, ink, congruent });
      }
      setTrials(generated);
      setCurrent(0);
      setAnswers([]);
      setFeedback(null);
      setStartTime(Date.now());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Avança para o próximo trial ou finaliza
  const nextTrial = useCallback(() => {
    if (current + 1 < trials.length) {
      setCurrent((c) => c + 1);
      setStartTime(Date.now());
      setFeedback(null);
    } else {
      setStep("finished");

      const correct = answers.filter((a) => a.correct).length;
      const wrong = answers.length - correct;
      const accuracy = answers.length ? correct / answers.length : 0;
      const reactionTimes = answers.map((a) => a.rt);

      if (onEnd) {
        onEnd({
          totalTrials: answers.length,
          correct,
          wrong,
          accuracy,
          reactionTimes,
        });
      }

      if (onComplete) {
        onComplete({
          totalTrials: answers.length,
          correct,
          wrong,
          accuracy,
          reactionTimes,
          finalLevel: PROGRESSION.length,
          // totalPoints: basePoints * correct, // se quiser usar depois
        });
      }
    }
  }, [current, trials.length, answers, onEnd, onComplete]);

  // Handler de resposta
  const handleAnswer = (color: ColorName) => {
    if (feedback) return;
    const trial = trials[current];
    const correct = color === trial.ink;
    const rt = Date.now() - startTime;
    setAnswers((prev) => [...prev, { correct, rt }]);
    setFeedback(correct ? "correct" : "wrong");
    // som de acerto/erro
    if (correct && onCorrectSound) onCorrectSound();
    if (!correct && onErrorSound) onErrorSound();
    // Avança após breve delay
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const progIdx = Math.min(
      PROGRESSION.length - 1,
      Math.floor(current / (TOTAL_TRIALS / PROGRESSION.length)),
    );
    timeoutRef.current = setTimeout(
      nextTrial,
      PROGRESSION[progIdx].time * 0.5,
    );
  };

  // Timeout automático para resposta
  useEffect(() => {
    if (step !== "playing" || !trials.length) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const progIdx = Math.min(
      PROGRESSION.length - 1,
      Math.floor(current / (TOTAL_TRIALS / PROGRESSION.length)),
    );
    timeoutRef.current = setTimeout(() => {
      handleAnswer("" as ColorName); // resposta vazia = erro
    }, PROGRESSION[progIdx].time);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, step, trials]);

  // Layout mobile-friendly
  return (
    <div
      className="stroop-invertido-root"
      style={{
        maxWidth: 400,
        margin: "0 auto",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {step === "instructions" && (
        <>
          <h2 style={{ fontSize: 24, marginBottom: 8 }}>Stroop Invertido</h2>
          <p style={{ fontSize: 16, marginBottom: 24, textAlign: "center" }}>
            Uma palavra vai aparecer na tela escrita em uma cor. Sua tarefa é identificar <strong>a cor em que a palavra está escrita</strong> — e não o que a palavra diz. Por exemplo, se a palavra "AZUL" aparecer escrita em vermelho, a resposta correta é <strong>vermelho</strong>. Responda o mais rápido que conseguir. A cada fase, o ritmo aumenta e as combinações ficam mais desafiadoras.
          </p>
          <button
            style={{ fontSize: 20, padding: "12px 32px", borderRadius: 8 }}
            onClick={() => setStep("playing")}
          >
            Começar
          </button>
        </>
      )}

      {step === "playing" && trials.length > 0 && (
        <>
          <div
            style={{
              margin: "24px 0 16px 0",
              minHeight: 60,
              textAlign: "center",
            }}
          >
            <span
              style={{
                color: COLORS.find((c) => c.name === trials[current].ink)?.hex,
                fontSize: 40,
                fontWeight: "bold",
                letterSpacing: 2,
                textTransform: "uppercase",
                background:
                  feedback === "correct"
                    ? "#d1fae5"
                    : feedback === "wrong"
                    ? "#fee2e2"
                    : undefined,
                borderRadius: 8,
                padding: "8px 16px",
                transition: "background 0.2s",
                display: "inline-block",
                minWidth: 120,
              }}
            >
              {COLORS.find((c) => c.name === trials[current].word)?.label}
            </span>
          </div>
          <div
            style={{
              width: "100%",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 16,
            }}
          >
            {COLORS.slice(
              0,
              PROGRESSION[
                Math.min(
                  PROGRESSION.length - 1,
                  Math.floor(current / (TOTAL_TRIALS / PROGRESSION.length)),
                )
              ].activeColors,
            ).map((color) => (
              <button
                key={color.name}
                style={{
                  background: color.hex,
                  color: "#fff",
                  fontWeight: "bold",
                  fontSize: 20,
                  border: "none",
                  borderRadius: 10,
                  padding: "18px 0",
                  margin: 0,
                  width: "100%",
                  minHeight: 56,
                  opacity:
                    feedback && color.name !== trials[current].ink ? 0.5 : 1,
                  boxShadow:
                    feedback && color.name === trials[current].ink
                      ? "0 0 0 3px #22d3ee"
                      : undefined,
                  transition: "opacity 0.2s, box-shadow 0.2s",
                  cursor: feedback ? "not-allowed" : "pointer",
                }}
                disabled={!!feedback}
                onClick={() => handleAnswer(color.name as ColorName)}
              >
                {color.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 16, marginBottom: 8 }}>
            {current + 1} / {trials.length}
          </div>
        </>
      )}

      {step === "finished" && (
        <div style={{ textAlign: "center" }}>
          <h3>Fim da sessão</h3>
          <p>Resumo (debug):</p>
          <ul style={{ listStyle: "none", padding: 0, fontSize: 16 }}>
            <li>Total de tentativas: {answers.length}</li>
            <li>Acertos: {answers.filter((a) => a.correct).length}</li>
            <li>Erros: {answers.filter((a) => !a.correct).length}</li>
            <li>
              Precisão:{" "}
              {answers.length
                ? (
                    (answers.filter((a) => a.correct).length / answers.length) *
                    100
                  ).toFixed(1)
                : 0}
              %
            </li>
            <li>
              Tempo médio de reação:{" "}
              {answers.length
                ? Math.round(
                    answers.reduce((acc, a) => acc + a.rt, 0) /
                      answers.length,
                  )
                : 0}{" "}
              ms
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};
