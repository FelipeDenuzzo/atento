"use client";

import { useMemo, useState } from "react";
import {
  attentionTypeDescriptions,
  formatAttentionType,
  trainingPlans,
} from "@/data/trainingPlans";
import { AttentionType, TrainingPlan } from "@/types/game";
import { VisualSearchHunt } from "@/components/VisualSearchHunt";
import { StroopInvertido } from "@/components/StroopInvertido";

type GameStage = "intro" | "instructions" | "exercise" | "result";

const stageTitle: Record<GameStage, string> = {
  intro: "Treino de Atenção",
  instructions: "Orientações do próximo exercício",
  exercise: "Exercício em andamento",
  result: "Resultado final",
};

function getTransitionText(
  currentType: AttentionType,
  previousType: AttentionType | null,
): string {
  if (!previousType || previousType === currentType) {
    return `Você seguirá no tipo ${formatAttentionType(currentType).toLowerCase()}.`;
  }

  return `Mudança de foco: de ${formatAttentionType(previousType).toLowerCase()} para ${formatAttentionType(currentType).toLowerCase()}.`;
}

export function AttentionTrainingGame() {
  const [stage, setStage] = useState<GameStage>("intro");
  const [selectedPlanId, setSelectedPlanId] = useState<string>(trainingPlans[0].id);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const selectedPlan: TrainingPlan = useMemo(
    () =>
      trainingPlans.find((plan) => plan.id === selectedPlanId) ?? trainingPlans[0],
    [selectedPlanId],
  );

  const currentExercise = selectedPlan.exercises[currentIndex];
  const previousExercise =
    currentIndex > 0 ? selectedPlan.exercises[currentIndex - 1] : null;
  const totalPossible = selectedPlan.exercises.reduce(
    (sum, exercise) => sum + exercise.points,
    0,
  );

  const startPlan = () => {
    setCurrentIndex(0);
    setScore(0);
    setHits(0);
    setSelectedOption(null);
    setSubmitted(false);
    setStage("instructions");
  };

  const submitAnswer = () => {
    if (
      selectedOption === null ||
      !currentExercise ||
      currentExercise.kind !== "quiz"
    ) {
      return;
    }

    const isCorrect = selectedOption === currentExercise.correctOptionIndex;
    if (isCorrect) {
      setScore((value) => value + currentExercise.points);
      setHits((value) => value + 1);
    }
    setSubmitted(true);
  };

  const nextExercise = () => {
    const nextIndex = currentIndex + 1;
    setSelectedOption(null);
    setSubmitted(false);

    if (nextIndex >= selectedPlan.exercises.length) {
      setStage("result");
      return;
    }

    setCurrentIndex(nextIndex);
    setStage("instructions");
  };

  const restart = () => {
    setStage("intro");
    setCurrentIndex(0);
    setScore(0);
    setHits(0);
    setSelectedOption(null);
    setSubmitted(false);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-10">
      <section className="w-full rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-zinc-500">{stageTitle[stage]}</p>

        {stage === "intro" && (
          <div className="mt-4 space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-zinc-900">
                Jogo de Treino de Atenção
              </h1>
              <p className="text-zinc-600">
                Treine atenção seletiva, sustentada, dividida e alternada com
                exercícios curtos, orientações antes de cada etapa e pontuação
                total ao final.
              </p>
            </div>

            <div className="grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
              {(Object.keys(attentionTypeDescriptions) as AttentionType[]).map(
                (type) => {
                  const isCurrentType = selectedPlan.exercises.length > 0 && selectedPlan.exercises[0].attentionType === type;
                  return (
                    <div
                      key={type}
                      className={`rounded-lg border p-3 ${
                        isCurrentType
                          ? "border-4 border-blue-500 bg-blue-50"
                          : "border border-black/10 bg-zinc-50"
                      }`}
                    >
                      <p className="font-semibold text-zinc-900">
                        {formatAttentionType(type)}
                      </p>
                      <p>{attentionTypeDescriptions[type]}</p>
                    </div>
                  );
                },
              )}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-zinc-700">
                Escolha o formato do treino:
              </p>
              <div className="grid gap-3">
                {trainingPlans.map((plan) => (
                  <label
                    key={plan.id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-black/10 p-3"
                  >
                    <input
                      type="radio"
                      name="plan"
                      checked={selectedPlanId === plan.id}
                      onChange={() => setSelectedPlanId(plan.id)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block font-semibold text-zinc-900">
                        {plan.name}
                      </span>
                      <span className="block text-sm text-zinc-600">
                        {plan.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={startPlan}
              className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
            >
              Iniciar treino
            </button>
          </div>
        )}

        {stage === "instructions" && currentExercise && (
          <div className="mt-4 space-y-5">
            <h2 className="text-2xl font-semibold text-zinc-900">
              {currentExercise.title}
            </h2>
            <div className="rounded-lg border border-black/10 bg-zinc-50 p-4 text-zinc-700">
              <p className="font-medium text-zinc-900">
                {formatAttentionType(currentExercise.attentionType)}
              </p>
              <p className="mt-1">
                {getTransitionText(
                  currentExercise.attentionType,
                  previousExercise?.attentionType ?? null,
                )}
              </p>
              <p className="mt-3">{currentExercise.instructions}</p>
            </div>
            <button
              type="button"
              onClick={() => setStage("exercise")}
              className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
            >
              Começar exercício
            </button>
          </div>
        )}

        {stage === "exercise" && currentExercise && (
          <div className="mt-4 space-y-6">
            <div className="space-y-1">
              {currentExercise.kind === "quiz" ? (
                <h2 className="text-xl font-semibold text-zinc-900">
                  {currentExercise.question}
                </h2>
              ) : currentExercise.kind === "visual-search" ? (
                <h2 className="text-xl font-semibold text-zinc-900">
                  Caça ao Alvo (Visual Search)
                </h2>
              ) : (
                <h2 className="text-xl font-semibold text-zinc-900">
                  Stroop Invertido
                </h2>
              )}
            </div>

            {currentExercise.kind === "quiz" ? (
              <>
                <div className="grid gap-3">
                  {currentExercise.options.map((option, index) => {
                    const isCorrect = index === currentExercise.correctOptionIndex;
                    const isSelected = selectedOption === index;

                    let classes = "border-black/10 bg-white";
                    if (submitted && isCorrect) {
                      classes = "border-emerald-300 bg-emerald-50";
                    } else if (submitted && isSelected && !isCorrect) {
                      classes = "border-rose-300 bg-rose-50";
                    } else if (!submitted && isSelected) {
                      classes = "border-zinc-900 bg-zinc-100";
                    }

                    return (
                      <button
                        key={option + index}
                        type="button"
                        onClick={() => !submitted && setSelectedOption(index)}
                        disabled={submitted}
                        className={`rounded-lg border p-3 text-left text-zinc-800 ${classes}`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-3">
                  {!submitted ? (
                    <button
                      type="button"
                      onClick={submitAnswer}
                      disabled={selectedOption === null}
                      className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
                    >
                      Confirmar resposta
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={nextExercise}
                      className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
                    >
                      {currentIndex + 1 === selectedPlan.exercises.length
                        ? "Ver resultado"
                        : "Próximo exercício"}
                    </button>
                  )}
                </div>
              </>
            ) : currentExercise.kind === "visual-search" ? (
              <>
                {!submitted ? (
                  <VisualSearchHunt
                    basePoints={currentExercise.points}
                    startingLevel={currentExercise.startingLevel}
                    maxLevelHint={currentExercise.maxLevelHint}
                    onComplete={({ success, pointsEarned }) => {
                      setScore((value) => value + pointsEarned);
                      if (success) {
                        setHits((value) => value + 1);
                      }
                      setSubmitted(true);
                    }}
                  />
                ) : (
                  <div className="space-y-3 rounded-lg border border-black/10 bg-zinc-50 p-4">
                    <p className="text-sm text-zinc-700">
                      Exercício concluído. Continue para o próximo desafio.
                    </p>
                    <button
                      type="button"
                      onClick={nextExercise}
                      className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
                    >
                      {currentIndex + 1 === selectedPlan.exercises.length
                        ? "Ver resultado"
                        : "Próximo exercício"}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                {!submitted ? (
                  <StroopInvertido
                    basePoints={currentExercise.points}
                    startingLevel={currentExercise.startingLevel}
                    maxLevelHint={currentExercise.maxLevelHint}
                    onComplete={({ success, pointsEarned }) => {
                      setScore((value) => value + pointsEarned);
                      if (success) {
                        setHits((value) => value + 1);
                      }
                      setSubmitted(true);
                    }}
                  />
                ) : (
                  <div className="space-y-3 rounded-lg border border-black/10 bg-zinc-50 p-4">
                    <p className="text-sm text-zinc-700">
                      Exercício concluído. Continue para o próximo desafio.
                    </p>
                    <button
                      type="button"
                      onClick={nextExercise}
                      className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
                    >
                      {currentIndex + 1 === selectedPlan.exercises.length
                        ? "Ver resultado"
                        : "Próximo exercício"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {stage === "result" && (
          <div className="mt-4 space-y-5">
            <h2 className="text-2xl font-semibold text-zinc-900">
              Treino concluído
            </h2>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-black/10 bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Plano</p>
                <p className="font-semibold text-zinc-900">{selectedPlan.name}</p>
              </div>
              <div className="rounded-lg border border-black/10 bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Acertos</p>
                <p className="font-semibold text-zinc-900">
                  {hits}/{selectedPlan.exercises.length}
                </p>
              </div>
              <div className="rounded-lg border border-black/10 bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Pontuação total</p>
                <p className="font-semibold text-zinc-900">
                  {score}/{totalPossible}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={restart}
              className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
            >
              Jogar novamente
            </button>
          </div>
        )}
      </section>
    </main>
  );
}