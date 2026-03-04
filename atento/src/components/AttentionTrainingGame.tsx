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
import { FlankerSetas } from "@/components/FlankerSetas";
import { EscutaSeletivaCocktailParty } from "@/components/EscutaSeletivaCocktailParty";
import { GoNoGoQuickClick } from "@/components/GoNoGoQuickClick";
import { GoNoGoExpandidoGame } from "@/games/go-no-go-expandido/GoNoGoExpandidoGame";
import { FiltroCoresComSomGame } from "@/games/filtro-cores-com-som/FiltroCoresComSomGame";
import { ContagemEstimulosFluxoGame } from "@/games/contagem-estimulos-fluxo/ContagemEstimulosFluxoGame";
import { LabirintosProlongadosGame } from "@/games/labirintos-prolongados/LabirintosProlongadosGame";
import { MapaDeSimbolosGame } from "@/games/mapa-de-simbolos/MapaDeSimbolosGame";
import { BuscaSimbolosMatrizGame } from "@/games/busca-simbolos-matriz/BuscaSimbolosMatrizGame";

type GameStage = "intro" | "instructions" | "exercise" | "result";
type TrainingMode = "sequence" | "single" | null;
type SessionMode = "sequence" | "single";

export type ReportContext = {
  mode: SessionMode;
  scopeLabel: string;
};

const stageTitle: Record<GameStage, string> = {
  intro: "Treino de Atenção",
  instructions: "Orientações do próximo exercício",
  exercise: "Exercício em andamento",
  result: "Resultado final",
};

export function AttentionTrainingGame() {
  const getFocusedPlanByAttentionType = (
    type: AttentionType,
  ): TrainingPlan | undefined =>
    trainingPlans.find((plan) => plan.id === `foco-${type}`);

  const getPlanIdByAttentionType = (type: AttentionType): string => {
    const focusedPlan = getFocusedPlanByAttentionType(type);
    if (focusedPlan) return focusedPlan.id;
    if (type === "seletiva") {
      return trainingPlans.find((plan) => plan.id === "foco-seletiva")?.id ?? "";
    }
    return "";
  };

  const hasExercisesByAttentionType = (type: AttentionType): boolean => {
    const focusedPlan = getFocusedPlanByAttentionType(type);
    return Boolean(
      focusedPlan?.exercises.some(
        (exercise) => exercise.attentionType === type && exercise.kind !== "quiz",
      ),
    );
  };

  const [selectedAttentionType, setSelectedAttentionType] = useState<AttentionType>(
    "seletiva",
  );
  const defaultPlanId = getPlanIdByAttentionType("seletiva");
  const [stage, setStage] = useState<GameStage>("intro");
  const [selectedPlanId, setSelectedPlanId] = useState<string>(defaultPlanId);
  const [trainingMode, setTrainingMode] = useState<TrainingMode>(null);
  const [selectedSingleTitle, setSelectedSingleTitle] = useState<string | null>(null);
  const [introSelection, setIntroSelection] = useState<"initial" | "choose-exercise">(
    "initial",
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cocktailStartLevelOverride, setCocktailStartLevelOverride] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [quizResults, setQuizResults] = useState<Array<{ correct: boolean }>>([]);
  const [showingQuizResults, setShowingQuizResults] = useState(false);

  const fallbackPlanId = getPlanIdByAttentionType("seletiva");
  const selectedPlan: TrainingPlan = useMemo(
    () =>
      trainingPlans.find((plan) => plan.id === selectedPlanId) ??
      trainingPlans.find((plan) => plan.id === fallbackPlanId) ??
      trainingPlans[0],
    [selectedPlanId, fallbackPlanId],
  );

  const sequenceExercises = useMemo(
    () =>
      selectedPlan.exercises.filter(
        (exercise) => exercise.attentionType === selectedAttentionType,
      ),
    [selectedPlan.exercises, selectedAttentionType],
  );
  const activeExercises = trainingMode === "sequence" ? sequenceExercises : selectedPlan.exercises;
  const currentExercise = activeExercises[currentIndex];
  const countingFlowExerciseIndex = selectedPlan.exercises.findIndex(
    (exercise) =>
      exercise.kind === "counting-flow-task" &&
      exercise.attentionType === selectedAttentionType,
  );
  const longMazesExerciseIndex = selectedPlan.exercises.findIndex(
    (exercise) =>
      exercise.kind === "long-mazes" && exercise.attentionType === selectedAttentionType,
  );
  const quizExercises = activeExercises.filter(
    (exercise) => exercise.kind === "quiz",
  );
  const totalPossible = activeExercises.reduce(
    (sum, exercise) => sum + exercise.points,
    0,
  );
  const quizTotalPossible = quizExercises.reduce(
    (sum, exercise) => sum + exercise.points,
    0,
  );

  const resolvedSessionMode: SessionMode = trainingMode === "single" ? "single" : "sequence";
  const reportContext: ReportContext = {
    mode: resolvedSessionMode,
    scopeLabel:
      resolvedSessionMode === "single"
        ? selectedSingleTitle ?? currentExercise?.title ?? "Jogo individual"
        : selectedPlan.name,
  };

  const finalHitsTotal = resolvedSessionMode === "single" ? 1 : activeExercises.length;
  const finalScoreTotal =
    resolvedSessionMode === "single"
      ? (currentExercise?.points ?? 0)
      : totalPossible;

  const getStageForExercise = (
    exercise: TrainingPlan["exercises"][number] | undefined,
  ): GameStage => (exercise?.kind === "symbol-matrix-search" ? "exercise" : "instructions");


  const startPlan = () => {
    const focusedPlanId = getPlanIdByAttentionType(selectedAttentionType);
    if (!focusedPlanId) return;
    setSelectedPlanId(focusedPlanId);
    setTrainingMode("sequence");
    setSelectedSingleTitle(null);
    setCurrentIndex(0);
    setCocktailStartLevelOverride(null);
    setScore(0);
    setHits(0);
    setSelectedOption(null);
    setSubmitted(false);
    setQuizResults([]);
    setShowingQuizResults(false);
    setStage(getStageForExercise(activeExercises[0]));
  };

  const startFromExercise = (
    exerciseIndex: number,
    options?: { cocktailStartLevel?: number },
    startStage: GameStage = "exercise",
  ) => {
    const selectedExercise = selectedPlan.exercises[exerciseIndex];
    if (
      !selectedExercise ||
      selectedExercise.kind === "quiz" ||
      selectedExercise.attentionType !== selectedAttentionType
    ) {
      return;
    }

    setTrainingMode("single");
    setSelectedSingleTitle(selectedExercise.title);
    setCurrentIndex(exerciseIndex);
    setCocktailStartLevelOverride(options?.cocktailStartLevel ?? null);
    setScore(0);
    setHits(0);
    setSelectedOption(null);
    setSubmitted(false);
    setQuizResults([]);
    setShowingQuizResults(false);
    setStage(
      selectedExercise.kind === "symbol-matrix-search" ? "exercise" : startStage,
    );
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
    setQuizResults((prev) => [...prev, { correct: isCorrect }]);
    setSubmitted(true);
  };

  const nextExercise = () => {
    const nextIndex = currentIndex + 1;
    setSelectedOption(null);
    setSubmitted(false);

    const nextExerciseItem = activeExercises[nextIndex];
    const isTransitionFromQuizToNonQuiz =
      currentExercise?.kind === "quiz" && nextExerciseItem?.kind !== "quiz";

    if (isTransitionFromQuizToNonQuiz) {
      setCurrentIndex(nextIndex);
      setShowingQuizResults(true);
      setStage(getStageForExercise(nextExerciseItem));
      return;
    }

    if (nextIndex >= activeExercises.length) {
      setStage("result");
      return;
    }

    setCurrentIndex(nextIndex);
    setStage(getStageForExercise(nextExerciseItem));
  };

  const restart = () => {
    setTrainingMode(null);
    setSelectedSingleTitle(null);
    setIntroSelection("initial");
    setStage("intro");
    setCurrentIndex(0);
    setCocktailStartLevelOverride(null);
    setScore(0);
    setHits(0);
    setSelectedOption(null);
    setSubmitted(false);
    setQuizResults([]);
    setShowingQuizResults(false);
  };

  const confirmReturnToMenu = () => {
    if (typeof window === "undefined") return false;
    return window.confirm(
      "Voltar ao menu inicial? O progresso atual sera perdido.",
    );
  };

  const handleReturnToMenu = () => {
    if (!confirmReturnToMenu()) return;
    restart();
  };

  const downloadQuizResults = () => {
    const lines: string[] = [];
    lines.push("=" + "=".repeat(60));
    lines.push("RESULTADO - DESTAQUE O ALVO (Atenção Seletiva - Quiz)");
    lines.push("=" + "=".repeat(60));
    lines.push("");

    lines.push(`Escopo: ${
      reportContext.mode === "sequence"
        ? `Trilha completa (${reportContext.scopeLabel})`
        : `Jogo individual (${reportContext.scopeLabel})`
    }`);
    lines.push("");

    if (trainingMode === "sequence") {
      lines.push("Modo: Trilha percorrida");
      lines.push("");
    } else if (trainingMode === "single") {
      lines.push(`Modo: Jogo individual (${selectedSingleTitle ?? ""})`);
      lines.push("");
    }

    quizResults.forEach((result, idx) => {
      lines.push(`Fase ${idx + 1}: ${result.correct ? "✓ Acertou" : "✗ Errou"}`);
    });

    lines.push("");
    lines.push("=".repeat(62));
    lines.push(`Acertos: ${quizResults.filter((r) => r.correct).length}/${quizResults.length}`);
    lines.push(`Pontuação: ${score}/${quizTotalPossible}`);
    lines.push("=".repeat(62));
    lines.push("");
    lines.push(`Data: ${new Date().toLocaleString("pt-BR")}`);

    const text = lines.join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `destaque-o-alvo-resultado-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const continueAfterQuizResults = () => {
    setShowingQuizResults(false);
    if (currentIndex >= activeExercises.length) {
      setStage("result");
      return;
    }
    setStage(getStageForExercise(activeExercises[currentIndex]));
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-10">
      <section className="w-full rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-zinc-500">{stageTitle[stage]}</p>
          <button
            type="button"
            onClick={handleReturnToMenu}
            className="rounded-lg border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Voltar ao menu
          </button>
        </div>

        {stage === "intro" && (
          <div className="mt-4 space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-zinc-900">
                Treino de {formatAttentionType(selectedAttentionType)}
              </h1>
              <p className="text-zinc-600">
                Selecione o tipo de atencao e escolha seguir a sequencia de
                exercicios ou treinar um exercicio especifico.
              </p>
            </div>

            <div className="grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
              {(Object.keys(attentionTypeDescriptions) as AttentionType[]).map(
                (type) => {
                  const isCurrentType = type === selectedAttentionType;
                  const isDisabled = type !== "seletiva" && !hasExercisesByAttentionType(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        if (isDisabled) return;
                        setSelectedAttentionType(type);
                        const planId = getPlanIdByAttentionType(type);
                        if (planId) {
                          setSelectedPlanId(planId);
                        }
                        setIntroSelection("initial");
                      }}
                      disabled={isDisabled}
                      className={`rounded-lg border p-3 ${
                        isCurrentType
                          ? "border-4 border-blue-500 bg-blue-50"
                          : "border border-black/10 bg-zinc-50 opacity-50"
                      }`}
                    >
                      <p className="font-semibold text-zinc-900">
                        {formatAttentionType(type)}
                      </p>
                      <p>{attentionTypeDescriptions[type]}</p>
                      {isDisabled && (
                        <p className="mt-2 text-xs text-zinc-500">
                          Indisponivel no momento
                        </p>
                      )}
                    </button>
                  );
                },
              )}
            </div>

            {introSelection === "initial" && (
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={startPlan}
                  className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
                >
                  Seguir sequencia de exercicios
                </button>
                <button
                  type="button"
                  onClick={() => setIntroSelection("choose-exercise")}
                  className="rounded-lg border border-zinc-200 px-4 py-2 font-medium text-zinc-800 hover:bg-zinc-50"
                >
                  Escolher exercicio
                </button>
                {selectedAttentionType === "sustentada" &&
                  countingFlowExerciseIndex >= 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      startFromExercise(countingFlowExerciseIndex, undefined, "instructions")
                    }
                    className="rounded-lg border border-amber-300 bg-amber-100 px-4 py-2 font-medium text-amber-900 hover:bg-amber-200"
                  >
                    Teste rápido: Contagem de Estímulos em Fluxo
                  </button>
                )}
                {selectedAttentionType === "sustentada" &&
                  longMazesExerciseIndex >= 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      startFromExercise(longMazesExerciseIndex, undefined, "instructions")
                    }
                    className="rounded-lg border border-emerald-300 bg-emerald-100 px-4 py-2 font-medium text-emerald-900 hover:bg-emerald-200"
                  >
                    Teste rápido: Labirintos Prolongados
                  </button>
                )}
              </div>
            )}

            {introSelection === "choose-exercise" && (
              <div className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  {selectedPlan.exercises
                    .map((exercise, index) => ({ exercise, index }))
                    .filter(
                      ({ exercise }) =>
                        exercise.kind !== "quiz" &&
                        exercise.attentionType === selectedAttentionType,
                    )
                    .map(({ exercise, index }) => (
                    <button
                      key={`choose-exercise-${exercise.id}`}
                      type="button"
                      onClick={() => startFromExercise(index, undefined, "instructions")}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                    >
                      {exercise.title}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setIntroSelection("initial")}
                  className="w-full rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Voltar
                </button>
              </div>
            )}
          </div>
        )}

        {stage === "instructions" && currentExercise && (
          <div className="mt-4 space-y-5">
            <h2 className="text-xl font-semibold text-zinc-900">
              {currentExercise.title}
            </h2>
            {currentExercise.instructions && (
              <div className="rounded-lg border border-black/10 bg-zinc-50 p-4 text-sm text-zinc-700">
                <p>{currentExercise.instructions}</p>
              </div>
            )}
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
              ) : currentExercise.kind === "flanker" ? (
                <h2 className="text-xl font-semibold text-zinc-900">
                  Flanker de Setas
                </h2>
              ) : currentExercise.kind === "cocktail-party" ? (
                <h2 className="text-xl font-semibold text-zinc-900">
                  Escuta Seletiva (Cocktail Party)
                </h2>
              ) : currentExercise.kind === "filtro-cores-com-som" ? (
                <h2 className="text-xl font-semibold text-zinc-900">
                  Filtro de Cores com Som
                </h2>
              ) : currentExercise.kind === "counting-flow-task" ? (
                <h2 className="text-xl font-semibold text-zinc-900">
                  Contagem de Estímulos em Fluxo
                </h2>
              ) : currentExercise.kind === "long-mazes" ? (
                <h2 className="text-xl font-semibold text-zinc-900">
                  Labirintos Prolongados
                </h2>
              ) : currentExercise.kind === "symbol-map" ? (
                <h2 className="text-xl font-semibold text-zinc-900">
                  Mapa de Símbolos (Symbol Matching)
                </h2>
              ) : currentExercise.kind === "symbol-matrix-search" ? (
                <h2 className="text-xl font-semibold text-zinc-900">
                  Busca de Símbolos em Matriz
                </h2>
              ) : currentExercise.kind === "go-no-go" ? (
                <h2 className="text-xl font-semibold text-zinc-900">
                  Go / No-Go — Clique Rapido
                </h2>
              ) : currentExercise.kind === "go-no-go-expandido" ? (
                <h2 className="text-xl font-semibold text-zinc-900">
                  Go / No-Go
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
                      {currentIndex + 1 === activeExercises.length
                        ? "Ver resultado"
                        : "Próximo exercício"}
                    </button>
                  )}
                </div>
              </>
            ) : currentExercise.kind === "visual-search" ? (
              <VisualSearchHunt
                basePoints={currentExercise.points}
                startingLevel={currentExercise.startingLevel}
                maxLevelHint={currentExercise.maxLevelHint}
                reportContext={reportContext}
                onComplete={({ success, pointsEarned }) => {
                  setScore((value) => value + pointsEarned);
                  if (success) {
                    setHits((value) => value + 1);
                  }
                  const nextIndex = currentIndex + 1;
                  if (nextIndex >= activeExercises.length) {
                    setStage("result");
                  } else {
                    setCurrentIndex(nextIndex);
                    setSelectedOption(null);
                    setSubmitted(false);
                    setStage(getStageForExercise(activeExercises[nextIndex]));
                  }
                }}
              />
            ) : currentExercise.kind === "flanker" ? (
              <FlankerSetas
                basePoints={currentExercise.points}
                startingLevel={currentExercise.startingLevel}
                maxLevelHint={currentExercise.maxLevelHint}
                reportContext={reportContext}
                onComplete={({ success, pointsEarned }) => {
                  setScore((value) => value + pointsEarned);
                  if (success) {
                    setHits((value) => value + 1);
                  }
                  const nextIndex = currentIndex + 1;
                  if (nextIndex >= activeExercises.length) {
                    setStage("result");
                  } else {
                    setCurrentIndex(nextIndex);
                    setSelectedOption(null);
                    setSubmitted(false);
                    setStage(getStageForExercise(activeExercises[nextIndex]));
                  }
                }}
              />
            ) : currentExercise.kind === "cocktail-party" ? (
              <EscutaSeletivaCocktailParty
                basePoints={currentExercise.points}
                startingLevel={cocktailStartLevelOverride ?? currentExercise.startingLevel}
                maxLevelHint={currentExercise.maxLevelHint}
                reportContext={reportContext}
                onComplete={({ success, pointsEarned }) => {
                  setScore((value) => value + pointsEarned);
                  if (success) {
                    setHits((value) => value + 1);
                  }
                  setCocktailStartLevelOverride(null);
                  const nextIndex = currentIndex + 1;
                  if (nextIndex >= activeExercises.length) {
                    setStage("result");
                  } else {
                    setCurrentIndex(nextIndex);
                    setSelectedOption(null);
                    setSubmitted(false);
                    setStage(getStageForExercise(activeExercises[nextIndex]));
                  }
                }}
              />
            ) : currentExercise.kind === "filtro-cores-com-som" ? (
              <FiltroCoresComSomGame
                basePoints={currentExercise.points}
                startingLevel={currentExercise.startingLevel}
                maxLevelHint={currentExercise.maxLevelHint}
                reportContext={reportContext}
                onComplete={({ success, pointsEarned }) => {
                  setScore((value) => value + pointsEarned);
                  if (success) {
                    setHits((value) => value + 1);
                  }
                  const nextIndex = currentIndex + 1;
                  if (nextIndex >= activeExercises.length) {
                    setStage("result");
                  } else {
                    setCurrentIndex(nextIndex);
                    setSelectedOption(null);
                    setSubmitted(false);
                    setStage(getStageForExercise(activeExercises[nextIndex]));
                  }
                }}
              />
            ) : currentExercise.kind === "counting-flow-task" ? (
              <ContagemEstimulosFluxoGame
                basePoints={currentExercise.points}
                startingLevel={currentExercise.startingLevel}
                maxLevelHint={currentExercise.maxLevelHint}
                reportContext={reportContext}
                onComplete={({ success, pointsEarned }) => {
                  setScore((value) => value + pointsEarned);
                  if (success) {
                    setHits((value) => value + 1);
                  }
                  const nextIndex = currentIndex + 1;
                  if (nextIndex >= activeExercises.length) {
                    setStage("result");
                  } else {
                    setCurrentIndex(nextIndex);
                    setSelectedOption(null);
                    setSubmitted(false);
                    setStage(getStageForExercise(activeExercises[nextIndex]));
                  }
                }}
              />
            ) : currentExercise.kind === "long-mazes" ? (
              <LabirintosProlongadosGame
                basePoints={currentExercise.points}
                startingLevel={currentExercise.startingLevel}
                maxLevelHint={currentExercise.maxLevelHint}
                reportContext={reportContext}
                onComplete={({ success, pointsEarned }) => {
                  setScore((value) => value + pointsEarned);
                  if (success) {
                    setHits((value) => value + 1);
                  }
                  const nextIndex = currentIndex + 1;
                  if (nextIndex >= activeExercises.length) {
                    setStage("result");
                  } else {
                    setCurrentIndex(nextIndex);
                    setSelectedOption(null);
                    setSubmitted(false);
                    setStage(getStageForExercise(activeExercises[nextIndex]));
                  }
                }}
              />
            ) : currentExercise.kind === "symbol-map" ? (
              <MapaDeSimbolosGame
                basePoints={currentExercise.points}
                startingLevel={currentExercise.startingLevel}
                maxLevelHint={currentExercise.maxLevelHint}
                reportContext={reportContext}
                onComplete={({ success, pointsEarned }) => {
                  setScore((value) => value + pointsEarned);
                  if (success) {
                    setHits((value) => value + 1);
                  }
                  const nextIndex = currentIndex + 1;
                  if (nextIndex >= activeExercises.length) {
                    setStage("result");
                  } else {
                    setCurrentIndex(nextIndex);
                    setSelectedOption(null);
                    setSubmitted(false);
                    setStage(getStageForExercise(activeExercises[nextIndex]));
                  }
                }}
              />
            ) : currentExercise.kind === "symbol-matrix-search" ? (
              <BuscaSimbolosMatrizGame
                basePoints={currentExercise.points}
                startingLevel={currentExercise.startingLevel}
                maxLevelHint={currentExercise.maxLevelHint}
                reportContext={reportContext}
                onComplete={({ success, pointsEarned }) => {
                  setScore((value) => value + pointsEarned);
                  if (success) {
                    setHits((value) => value + 1);
                  }
                  const nextIndex = currentIndex + 1;
                  if (nextIndex >= activeExercises.length) {
                    setStage("result");
                  } else {
                    setCurrentIndex(nextIndex);
                    setSelectedOption(null);
                    setSubmitted(false);
                    setStage(getStageForExercise(activeExercises[nextIndex]));
                  }
                }}
              />
            ) : currentExercise.kind === "go-no-go" ? (
              <GoNoGoQuickClick />
            ) : currentExercise.kind === "go-no-go-expandido" ? (
              <GoNoGoExpandidoGame
                basePoints={currentExercise.points}
                startingLevel={currentExercise.startingLevel}
                maxLevelHint={currentExercise.maxLevelHint}
                reportContext={reportContext}
                onComplete={({ success, pointsEarned }) => {
                  setScore((value) => value + pointsEarned);
                  if (success) {
                    setHits((value) => value + 1);
                  }
                  const nextIndex = currentIndex + 1;
                  if (nextIndex >= activeExercises.length) {
                    setStage("result");
                  } else {
                    setCurrentIndex(nextIndex);
                    setSelectedOption(null);
                    setSubmitted(false);
                    setStage(getStageForExercise(activeExercises[nextIndex]));
                  }
                }}
              />
            ) : (
              <StroopInvertido
                basePoints={currentExercise.points}
                startingLevel={currentExercise.startingLevel}
                maxLevelHint={currentExercise.maxLevelHint}
                reportContext={reportContext}
                onComplete={({ success, pointsEarned }) => {
                  setScore((value) => value + pointsEarned);
                  if (success) {
                    setHits((value) => value + 1);
                  }
                  const nextIndex = currentIndex + 1;
                  if (nextIndex >= activeExercises.length) {
                    setStage("result");
                  } else {
                    setCurrentIndex(nextIndex);
                    setSelectedOption(null);
                    setSubmitted(false);
                    setStage(getStageForExercise(activeExercises[nextIndex]));
                  }
                }}
              />
            )}
          </div>
        )}

        {showingQuizResults && (
          <div className="mt-4 space-y-5">
            <h2 className="text-xl font-semibold text-zinc-900">
              Destaque o Alvo - Concluído!
            </h2>

            <div className="space-y-3">
              {quizResults.map((result, idx) => (
                <div key={idx} className="rounded-lg border border-black/10 bg-white p-3">
                  <p className="text-sm font-medium text-zinc-900">Fase {idx + 1}</p>
                  <p className={`text-sm ${result.correct ? "text-emerald-600" : "text-rose-600"}`}>
                    {result.correct ? "✓ Acertou" : "✗ Errou"}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border-2 border-zinc-900 bg-white p-4">
              <p className="font-semibold text-zinc-900">Resumo Total</p>
              <div className="mt-2 grid gap-2 text-sm">
                <p>Fases concluídas: {quizResults.length}/{quizExercises.length}</p>
                <p>Acertos: {quizResults.filter((r) => r.correct).length}</p>
                <p>Erros: {quizResults.filter((r) => !r.correct).length}</p>
                <p>Pontuação: {score}/{quizTotalPossible}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={downloadQuizResults}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
              >
                Baixar Resultados
              </button>
              <button
                type="button"
                onClick={continueAfterQuizResults}
                className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {stage === "result" && (
          <div className="mt-4 space-y-5">
            <h2 className="text-xl font-semibold text-zinc-900">
              Treino concluído
            </h2>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-black/10 bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Modo</p>
                <p className="font-semibold text-zinc-900">
                  {trainingMode === "sequence"
                    ? "Trilha percorrida"
                    : trainingMode === "single"
                      ? `Jogo individual${selectedSingleTitle ? `: ${selectedSingleTitle}` : ""}`
                      : "-"}
                </p>
              </div>
              <div className="rounded-lg border border-black/10 bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Acertos</p>
                <p className="font-semibold text-zinc-900">
                  {hits}/{finalHitsTotal}
                </p>
              </div>
              <div className="rounded-lg border border-black/10 bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Pontuação total</p>
                <p className="font-semibold text-zinc-900">
                  {score}/{finalScoreTotal}
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
