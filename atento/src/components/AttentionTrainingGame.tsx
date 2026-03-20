"use client";

import { useEffect, useMemo, useState } from "react";
import {
  attentionTypeDescriptions,
  formatAttentionType,
  trainingPlans,
} from "@/data/trainingPlans";
import { AttentionType, TrainingPlan } from "@/types/game";
import { VisualSearchHunt } from "@/components/VisualSearchHunt";
import { SelectiveAttentionContainer } from "./containers/SelectiveAttentionContainer";
import { EscutaSeletivaCocktailPartyDesktopGame } from "@/games/escuta-seletiva-cocktail-party/EscutaSeletivaCocktailPartyDesktopGame";
import { SustainedAttentionContainer } from "./containers/SustainedAttentionContainer";
import { FlankerSetas } from "@/components/FlankerSetas";
import { GoNoGoQuickClick } from "@/components/GoNoGoQuickClick";
import { GoNoGoExpandidoGame } from "@/games/go-no-go-expandido/GoNoGoExpandidoGame";
import { FiltroCoresComSomGame } from "@/games/filtro-cores-com-som/FiltroCoresComSomGame";
import { ContagemEstimulosFluxoGame } from "@/games/contagem-estimulos-fluxo/ContagemEstimulosFluxoGame";
import { LabirintosProlongadosGame } from "@/games/labirintos-prolongados/LabirintosProlongadosGame";
import { MapaDeSimbolosGame } from "@/games/mapa-de-simbolos/MapaDeSimbolosGame";
import { BuscaSimbolosMatrizGame } from "@/games/busca-simbolos-matriz/BuscaSimbolosMatrizGame";
import { AcharOFaltandoGame } from "@/games/achar-o-faltando/AcharOFaltandoGame";
import { CopiaMatrizesGame } from "@/games/copia-matrizes/CopiaMatrizesGame";
import { CacaPalavrasLongosGame } from "@/games/caca-palavras-longos/CacaPalavrasLongosGame";
import { RadarTonoGame } from "@/games/radar-tono/RadarTonoGame";
import { DirijaPalavrasAlvoGame } from "@/games/dirija-palavras-alvo/DirijaPalavrasAlvoGame";
import { ChatVigilanciaErrosGame } from "@/games/chat-vigilancia-erros/ChatVigilanciaErrosGame";
import { MapaSimbolosMonitorSomGame } from "@/games/mapa-simbolos-monitor-som/MapaSimbolosMonitorSomGame";
import { ClassificacaoRapidaMemoriaAtualizavelGame } from "@/games/classificacao-rapida-memoria-atualizavel/ClassificacaoRapidaMemoriaAtualizavelGame";
import { CorOuFormaSwitchGame } from "@/games/cor-ou-forma-switch/CorOuFormaSwitchGame";
import { TopoBaixoPositionRuleSwitchGame } from "@/games/topo-baixo-position-rule-switch/TopoBaixoPositionRuleSwitchGame";
import { ReversalGoNoGoSwitchGame } from "@/games/reversal-go-nogo-switch/ReversalGoNoGoSwitchGame";
import { TrilhaAlternadaTmtbGame } from "@/games/trilha-alternada-tmtb/TrilhaAlternadaTmtbGame";
import { buildTxtReportFileName } from "@/utils/reportFileName";

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

export function AttentionTrainingGame() {
  const getFocusedPlanByAttentionType = (
    type: AttentionType,
  ): TrainingPlan | undefined =>
    trainingPlans.find((plan) => plan.id === `foco-${type}`);

  const getPlanIdByAttentionType = (type: AttentionType): string => {
    const focusedPlan = getFocusedPlanByAttentionType(type);
    if (focusedPlan) return focusedPlan.id;
    if (type === "seletiva") {
      return (
        trainingPlans.find((plan) => plan.id === "foco-seletiva")?.id ?? ""
      );
    }
    return "";
  };

  const hasExercisesByAttentionType = (type: AttentionType): boolean => {
    const focusedPlan = getFocusedPlanByAttentionType(type);
    return Boolean(
      focusedPlan?.exercises.some(
        (exercise) =>
          exercise.attentionType === type && exercise.kind !== "quiz",
      ),
    );
  };

  const [selectedAttentionType, setSelectedAttentionType] =
    useState<AttentionType>("seletiva");
  const defaultPlanId = getPlanIdByAttentionType("seletiva");
  const [stage, setStage] = useState<GameStage>("intro");
  const [introStep, setIntroStep] = useState<IntroStep>("didactic");
  const [selectedEntryMode, setSelectedEntryMode] =
    useState<SessionMode | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(defaultPlanId);
  const [trainingMode, setTrainingMode] = useState<TrainingMode>(null);
  const [selectedSingleTitle, setSelectedSingleTitle] = useState<string | null>(
    null,
  );
  const [nameInput, setNameInput] = useState("");
  const [participantName, setParticipantName] = useState<string | undefined>(
    undefined,
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cocktailStartLevelOverride, setCocktailStartLevelOverride] =
    useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [quizResults, setQuizResults] = useState<Array<{ correct: boolean }>>(
    [],
  );
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
  const activeExercises =
    trainingMode === "sequence" ? sequenceExercises : selectedPlan.exercises;
  const currentExercise = activeExercises[currentIndex];
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

  const resolvedSessionMode: SessionMode =
    trainingMode === "single" ? "single" : "sequence";

  useEffect(() => {
    if (typeof window === "undefined") return;

    const parseAtentoUser = (): string | undefined => {
      const raw = window.localStorage.getItem(ATENTO_USER_KEY);
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
    const fromLegacy = window.localStorage
      .getItem("atento_user_name")
      ?.trim();
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

  const finalHitsTotal =
    resolvedSessionMode === "single" ? 1 : activeExercises.length;
  const finalScoreTotal =
    resolvedSessionMode === "single"
      ? currentExercise?.points ?? 0
      : totalPossible;

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
    setCocktailStartLevelOverride(null);
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

    lines.push(
      `Participante: ${reportContext.participantName ?? "Não informado"}`,
    );
    lines.push(
      `Escopo: ${
        reportContext.mode === "sequence"
          ? `Trilha completa (${reportContext.scopeLabel})`
          : `Jogo individual (${reportContext.scopeLabel})`
      }`,
    );
    lines.push("");

    if (trainingMode === "sequence") {
      lines.push("Modo: Trilha percorrida");
      lines.push("");
    } else if (trainingMode === "single") {
      lines.push(
        `Modo: Jogo individual (${selectedSingleTitle ?? ""})`,
      );
      lines.push("");
    }

    quizResults.forEach((result, idx) => {
      lines.push(
        `Fase ${idx + 1}: ${
          result.correct ? "✓ Acertou" : "✗ Errou"
        }`,
      );
    });

    lines.push("");
    lines.push("=".repeat(62));
    lines.push(
      `Acertos: ${
        quizResults.filter((r) => r.correct).length
      }/${quizResults.length}`,
    );
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

  const updateStageForCurrentExercise = () => {
    setStage(getStageForExercise(activeExercises[currentIndex]));
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-10">
      <section className="w-full rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-zinc-500">
            {stageTitle[stage]}
          </p>
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
            {introStep === "didactic" && (
              <>
                <div className="space-y-2">
                  <h1 className="text-3xl font-semibold text-zinc-900">
                    ATENTO – Programa de Treino de Atenção
                  </h1>
                  <p className="text-zinc-600">
                    No ATENTO, você treina os 4 tipos de atenção (seletiva,
                    sustentada, alternada e dividida) por meio de exercícios
                    pensados para o dia a dia. Você pode seguir uma trilha de
                    exercícios organizada para avançar passo a passo ou
                    escolher treinar um exercício específico, focando no aspecto
                    da atenção que quiser trabalhar mais.
                  </p>
                </div>

                <div className="space-y-4 rounded-xl border border-black/10 bg-zinc-50 p-4 text-sm text-zinc-700">
                  <section className="space-y-1">
                    <h2 className="text-base font-semibold text-zinc-900">
                      O que é Atenção?
                    </h2>
                    <p>
                      A atenção é a capacidade de focar no que é importante e
                      filtrar distrações. Ela é essencial para aprender,
                      trabalhar, conversar, dirigir e organizar tarefas do dia a
                      dia.
                    </p>
                  </section>

                  <section className="space-y-1">
                    <h2 className="text-base font-semibold text-zinc-900">
                      Os 4 tipos de Atenção
                    </h2>
                    <ul className="list-disc space-y-1 pl-5">
                      <li>
                        <strong>Atenção Seletiva:</strong> focar em um estímulo
                        e ignorar distrações.
                      </li>
                      <li>
                        <strong>Atenção Sustentada:</strong> manter o foco por
                        um período contínuo.
                      </li>
                      <li>
                        <strong>Atenção Alternada:</strong> mudar o foco entre
                        tarefas diferentes com eficiência.
                      </li>
                      <li>
                        <strong>Atenção Dividida:</strong> lidar com mais de
                        uma demanda ao mesmo tempo, quando possível.
                      </li>
                    </ul>
                  </section>

                  <section className="space-y-1">
                    <h2 className="text-base font-semibold text-zinc-900">
                      Atenção e Envelhecimento
                    </h2>
                    <p>
                      Com o envelhecimento, é comum haver mais lentidão mental,
                      maior cansaço cognitivo e dificuldade de concentração em
                      algumas situações. Ainda assim, o cérebro mantém
                      capacidade de adaptação ao longo da vida. Com treino
                      adequado, é possível fortalecer atenção, memória e
                      velocidade de processamento.
                    </p>
                  </section>

                  <section className="space-y-1">
                    <h2 className="text-base font-semibold text-zinc-900">
                      Como funciona este Treino
                    </h2>
                    <p>
                      Neste programa, você treina os 4 tipos de atenção com
                      exercícios curtos, progressivos e objetivos.
                    </p>
                    <ul className="list-disc space-y-1 pl-5">
                      <li>
                        <strong>Modo Trilha (Sequencial):</strong> sequência
                        pronta de exercícios, com progressão gradual de
                        dificuldade.
                      </li>
                      <li>
                        <strong>Modo Individual (Exercícios Soltos):</strong>{" "}
                        escolha livre de exercícios para focar em um tipo de
                        atenção específico.
                      </li>
                    </ul>
                  </section>

                  <section className="space-y-1">
                    <h2 className="text-base font-semibold text-zinc-900">
                      Acompanhe sua Evolução
                    </h2>
                    <p>
                      Ao final de cada sessão, você vê seus resultados na tela e
                      pode acompanhar seu histórico no site. Assim, fica fácil
                      comparar seu desempenho ao longo do tempo, identificar
                      avanços e direcionar melhor seus próximos treinos.
                    </p>
                  </section>
                </div>

                <button
                  type="button"
                  onClick={() => setIntroStep("mode-choice")}
                  className="w-full rounded-lg bg-zinc-900 px-4 py-3 font-semibold text-white hover:bg-zinc-700"
                >
                  Começar meu treino
                </button>
              </>
            )}

            {introStep === "mode-choice" && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h1 className="text-2xl font-semibold text-zinc-900">
                    Como você quer treinar hoje?
                  </h1>
                </div>

                <button
                  type="button"
                  onClick={handleSelectGuidedTrail}
                  className="w-full rounded-xl border border-zinc-200 bg-white p-4 text-left hover:bg-zinc-50"
                >
                  <p className="text-base font-semibold text-zinc-900">
                    Trilha guiada
                  </p>
                  <p className="mt-1 text-sm text-zinc-700">
                    Siga uma sequência de exercícios já organizada para treinar,
                    ao longo do tempo, os 4 tipos de atenção. Vamos pedir seu
                    nome para salvar sua evolução neste dispositivo e mostrar
                    seu progresso.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={handleSelectIndividual}
                  className="w-full rounded-xl border border-zinc-200 bg-white p-4 text-left hover:bg-zinc-50"
                >
                  <p className="text-base font-semibold text-zinc-900">
                    Exercício individual
                  </p>
                  <p className="mt-1 text-sm text-zinc-700">
                    Escolha um exercício específico para treinar só o que você
                    quiser hoje. Neste modo, você pode praticar sem cadastro e
                    sem salvar histórico de resultados.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setIntroStep("didactic")}
                  className="w-full rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Voltar
                </button>
              </div>
            )}

            {introStep === "name-capture" && (
              <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4">
                <h1 className="text-2xl font-semibold text-zinc-900">
                  Antes de começar a Trilha
                </h1>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-zinc-800">
                    Como você prefere ser chamado(a)?
                  </span>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(event) => setNameInput(event.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500"
                    placeholder="Digite seu nome"
                  />
                </label>
                <p className="text-sm text-zinc-600">
                  Seu nome e seus resultados ficarão salvos apenas neste
                  dispositivo, no seu navegador, para você acompanhar sua
                  evolução.
                </p>
                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={handleSubmitNameAndContinue}
                    disabled={!nameInput.trim()}
                    className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
                  >
                    Continuar para os exercícios
                  </button>
                  <button
                    type="button"
                    onClick={() => setIntroStep("mode-choice")}
                    className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Voltar
                  </button>
                </div>
              </div>
            )}

            {introStep === "menu" && (
              <>
                <div className="space-y-2">
                  {selectedEntryMode === "sequence" && participantName && (
                    <p className="text-sm font-medium text-zinc-500">
                      Olá, {participantName}
                    </p>
                  )}
                  <h1 className="text-2xl font-semibold text-zinc-900">
                    Treino de {formatAttentionType(selectedAttentionType)}
                  </h1>
                  <p className="text-zinc-600">
                    Selecione o tipo de atenção para continuar.
                  </p>
                </div>

                <div className="grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
                  {(Object.keys(attentionTypeDescriptions) as AttentionType[])
                    .map((type) => {
                      const isCurrentType = type === selectedAttentionType;
                      const isDisabled =
                        type !== "seletiva" &&
                        !hasExercisesByAttentionType(type);
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
                    })}
                </div>

                {selectedEntryMode === "sequence" ? (
                  <div className="grid gap-3">
                    <button
                      type="button"
                      onClick={startPlan}
                      className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
                    >
                      Iniciar Trilha guiada
                    </button>
                    <button
                      type="button"
                      onClick={() => setIntroStep("mode-choice")}
                      className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      Trocar modo de treino
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {selectedPlan.exercises
                        .map((exercise, index) => ({ exercise, index }))
                        .filter(
                          ({ exercise }) =>
                            exercise.kind !== "quiz" &&
                            exercise.attentionType ===
                              selectedAttentionType,
                        )
                        .map(({ exercise, index }) => (
                          <button
                            key={`choose-exercise-${exercise.id}`}
                            type="button"
                            onClick={() =>
                              startFromExercise(index, undefined, "instructions")
                            }
                            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                          >
                            {exercise.title}
                          </button>
                        ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIntroStep("mode-choice")}
                      className="w-full rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      Trocar modo de treino
                    </button>
                  </div>
                )}
              </>
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
                <p
                  dangerouslySetInnerHTML={{
                    __html: currentExercise.instructions,
                  }}
                />
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
              {currentExercise.kind === "quiz" && (
                <h2 className="text-xl font-semibold text-zinc-900">
                  {currentExercise.question}
                </h2>
              )}
              {currentExercise.kind === "visual-search" && (
                <h2 className="text-xl font-semibold text-zinc-900">
                  Caça ao Alvo (Visual Search)
                </h2>
              )}
              {currentExercise.kind === "escutaseletiva-cocktail-party" && (
                <h2 className="text-xl font-semibold text-zinc-900">
                  Escuta Seletiva
                </h2>
              )}
              {currentExercise.kind === "flanker" && (
                <h2 className="text-xl font-semibold text-zinc-900">
                  Flanker de Setas
                </h2>
              )}
              {currentExercise.kind === "filtro-cores-com-som" && (
                <h2 className="text-xl font-semibold text-zinc-900">
                  Filtro de Cores com Som
                </h2>
              )}
              {currentExercise.kind === "counting-flow-task" && (
                <h2 className="text-xl font-semibold text-zinc-900">
                  Contagem de Estímulos em Fluxo
                </h2>
              )}
              {currentExercise.kind === "long-mazes" && (
                <h2 className="text-xl font-semibold text-zinc-900">
                  Labirintos Prolongados
                </h2>
              )}
              {currentExercise.kind === "symbol-map" && (
                <h2 className="text-xl font-semibold text-zinc-900">
                  Mapa de Símbolos (Symbol Matching)
                </h2>
              )}
              {currentExercise.kind === "symbol-matrix-search" && (
                <h2 className="text-xl font-semibold text-zinc-900">
                  Busca de Símbolos em Matriz
                </h2>
              )}
              {currentExercise.kind === "go-no-go" && (
                <h2 className="text-xl font-semibold text-zinc-900">
                  Go / No-Go — Clique Rapido
                </h2>
              )}
              {currentExercise.kind === "go-no-go-expandido" && (
                <h2 className="text-xl font-semibold text-zinc-900">
                  Go / No-Go
                </h2>
              )}
              {currentExercise.kind === "radar-tone" && (
                <h2 className="text-xl font-semibold text-zinc-900">
                  Radar e Tom
                </h2>
              )}
              {currentExercise.kind === "drive-word-target" && (
                <h2 className="text-xl font-semibold text-zinc-900">
                  Dirija + Palavras-Alvo
                </h2>
              )}
              {currentExercise.kind === "chat-error-vigilance" && (
                <h2 className="text-xl font-semibold text-zinc-900">
                  Chat + Vigilância de Erros
                </h2>
              )}
              {currentExercise.kind === "symbol-map-sound-monitor" && (
                <h2 className="text-xl font-semibold text-zinc-900">
                  Mapa de Símbolos + Monitor de Som
                </h2>
              )}
              {currentExercise.kind ===
                "rapid-classification-updatable-memory" && (
                <h2 className="text-xl font-semibold text-zinc-900">
                  Classificação Rápida + Memória Atualizável
                </h2>
              )}
              {currentExercise.kind === "color-shape-switch" && (
                <h2 className="text-xl font-semibold text-zinc-900">
                  Cor-ou-Forma (Color/Shape Switch)
                </h2>
              )}
              {currentExercise.kind === "top-bottom-position-rule-switch" && (
                <h2 className="text-xl font-semibold text-zinc-900">
                  Topo/Baixo — Position-Rule Switch
                </h2>
              )}
              {currentExercise.kind === "reversal-go-nogo-switch" && (
                <h2 className="text-xl font-semibold text-zinc-900">
                  Reversal Go/No-Go Switch
                </h2>
              )}
              {currentExercise.kind === "trilha-alternada-tmtb" && (
                <h2 className="text-xl font-semibold text-zinc-900">
                  Trilha Alternada 1-A-2-B (TMT-B)
                </h2>
              )}
              {![
                "quiz",
                "visual-search",
                "flanker",
                "filtro-cores-com-som",
                "counting-flow-task",
                "long-mazes",
                "symbol-map",
                "symbol-matrix-search",
                "go-no-go",
                "go-no-go-expandido",
                "radar-tone",
                "drive-word-target",
                "chat-error-vigilance",
                "symbol-map-sound-monitor",
                "rapid-classification-updatable-memory",
                "color-shape-switch",
                "top-bottom-position-rule-switch",
                "reversal-go-nogo-switch",
                "trilha-alternada-tmtb",
                "escutaseletiva-cocktail-party",
              ].includes(currentExercise.kind) && (
                <h2 className="text-xl font-semibold text-zinc-900">
                  Stroop Invertido
                </h2>
              )}
            </div>

            {currentExercise.kind === "quiz" ? (
              <>
                <div className="grid gap-3">
                  {currentExercise.options.map((option, index) => {
                    const isCorrect =
                      index === currentExercise.correctOptionIndex;
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
                        onClick={() =>
                          !submitted && setSelectedOption(index)
                        }
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
                startingLevel={
                  "startingLevel" in currentExercise
                    ? currentExercise.startingLevel
                    : 1
                }
                maxLevelHint={
                  "maxLevelHint" in currentExercise
                    ? currentExercise.maxLevelHint
                    : 0
                }
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
                    setStage(
                      getStageForExercise(activeExercises[nextIndex]),
                    );
                  }
                }}
              />
            ) : currentExercise.kind === "stroop" ? (
              <SustainedAttentionContainer
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
                    setStage(
                      getStageForExercise(activeExercises[nextIndex]),
                    );
                  }
                }}
              />
            ) : currentExercise.kind === "escutaseletiva-cocktail-party" ? (
              <EscutaSeletivaCocktailPartyDesktopGame
                totalTrials={6} // Valor fixo, ajuste se necessário
                basePoints={currentExercise.points || 1}
                reportContext={reportContext}
                onComplete={({ success, pointsEarned, report }) => {
                  setScore((value) => value + (pointsEarned || 0));
                  if (success) {
                    setHits((value) => value + 1);
                  }
                  // Aqui você pode salvar o relatório, se necessário
                  const nextIndex = currentIndex + 1;
                  if (nextIndex >= activeExercises.length) {
                    setStage("result");
                  } else {
                    setCurrentIndex(nextIndex);
                    setSelectedOption(null);
                    setSubmitted(false);
                    setStage(
                      getStageForExercise(activeExercises[nextIndex]),
                    );
                  }
                }}
              />
            ) : currentExercise.kind === "flanker" ? (
              <FlankerSetas
                basePoints={currentExercise.points}
                startingLevel={
                  "startingLevel" in currentExercise
                    ? currentExercise.startingLevel
                    : 1
                }
                maxLevelHint={
                  "maxLevelHint" in currentExercise
                    ? currentExercise.maxLevelHint
                    : 0
                }
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
                    setStage(
                      getStageForExercise(activeExercises[nextIndex]),
                    );
                  }
                }}
              />
            ) : currentExercise.kind === "filtro-cores-com-som" ? (
              <FiltroCoresComSomGame
                basePoints={currentExercise.points}
                startingLevel={
                  "startingLevel" in currentExercise
                    ? currentExercise.startingLevel
                    : 1
                }
                maxLevelHint={
                  "maxLevelHint" in currentExercise
                    ? currentExercise.maxLevelHint
                    : 0
                }
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
                    setStage(
                      getStageForExercise(activeExercises[nextIndex]),
                    );
                  }
                }}
              />
            ) : currentExercise.kind === "counting-flow-task" ? (
              <ContagemEstimulosFluxoGame
                basePoints={currentExercise.points}
                startingLevel={
                  "startingLevel" in currentExercise
                    ? currentExercise.startingLevel
                    : 1
                }
                maxLevelHint={
                  "maxLevelHint" in currentExercise
                    ? currentExercise.maxLevelHint
                    : 0
                }
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
                    setStage(
                      getStageForExercise(activeExercises[nextIndex]),
                    );
                  }
                }}
              />
            ) : currentExercise.kind === "long-mazes" ? (
              <LabirintosProlongadosGame
                basePoints={currentExercise.points}
                startingLevel={
                  "startingLevel" in currentExercise
                    ? currentExercise.startingLevel
                    : 1
                }
                maxLevelHint={
                  "maxLevelHint" in currentExercise
                    ? currentExercise.maxLevelHint
                    : 0
                }
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
                    setStage(
                      getStageForExercise(activeExercises[nextIndex]),
                    );
                  }
                }}
              />
            ) : currentExercise.kind === "symbol-map" ? (
              <MapaDeSimbolosGame
                basePoints={currentExercise.points}
                startingLevel={
                  "startingLevel" in currentExercise
                    ? currentExercise.startingLevel
                    : 1
                }
                maxLevelHint={
                  "maxLevelHint" in currentExercise
                    ? currentExercise.maxLevelHint
                    : 0
                }
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
                    setStage(
                      getStageForExercise(activeExercises[nextIndex]),
                    );
                  }
                }}
              />
            ) : currentExercise.kind === "symbol-matrix-search" ? (
              <BuscaSimbolosMatrizGame
                basePoints={currentExercise.points}
                startingLevel={
                  "startingLevel" in currentExercise
                    ? currentExercise.startingLevel
                    : 1
                }
                maxLevelHint={
                  "maxLevelHint" in currentExercise
                    ? currentExercise.maxLevelHint
                    : 0
                }
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
                    setStage(
                      getStageForExercise(activeExercises[nextIndex]),
                    );
                  }
                }}
              />
            ) : currentExercise.kind === "find-missing-item" ? (
              <AcharOFaltandoGame
                basePoints={currentExercise.points}
                startingLevel={
                  "startingLevel" in currentExercise
                    ? currentExercise.startingLevel
                    : 1
                }
                maxLevelHint={
                  "maxLevelHint" in currentExercise
                    ? currentExercise.maxLevelHint
                    : 0
                }
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
                    setStage(
                      getStageForExercise(activeExercises[nextIndex]),
                    );
                  }
                }}
              />
            ) : currentExercise.kind === "copy-matrices" ? (
              <CopiaMatrizesGame
                basePoints={currentExercise.points}
                startingLevel={
                  "startingLevel" in currentExercise
                    ? currentExercise.startingLevel
                    : 1
                }
                maxLevelHint={
                  "maxLevelHint" in currentExercise
                    ? currentExercise.maxLevelHint
                    : 0
                }
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
                    setStage(
                      getStageForExercise(activeExercises[nextIndex]),
                    );
                  }
                }}
              />
            ) : currentExercise.kind === "long-word-search" ? (
              <CacaPalavrasLongosGame
                basePoints={currentExercise.points}
                startingLevel={
                  "startingLevel" in currentExercise
                    ? currentExercise.startingLevel
                    : 1
                }
                maxLevelHint={
                  "maxLevelHint" in currentExercise
                    ? currentExercise.maxLevelHint
                    : 0
                }
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
                    setStage(
                      getStageForExercise(activeExercises[nextIndex]),
                    );
                  }
                }}
              />
            ) : currentExercise.kind === "radar-tone" ? (
              <RadarTonoGame
                basePoints={currentExercise.points}
                startingLevel={
                  "startingLevel" in currentExercise
                    ? currentExercise.startingLevel
                    : 1
                }
                maxLevelHint={
                  "maxLevelHint" in currentExercise
                    ? currentExercise.maxLevelHint
                    : 0
                }
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
                    setStage(
                      getStageForExercise(activeExercises[nextIndex]),
                    );
                  }
                }}
              />
            ) : currentExercise.kind === "drive-word-target" ? (
              <DirijaPalavrasAlvoGame
                basePoints={currentExercise.points}
                startingLevel={
                  "startingLevel" in currentExercise
                    ? currentExercise.startingLevel
                    : 1
                }
                maxLevelHint={
                  "maxLevelHint" in currentExercise
                    ? currentExercise.maxLevelHint
                    : 0
                }
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
                    setStage(
                      getStageForExercise(activeExercises[nextIndex]),
                    );
                  }
                }}
              />
            ) : currentExercise.kind === "chat-error-vigilance" ? (
              <ChatVigilanciaErrosGame
                basePoints={currentExercise.points}
                startingLevel={
                  "startingLevel" in currentExercise
                    ? currentExercise.startingLevel
                    : 1
                }
                maxLevelHint={
                  "maxLevelHint" in currentExercise
                    ? currentExercise.maxLevelHint
                    : 0
                }
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
                    setStage(
                      getStageForExercise(activeExercises[nextIndex]),
                    );
                  }
                }}
              />
            ) : currentExercise.kind === "symbol-map-sound-monitor" ? (
              <MapaSimbolosMonitorSomGame
                basePoints={currentExercise.points}
                startingLevel={
                  "startingLevel" in currentExercise
                    ? currentExercise.startingLevel
                    : 1
                }
                maxLevelHint={
                  "maxLevelHint" in currentExercise
                    ? currentExercise.maxLevelHint
                    : 0
                }
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
                    setStage(
                      getStageForExercise(activeExercises[nextIndex]),
                    );
                  }
                }}
              />
            ) : currentExercise.kind ===
              "rapid-classification-updatable-memory" ? (
              <ClassificacaoRapidaMemoriaAtualizavelGame
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
                    setStage(
                      getStageForExercise(activeExercises[nextIndex]),
                    );
                  }
                }}
              />
            ) : currentExercise.kind === "color-shape-switch" ? (
              <CorOuFormaSwitchGame
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
                    setStage(
                      getStageForExercise(activeExercises[nextIndex]),
                    );
                  }
                }}
              />
            ) : currentExercise.kind === "top-bottom-position-rule-switch" ? (
              <TopoBaixoPositionRuleSwitchGame
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
                    setStage(
                      getStageForExercise(activeExercises[nextIndex]),
                    );
                  }
                }}
              />
            ) : currentExercise.kind === "reversal-go-nogo-switch" ? (
              <ReversalGoNoGoSwitchGame
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
                    setStage(
                      getStageForExercise(activeExercises[nextIndex]),
                    );
                  }
                }}
              />
            ) : currentExercise.kind === "trilha-alternada-tmtb" ? (
              <TrilhaAlternadaTmtbGame
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
                    setStage(
                      getStageForExercise(activeExercises[nextIndex]),
                    );
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
                    setStage(
                      getStageForExercise(activeExercises[nextIndex]),
                    );
                  }
                }}
              />
            ) : null}
          </div>
        )}

        {showingQuizResults && (
          <div className="mt-4 space-y-5">
            <h2 className="text-xl font-semibold text-zinc-900">
              Destaque o Alvo - Concluído!
            </h2>

            <div className="space-y-3">
              {quizResults.map((result, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-black/10 bg-white p-3"
                >
                  <p className="text-sm font-medium text-zinc-900">
                    Fase {idx + 1}
                  </p>
                  <p
                    className={`text-sm ${
                      result.correct
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }`}
                  >
                    {result.correct ? "✓ Acertou" : "✗ Errou"}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border-2 border-zinc-900 bg-white p-4">
              <p className="font-semibold text-zinc-900">Resumo Total</p>
              <div className="mt-2 grid gap-2 text-sm">
                <p>
                  Fases concluídas: {quizResults.length}/
                  {quizExercises.length}
                </p>
                <p>
                  Acertos:{" "}
                  {quizResults.filter((r) => r.correct).length}
                </p>
                <p>
                  Erros:{" "}
                  {quizResults.filter((r) => !r.correct).length}
                </p>
                <p>
                  Pontuação: {score}/{quizTotalPossible}
                </p>
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
                    ? `Jogo individual${
                        selectedSingleTitle
                          ? `: ${selectedSingleTitle}`
                          : ""
                      }`
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
                <p className="text-sm text-zinc-500">
                  Pontuação total
                </p>
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
