"use client";

import { SelectiveAttentionMobileContainer } from "../containers/mobile/SelectiveAttentionMobileContainer";
import { SustainedAttentionMobileContainer } from "../containers/mobile/SustainedAttentionMobileContainer";

import { useEffect, useMemo, useState } from "react";
import {
  attentionTypeDescriptions,
  formatAttentionType,
  trainingPlans,
} from "../../data/trainingPlans";
import { AttentionType, TrainingPlan } from "../../types/game";
import { buildTxtReportFileName } from "../../utils/reportFileName";

type GameStage = "intro" | "instructions" | "exercise" | "result";
type TrainingMode = "sequence" | "single" | null;
type SessionMode = "sequence" | "single";
type IntroStep = "didactic" | "mode-choice" | "name-capture" | "menu";

const ATENTO_USER_KEY = "atentoUser";

export type ReportContext = {
  mode: SessionMode;
  scopeLabel: string;
  attentionTypeLabel: string;
  participantName?: string;
};

const stageTitle: Record<GameStage, string> = {
  intro: "Treino de Atenção",
  instructions: "Orientações do próximo exercício",
  exercise: "Exercício em andamento",
  result: "Resultado final",
};

export function MobileAttentionTrainingGame() {
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
  const [introStep, setIntroStep] = useState<IntroStep>("didactic");
  const [selectedEntryMode, setSelectedEntryMode] = useState<SessionMode | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(defaultPlanId);
  const [trainingMode, setTrainingMode] = useState<TrainingMode>(null);
  const [selectedSingleTitle, setSelectedSingleTitle] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [participantName, setParticipantName] = useState<string | undefined>(undefined);
  const [currentIndex, setCurrentIndex] = useState(0);
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
  const quizExercises = activeExercises.filter(
    (exercise) => exercise.kind === "quiz",
  );
  const quizTotalPossible = quizExercises.reduce(
    (sum, exercise) => sum + exercise.points,
    0,
  );

  const resolvedSessionMode: SessionMode = trainingMode === "single" ? "single" : "sequence";

  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem(ATENTO_USER_KEY);

    const parseAtentoUser = (): string | undefined => {
      if (!raw) return undefined;

      try {
        const parsed = JSON.parse(raw) as { name?: string };
        const normalizedName = parsed?.name?.trim();
        if (normalizedName) return normalizedName;
      } catch {
        return undefined;
      }

      return undefined;
    };

    const fromObject = parseAtentoUser();
    const fromLegacy = window.localStorage.getItem("atento_user_name")?.trim();
    const resolvedName = fromObject ?? fromLegacy ?? undefined;

    if (resolvedName) {
      setParticipantName(resolvedName);
      setNameInput(resolvedName);
    }
  }, []);

  const persistParticipant = (name: string) => {
    if (typeof window === "undefined") return;
    const trimmedName = name.trim();
    if (!trimmedName) return;

    window.localStorage.setItem(
      ATENTO_USER_KEY,
      JSON.stringify({
        name: trimmedName,
        updatedAt: new Date().toISOString(),
      }),
    );
    window.localStorage.setItem("atento_user_name", trimmedName);
    setParticipantName(trimmedName);
    setNameInput(trimmedName);
  };

  const reportContext: ReportContext = {
    mode: resolvedSessionMode,
    scopeLabel:
      resolvedSessionMode === "single"
        ? selectedSingleTitle ?? currentExercise?.title ?? "Jogo individual"
        : selectedPlan.name,
    attentionTypeLabel: formatAttentionType(selectedAttentionType),
    participantName,
  };

  const finalHitsTotal = resolvedSessionMode === "single" ? 1 : activeExercises.length;
  const finalScoreTotal =
    resolvedSessionMode === "single"
      ? (currentExercise?.points ?? 0)
      : quizTotalPossible;

  const getStageForExercise = (
    exercise: TrainingPlan["exercises"][number] | undefined,
  ): GameStage =>
    exercise?.kind === "symbol-matrix-search" ||
    exercise?.kind === "find-missing-item" ||
    exercise?.kind === "copy-matrices" ||
    exercise?.kind === "long-word-search" ||
    exercise?.kind === "radar-tone" ||
    exercise?.kind === "drive-word-target" ||
    exercise?.kind === "chat-error-vigilance" ||
    exercise?.kind === "symbol-map-sound-monitor" ||
    exercise?.kind === "rapid-classification-updatable-memory" ||
    exercise?.kind === "color-shape-switch" ||
    exercise?.kind === "top-bottom-position-rule-switch" ||
    exercise?.kind === "reversal-go-nogo-switch" ||
    exercise?.kind === "trilha-alternada-tmtb"
      ? "exercise"
      : "instructions";


  const startPlan = () => {
    const focusedPlanId = getPlanIdByAttentionType(selectedAttentionType);
    if (!focusedPlanId) return;
    setSelectedPlanId(focusedPlanId);
    setTrainingMode("sequence");
    setSelectedSingleTitle(null);
    setCurrentIndex(0);
    // ...existing code...
    setScore(0);
    setHits(0);
    setSelectedOption(null);
    setSubmitted(false);
    setQuizResults([]);
    setShowingQuizResults(false);
    setStage(getStageForExercise(sequenceExercises[0]));
  };

  const handleSelectGuidedTrail = () => {
    setSelectedEntryMode("sequence");
    if (participantName) {
      setIntroStep("menu");
      return;
    }
    setIntroStep("name-capture");
  };

  const handleSelectIndividual = () => {
    setSelectedEntryMode("single");
    setIntroStep("menu");
  };

  const handleSubmitNameAndContinue = () => {
    const trimmedName = nameInput.trim();
    if (!trimmedName) return;
    persistParticipant(trimmedName);
    setSelectedEntryMode("sequence");
    setIntroStep("menu");
  };

  const startFromExercise = (
    exerciseIndex: number,
    // ...existing code...
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
    // ...existing code...
    setScore(0);
    setHits(0);
    setSelectedOption(null);
    setSubmitted(false);
    setQuizResults([]);
    setShowingQuizResults(false);
    setStage(
      selectedExercise.kind === "symbol-matrix-search" ||
        selectedExercise.kind === "find-missing-item" ||
        selectedExercise.kind === "copy-matrices" ||
        selectedExercise.kind === "long-word-search" ||
        selectedExercise.kind === "radar-tone" ||
        selectedExercise.kind === "drive-word-target" ||
        selectedExercise.kind === "chat-error-vigilance" ||
        selectedExercise.kind === "symbol-map-sound-monitor" ||
        selectedExercise.kind === "rapid-classification-updatable-memory" ||
        selectedExercise.kind === "color-shape-switch" ||
        selectedExercise.kind === "top-bottom-position-rule-switch" ||
        selectedExercise.kind === "reversal-go-nogo-switch" ||
        selectedExercise.kind === "trilha-alternada-tmtb"
        ? "exercise"
        : startStage,
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
    setIntroStep("didactic");
    setSelectedEntryMode(null);
    setStage("intro");
    setCurrentIndex(0);
    // ...existing code...
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
    link.download = buildTxtReportFileName(reportContext);
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

  const isImmersiveRadarTone =
    stage === "exercise" && currentExercise?.kind === "radar-tone";

  return (
    <main className="mx-auto w-full flex min-h-screen max-w-3xl items-center px-6 py-10">
      <section className="w-full border border-black/10 bg-white shadow-sm rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col items-center justify-center py-12">
            {/* ...outros estágios e lógica... */}
            {stage === "exercise" && currentExercise && (
              <>
                {currentExercise.kind === "stroop" ? (
                  <SustainedAttentionMobileContainer
                    mode={resolvedSessionMode}
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
                ) : currentExercise.kind === "escutaseletiva-cocktail-party" ? (
                  <SelectiveAttentionMobileContainer
                    mode={resolvedSessionMode}
                    reportContext={reportContext}
                    onComplete={({ success, pointsEarned }) => {
                      setScore((value) => value + (pointsEarned || 0));
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
                  <div className="flex flex-col items-center justify-center py-12">
                    <p className="text-lg font-semibold text-gray-700 text-center">
                      Este exercício não está disponível na versão mobile.<br />
                      Por favor, acesse pelo computador para jogar.
                    </p>
                  </div>
                )}
              </>
            )}
        </div>
      </section>
    </main>
  );
}
