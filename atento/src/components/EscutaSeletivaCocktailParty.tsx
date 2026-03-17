import React, { useState } from "react";

// Tipos auxiliares
export type VozAlvo = "masculina" | "feminina";

export interface Trial {
  targetVoice: VozAlvo;
  mascNumbers: number[];
  femNumbers: number[];
  sequence: { voice: VozAlvo; digit: number }[];
  targetSequence: number[];
}

function gerarTrial(): Trial {
  const targetVoice: VozAlvo = Math.random() < 0.5 ? "masculina" : "feminina";
  const mascNumbers = Array.from({ length: 3 }, () => Math.floor(Math.random() * 10));
  const femNumbers = Array.from({ length: 3 }, () => Math.floor(Math.random() * 10));
  // Alternância: sempre masc, fem, masc, fem, masc, fem
  const sequence: { voice: VozAlvo; digit: number }[] = [];
  for (let i = 0; i < 3; i++) {
    sequence.push({ voice: "masculina", digit: mascNumbers[i] });
    sequence.push({ voice: "feminina", digit: femNumbers[i] });
  }
  const targetSequence = sequence.filter(s => s.voice === targetVoice).map(s => s.digit);
  return { targetVoice, mascNumbers, femNumbers, sequence, targetSequence };
}

export const EscutaSeletivaCocktailParty: React.FC = () => {
  const [stage, setStage] = useState<"instrucoes" | "reproduzindo" | "resposta" | "feedback" | "finalizado">("instrucoes");
  const [trial, setTrial] = useState<Trial | null>(null);
  const [userInput, setUserInput] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [resultados, setResultados] = useState<any[]>([]);

  function iniciarTrial() {
    const novoTrial = gerarTrial();
    setTrial(novoTrial);
    setUserInput("");
    setFeedback(null);
    setStage("reproduzindo");
    // TODO: reproduzir áudios sequenciais
    setTimeout(() => setStage("resposta"), 4000); // simula duração do áudio
  }

  function checarResposta() {
    if (!trial) return;
    const resposta = userInput.split("").map(Number);
    const correta = resposta.length === 3 && resposta.every((n, i) => n === trial.targetSequence[i]);
    setFeedback(correta ? "Acertou!" : `Errou. Resposta correta: ${trial.targetSequence.join("")}`);
    setResultados([...resultados, {
      trial,
      resposta: userInput,
      correta,
      tempo: 0 // TODO: medir tempo
    }]);
    setStage("feedback");
  }

  return (
    <div className="max-w-md mx-auto p-4">
      {stage === "instrucoes" && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Escuta Seletiva (Cocktail Party)</h2>
          <p>
            Neste treino, você ouvirá uma sequência de 6 números, alternando entre uma voz masculina e uma feminina.<br />
            Sua tarefa é prestar atenção apenas na voz-alvo indicada (masculina ou feminina) e, ao final, digitar os 3 números falados por essa voz, ignorando os números da outra voz.<br />
            Use fones de ouvido para melhor desempenho.
          </p>
          <button className="btn btn-primary w-full" onClick={iniciarTrial}>Começar</button>
        </div>
      )}
      {stage === "reproduzindo" && trial && (
        <div className="space-y-4">
          <p>Voz-alvo: <b>{trial.targetVoice === "masculina" ? "Masculina" : "Feminina"}</b></p>
          <p>Ouvindo sequência...</p>
          {/* TODO: animação de reprodução */}
        </div>
      )}
      {stage === "resposta" && trial && (
        <div className="space-y-4">
          <p>Voz-alvo: <b>{trial.targetVoice === "masculina" ? "Masculina" : "Feminina"}</b></p>
          <input
            type="text"
            maxLength={3}
            pattern="[0-9]{3}"
            value={userInput}
            onChange={e => setUserInput(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
            className="input input-bordered w-full text-center text-2xl"
            placeholder="Digite os 3 números"
          />
          <button className="btn btn-primary w-full" onClick={checarResposta} disabled={userInput.length !== 3}>Enviar</button>
        </div>
      )}
      {stage === "feedback" && feedback && (
        <div className="space-y-4">
          <p>{feedback}</p>
          <button className="btn btn-primary w-full" onClick={iniciarTrial}>Próxima rodada</button>
          <button className="btn btn-secondary w-full" onClick={() => setStage("finalizado")}>Finalizar treino</button>
        </div>
      )}
      {stage === "finalizado" && (
        <div className="space-y-4">
          <h3 className="font-bold">Relatório</h3>
          <ul className="text-sm">
            {resultados.map((r, i) => (
              <li key={i}>
                Voz-alvo: {r.trial.targetVoice} | Correta: {r.trial.targetSequence.join("")} | Sua resposta: {r.resposta} | {r.correta ? "✔️" : "❌"}
              </li>
            ))}
          </ul>
          <button className="btn btn-primary w-full" onClick={() => { setResultados([]); setStage("instrucoes"); }}>Reiniciar</button>
        </div>
      )}
    </div>
  );
    .map((item) => item.digit);

  // Instrução personalizada
  const instruction = `Preste atenção APENAS na ${VOICE_LABEL[targetVoiceProfile]}. Digite os 3 números falados por essa voz, ignorando os outros.`;

  return {
    id,
    level: config.level,
    phase: config.phase,
    channels,
    targetSide,
    targetVoiceProfile,
    targetSequence,
    instruction,
    playerInput: "",
    correct: null,
    responseTimeMs: null,
    comparedDigitsCount: 0,
    totalDigitsCorrectPosition: 0,
    firstErrorPosition: null,
    responseQualityRatio: 0,
    errorSegment: null,
  };
}

function buildLevelMetrics(
  trials: Trial[],
  level: number,
  phase: Phase,
  score: number,
): LevelMetrics {
  const completedTrials = trials.filter((trial) => trial.correct !== null);
  const correctCount = completedTrials.filter((trial) => trial.correct).length;
  const errorCount = completedTrials.length - correctCount;
  const responseTimes = completedTrials
    .map((trial) => trial.responseTimeMs)
    .filter((time): time is number => time !== null);

  const averageResponseMs =
    responseTimes.length > 0
      ? Math.round(
          responseTimes.reduce((sum, value) => sum + value, 0) /
            responseTimes.length,
        )
      : 0;

  const averageDigitsCorrectPercent =
    completedTrials.length > 0
      ? Math.round(
          (completedTrials.reduce(
            (sum, trial) => sum + trial.responseQualityRatio,
            0,
          ) /
            completedTrials.length) *
            100,
        )
      : 0;

  return {
    level,
    phase,
    totalTrials: completedTrials.length,
    correctCount,
    errorCount,
    accuracy:
      completedTrials.length > 0
        ? correctCount / completedTrials.length
        : 0,
    averageResponseMs,
    score,
    averageDigitsCorrectPercent,
    errorTrend: getErrorTrendLabel(completedTrials),
  };
}

// Arquivo removido: componente EscutaSeletivaCocktailParty eliminado do projeto.
  basePoints,
  startingLevel,
  maxLevelHint,
  reportContext,
  onComplete,
  hideInGameInfo,
}: Props) {
  const [level, setLevel] = useState(startingLevel);
  const [status, setStatus] = useState<GameStatus>("instructions");
  const [trials, setTrials] = useState<Trial[]>([]);
  const [currentTrialIndex, setCurrentTrialIndex] = useState(0);
  const [answerInput, setAnswerInput] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(
    null,
  );
  const [audioError, setAudioError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [errors, setErrors] = useState(0);
  const [allLevelMetrics, setAllLevelMetrics] = useState<LevelMetrics[]>([]);
  const [trialHistory, setTrialHistory] = useState<Trial[]>([]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioContextCreatedRef = useRef(false);
  const [audioTestError, setAudioTestError] = useState<string | null>(null);

  const playAudioTest = useCallback(() => {
    setAudioTestError(null);
    try {
      let audioContext = audioContextRef.current;
      if (!audioContextCreatedRef.current || !audioContext) {
        audioContext = getAudioContext();
        audioContextRef.current = audioContext;
        audioContextCreatedRef.current = true;
      }
      if (!audioContext) throw new Error("Áudio não suportado neste navegador.");
      audioContext.resume();

      const digits = [1, 2, 3];
      const urls = digits.map((d) => VOICE_SAMPLE_PATHS.male[d]);

      urls.forEach((url, idx) => {
        fetch(url)
          .then((response) => {
            if (!response.ok) throw new Error(`Arquivo não encontrado: ${url}`);
            return response.arrayBuffer();
          })
          .then((data) => {
            audioContext.decodeAudioData(data.slice(0), (buffer) => {
              const source = audioContext.createBufferSource();
              source.buffer = buffer;
              source.connect(audioContext.destination);
              const startAt =
                audioContext.currentTime + idx * (buffer.duration + 0.25);
              source.start(startAt);
            });
          })
          .catch((err) => {
            setAudioTestError(
              err instanceof Error
                ? err.message
                : "Erro ao tocar áudio de teste",
            );
          });
      });
    } catch (err) {
      setAudioTestError(
        err instanceof Error ? err.message : "Erro ao tocar áudio de teste",
      );
    }
  }, []);

  const bufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
  const trialStartRef = useRef<number>(0);
  const answerInputRef = useRef<HTMLInputElement | null>(null);

  const config = useMemo(() => getLevelConfig(level), [level]);
  const currentTrial = trials[currentTrialIndex];

  const loadBuffer = useCallback(async (url: string): Promise<AudioBuffer> => {
    const cached = bufferCacheRef.current.get(url);
    if (cached) return cached;

    if (!audioContextRef.current) {
      throw new Error("AudioContext indisponível no navegador.");
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Arquivo não encontrado: ${url}`);
    }

    const data = await response.arrayBuffer();
    const buffer = await audioContextRef.current.decodeAudioData(data.slice(0));
    bufferCacheRef.current.set(url, buffer);
    return buffer;
  }, []);

  const ensureTrialAudioLoaded = useCallback(
    async (trial: Trial, levelConfig: LevelConfig) => {
      const urls = new Set<string>();

      trial.channels.forEach((channel) => {
        channel.sequence.forEach((digit) => {
          urls.add(VOICE_SAMPLE_PATHS[channel.voiceProfile][digit]);
        });
      });

      if (levelConfig.addNoise) {
        NOISE_TRACKS.forEach((track) => urls.add(track));
      }

      await Promise.all(Array.from(urls).map((url) => loadBuffer(url)));
    },
    [loadBuffer],
  );

  // Nova função playTrialAudio: toca dígitos alternando vozes
  const playTrialAudio = useCallback(
    async (trial: Trial, levelConfig: LevelConfig) => {
      const audioContext = audioContextRef.current;
      if (!audioContext) {
        throw new Error("Áudio não suportado neste navegador.");
      }

      await audioContext.resume();

      // Reconstrói a sequência alternada de dígitos/vozes
      // Assumimos sempre 3 dígitos por voz, alternando
      const alternatedSequence: { digit: number; voice: VoiceProfileId }[] = [];
      for (let i = 0; i < 3; i++) {
        alternatedSequence.push({ digit: trial.channels[0].sequence[i], voice: trial.channels[0].voiceProfile });
        alternatedSequence.push({ digit: trial.channels[1].sequence[i], voice: trial.channels[1].voiceProfile });
      }

      // Pré-carrega buffers
      for (const item of alternatedSequence) {
        await loadBuffer(VOICE_SAMPLE_PATHS[item.voice][item.digit]);
      }
      if (levelConfig.addNoise) {
        for (const noise of NOISE_TRACKS) {
          await loadBuffer(noise);
        }
      }

      const startAt = audioContext.currentTime + 0.12;
      let cursor = startAt;
      let latestEnd = startAt;

      // Toca cada dígito em sequência, alternando a voz
      for (const item of alternatedSequence) {
        const buffer = bufferCacheRef.current.get(VOICE_SAMPLE_PATHS[item.voice][item.digit]);
        if (!buffer) continue;
        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();
        const panner = audioContext.createStereoPanner();
        // Pan de acordo com o canal (voz-alvo ou não)
        const pan = trial.channels.find(c => c.voiceProfile === item.voice)?.pan ?? 0;
        source.buffer = buffer;
        gainNode.gain.value = 0.95;
        panner.pan.value = pan;
        source.connect(gainNode);
        gainNode.connect(panner);
        panner.connect(audioContext.destination);
        source.start(cursor);
        cursor += buffer.duration + levelConfig.digitGapSeconds;
        latestEnd = cursor;
      }

      if (levelConfig.addNoise) {
        const noiseTrack = randomItem([...NOISE_TRACKS]);
        const noiseBuffer = bufferCacheRef.current.get(noiseTrack);
        if (noiseBuffer) {
          const noiseSource = audioContext.createBufferSource();
          const noiseGain = audioContext.createGain();
          noiseSource.buffer = noiseBuffer;
          noiseSource.loop = true;
          noiseGain.gain.value = 0.16;
          noiseSource.connect(noiseGain);
          noiseGain.connect(audioContext.destination);
          noiseSource.start(startAt);
          noiseSource.stop(latestEnd);
        }
      }

      return Math.max(0, (latestEnd - audioContext.currentTime) * 1000);
    },
    [loadBuffer],
  );

  const startLevel = useCallback(
    (levelToStart: number = level) => {
      const nextConfig = getLevelConfig(levelToStart);
      const generatedTrials = Array.from(
        { length: nextConfig.trialsPerLevel },
        (_, index) => buildTrial(index, nextConfig),
      );

      setLevel(levelToStart);
      setTrials(generatedTrials);
      setCurrentTrialIndex(0);
      setAnswerInput("");
      setFeedback(null);
      setAudioError(null);
      setScore(0);
      setHits(0);
      setErrors(0);
      setStatus("ready");
    },
    [level],
  );

  const goToNextTrial = useCallback(() => {
    const nextIndex = currentTrialIndex + 1;
    setFeedback(null);
    setAnswerInput("");

    if (nextIndex >= trials.length) {
      return;
    }

    setCurrentTrialIndex(nextIndex);
    setAudioError(null);
    setCountdown(3);
    setStatus("countdown");
  }, [currentTrialIndex, trials.length]);

  const beginListening = useCallback(async () => {
    if (!currentTrial) return;

    setAudioError(null);
    setStatus("listening");
    trialStartRef.current = performance.now();

    try {
      const durationMs = await playTrialAudio(currentTrial, config);
      window.setTimeout(() => {
        setStatus("answering");
      }, durationMs + 80);
    } catch (error) {
      setAudioError(
        error instanceof Error
          ? `${error.message} Verifique os arquivos em ${AUDIO_BASE_PATH}.`
          : `Falha ao tocar áudio. Verifique os arquivos em ${AUDIO_BASE_PATH}.`,
      );
      setStatus("answering");
    }
  }, [config, currentTrial, playTrialAudio]);

  const startListening = useCallback(() => {
    setAudioError(null);
    if (!audioContextCreatedRef.current) {
      audioContextRef.current = getAudioContext();
      audioContextCreatedRef.current = true;
    }
    setCountdown(3);
    setStatus("countdown");
  }, []);

  const confirmAnswer = useCallback(() => {
    if (!currentTrial || (status !== "answering" && status !== "feedback"))
      return;

    const evaluation = evaluateSequence(
      currentTrial.targetSequence,
      answerInput,
    );
    const expected = currentTrial.targetSequence.join("");
    const isCorrect = evaluation.normalizedInput === expected;
    const responseTimeMs = Math.round(
      performance.now() - trialStartRef.current,
    );

    playFeedbackSound(isCorrect);
    setFeedback(isCorrect ? "correct" : "incorrect");

    setTrials((prev) =>
      prev.map((trial, index) =>
        index === currentTrialIndex
          ? {
              ...trial,
              playerInput: evaluation.normalizedInput,
              correct: isCorrect,
              responseTimeMs,
              comparedDigitsCount: evaluation.comparedDigitsCount,
              totalDigitsCorrectPosition:
                evaluation.totalDigitsCorrectPosition,
              firstErrorPosition: evaluation.firstErrorPosition,
              responseQualityRatio: evaluation.responseQualityRatio,
              errorSegment: evaluation.errorSegment,
            }
          : trial,
      ),
    );

    if (isCorrect) {
      setHits((value) => value + 1);
      setScore((value) => value + (responseTimeMs <= 7000 ? 12 : 8));
    } else {
      setErrors((value) => value + 1);
      setScore((value) => Math.max(0, value - 4));
    }

    setStatus("feedback");
  }, [answerInput, currentTrial, currentTrialIndex, status]);

  const goToNextStep = useCallback(() => {
    const isLastTrialOfLevel = currentTrialIndex + 1 >= trials.length;

    if (!isLastTrialOfLevel) {
      goToNextTrial();
      return;
    }

    const levelMetrics = buildLevelMetrics(
      trials,
      level,
      config.phase,
      score,
    );
    const completedTrials = trials.filter(
      (trial): trial is Trial & { correct: boolean } =>
        trial.correct !== null,
    );

    setAllLevelMetrics((prev) => [...prev, levelMetrics]);
    setTrialHistory((prev) => [...prev, ...completedTrials]);

    if (level >= maxLevelHint) {
      setStatus("completed");
      return;
    }

    startLevel(Math.min(maxLevelHint, level + 1));
  }, [
    config.phase,
    currentTrialIndex,
    goToNextTrial,
    level,
    maxLevelHint,
    score,
    startLevel,
    trials,
  ]);

  useEffect(() => {
    if (status !== "answering") return;

    window.setTimeout(() => {
      answerInputRef.current?.focus();
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        confirmAnswer();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmAnswer, status]);

  useEffect(() => {
    if (status !== "countdown") return;

    if (countdown <= 0) {
      beginListening();
      return;
    }

    const timer = window.setTimeout(() => {
      setCountdown((value) => value - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [beginListening, countdown, status]);

  const downloadResults = () => {
    const lines: string[] = [];
    lines.push("=" + "=".repeat(60));
  // ...existing code...
    lines.push("=" + "=".repeat(60));
    lines.push("");
    if (reportContext) {
      lines.push(
        `Escopo: ${
          reportContext.mode === "sequence"
            ? `Trilha completa (${reportContext.scopeLabel})`
            : `Jogo individual (${reportContext.scopeLabel})`
        }`,
      );
      lines.push("");
    }

    allLevelMetrics.forEach((metric, index) => {
      lines.push(`Nível ${index + 1} (Fase ${metric.phase}):`);
      lines.push(`  Tentativas: ${metric.totalTrials}`);
      lines.push(`  Acertos: ${metric.correctCount}`);
      lines.push(`  Erros: ${metric.errorCount}`);
      lines.push(`  Acurácia: ${Math.round(metric.accuracy * 100)}%`);
      lines.push(`  Tempo médio de resposta: ${metric.averageResponseMs}ms`);
      lines.push(
        `  Dígitos corretos médios (posição): ${metric.averageDigitsCorrectPercent}%`,
      );
      lines.push(`  Tendência de erro: ${metric.errorTrend}`);
      lines.push(`  Pontuação: ${metric.score}`);
      lines.push("");
    });

    const totalTrials = allLevelMetrics.reduce(
      (sum, metric) => sum + metric.totalTrials,
      0,
    );
    const totalCorrect = allLevelMetrics.reduce(
      (sum, metric) => sum + metric.correctCount,
      0,
    );
    const totalErrors = allLevelMetrics.reduce(
      (sum, metric) => sum + metric.errorCount,
      0,
    );
    const totalScore = allLevelMetrics.reduce(
      (sum, metric) => sum + metric.score,
      0,
    );
    const totalAccuracy =
      totalTrials > 0 ? Math.round((totalCorrect / totalTrials) * 100) : 0;

    lines.push("=" + "=".repeat(60));
    lines.push("RESUMO TOTAL:");
    lines.push(`Níveis completados: ${allLevelMetrics.length}`);
    lines.push(`Tentativas totais: ${totalTrials}`);
    lines.push(`Acertos totais: ${totalCorrect}`);
    lines.push(`Erros totais: ${totalErrors}`);
    lines.push(`Pontuação total: ${totalScore}`);
    lines.push(`Acurácia geral: ${totalAccuracy}%`);
    lines.push("");
    lines.push("DETALHE POR TENTATIVA:");

    trialHistory.forEach((trial, index) => {
      lines.push(
        `#${index + 1} | fase ${trial.phase} | alvo ${
          VOICE_LABEL[trial.targetVoiceProfile]
        } (${SIDE_LABEL[trial.targetSide]}) | correta ${trial.targetSequence.join(
          "",
        )} | resposta ${trial.playerInput || "(vazio)"} | acerto global ${
          trial.correct ? "sim" : "não"
        } | acertos por posição ${
          trial.totalDigitsCorrectPosition
        }/${trial.targetSequence.length} | 1º erro ${
          trial.firstErrorPosition ?? "nenhum"
        } | tempo ${trial.responseTimeMs ?? 0}ms`,
      );
    });

    lines.push("=" + "=".repeat(60));

    const blob = new Blob([lines.join("\n")], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = buildTxtReportFileName({
      mode: reportContext?.mode ?? "single",
      attentionTypeLabel: reportContext?.attentionTypeLabel,
      participantName: reportContext?.participantName,
    });
    link.click();
    URL.revokeObjectURL(url);
  };

  const finishExercise = () => {
    const totalTrials = allLevelMetrics.reduce(
      (sum, metric) => sum + metric.totalTrials,
      0,
    );
    const totalCorrect = allLevelMetrics.reduce(
      (sum, metric) => sum + metric.correctCount,
      0,
    );
    const accuracy = totalTrials > 0 ? totalCorrect / totalTrials : 0;

    const success = accuracy >= MIN_ACCURACY_TARGET;
    const pointsEarned = success ? basePoints : Math.round(basePoints * 0.4);
    onComplete({ success, pointsEarned });
  };

  const summaryByPhase = useMemo(() => {
    return ([1, 2, 3] as const).map((phase) => {
      const phaseMetrics = allLevelMetrics.filter(
        (metric) => metric.phase === phase,
      );
      const totalTrials = phaseMetrics.reduce(
        (sum, metric) => sum + metric.totalTrials,
        0,
      );
      const correctCount = phaseMetrics.reduce(
        (sum, metric) => sum + metric.correctCount,
        0,
      );
      const errorCount = phaseMetrics.reduce(
        (sum, metric) => sum + metric.errorCount,
        0,
      );
      const responseAvg =
        phaseMetrics.length > 0
          ? Math.round(
              phaseMetrics.reduce(
                (sum, metric) => sum + metric.averageResponseMs,
                0,
              ) / phaseMetrics.length,
            )
          : 0;

      const averageDigitsCorrectPercent =
        phaseMetrics.length > 0
          ? Math.round(
              phaseMetrics.reduce(
                (sum, metric) => sum + metric.averageDigitsCorrectPercent,
                0,
              ) / phaseMetrics.length,
            )
          : 0;

      const phaseTrials = trialHistory.filter(
        (trial) => trial.phase === phase,
      );

      return {
        phase,
        totalTrials,
        correctCount,
        errorCount,
        responseAvg,
        averageDigitsCorrectPercent,
        errorTrend: getErrorTrendLabel(phaseTrials),
      };
    });
  }, [allLevelMetrics, trialHistory]);

  return (
    <div className="mt-4 space-y-4">
      {/* Janela única de explicação e instrução antes do treino */}
      {status === "instructions" && currentTrial && currentTrialIndex === 0 && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-zinc-50 p-6">
          <div>
            <h2 className="text-lg font-bold mb-2">Como funciona o treino?</h2>
            <p className="mb-2">
              Neste treino, você ouvirá uma sequência de <b>6 números</b>, alternando entre uma voz masculina e uma feminina. Sua tarefa é prestar atenção <b>apenas na voz-alvo indicada</b> (masculina ou feminina) e, ao final, digitar os <b>3 números</b> falados por essa voz, ignorando os números da outra voz.
            </p>
            <ul className="list-disc pl-5 text-sm text-zinc-700 mb-2">
              <li>A cada rodada, a voz-alvo será informada antes do início.</li>
              <li>Os números são apresentados um de cada vez, alternando as vozes.</li>
              <li>Digite apenas os números da voz-alvo, na ordem em que foram falados.</li>
            </ul>
            <p className="text-sm text-zinc-600">Use fones de ouvido para melhor desempenho.</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <button
              type="button"
              onClick={playAudioTest}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-800"
            >
              Testar áudio agora
            </button>
            {audioTestError && (
              <span className="text-sm text-amber-700">{audioTestError}</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setStatus("ready")}
            className="h-11 w-full rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
          >
            Iniciar treino
          </button>

          {audioError && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              {audioError}
            </p>
          )}
        </div>
      )}

      {status === "listening" && currentTrial && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-zinc-50 p-6">
          <p className="text-center text-sm text-zinc-600">
            Reproduzindo áudio...
          </p>
          <p
            className="text-center font-extrabold text-zinc-900 tracking-wide"
            style={{ textTransform: "uppercase" }}
          >
            {currentTrial.instruction}
          </p>
          <p className="text-center text-xs text-zinc-500">
            Aguarde o fim da reprodução para digitar a sequência.
          </p>
        </div>
      )}

      {status === "countdown" && currentTrial && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-zinc-50 p-6">
          <p className="text-center text-sm text-zinc-600">Prepare-se</p>
          <p
            className="text-center font-extrabold text-zinc-900 tracking-wide"
            style={{ textTransform: "uppercase" }}
          >
            {currentTrial.instruction}
          </p>
          <p className="text-center text-5xl font-semibold text-zinc-900">
            {countdown}
          </p>
        </div>
      )}

      {status === "answering" && currentTrial && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-zinc-50 p-6">
          <p className="font-semibold text-zinc-900">
            Digite a sequência do canal-alvo
          </p>
          <p
            className="text-sm font-extrabold text-zinc-900 tracking-wide"
            style={{ textTransform: "uppercase" }}
          >
            {currentTrial.instruction}
          </p>

          <input
            ref={answerInputRef}
            autoFocus
            value={answerInput}
            onChange={(event) =>
              setAnswerInput(event.target.value.replace(/\D/g, ""))
            }
            placeholder="Ex.: 274"
            className="w-full rounded-lg border border-black/20 bg-white px-4 py-3 text-lg tracking-[0.2em] text-zinc-900 outline-none focus:border-zinc-700"
          />

          <button
            type="button"
            onClick={confirmAnswer}
            className="h-11 w-full rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
          >
            Confirmar resposta
          </button>
        </div>
      )}

      {status === "feedback" && currentTrial && (
        <div className="space-y-3 rounded-lg border border-black/10 bg-zinc-50 p-6">
          <p
            className={`text-center font-semibold ${
              feedback === "correct" ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {feedback === "correct" ? "✓ Acertou" : "✗ Errou"}
          </p>
          <p className="text-center text-sm text-zinc-700">
            Sequência correta:{" "}
            <strong>{currentTrial.targetSequence.join("")}</strong>
          </p>
          <p className="text-center text-sm text-zinc-700">
            Sua resposta: <strong>{answerInput || "(vazio)"}</strong>
          </p>

          <button
            type="button"
            onClick={goToNextStep}
            className="mt-2 h-11 w-full rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
          >
            Ir para a próxima
          </button>
        </div>
      )}

      {status === "completed" && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-zinc-50 p-6">
          <h3 className="text-xl font-semibold text-zinc-900">
            Jogo concluído!
          </h3>

          <div className="space-y-3">
            {allLevelMetrics.map((metric, index) => (
              <div
                key={index}
                className="rounded-lg border border-black/10 bg-white p-3"
              >
                <p className="text-sm font-medium text-zinc-900">
                  Nível {index + 1} • Fase {metric.phase}
                </p>
                <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-zinc-600">
                  <p>Pontuação: {metric.score}</p>
                  <p>Acurácia: {Math.round(metric.accuracy * 100)}%</p>
                  <p>Acertos: {metric.correctCount}</p>
                  <p>Erros: {metric.errorCount}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border-2 border-zinc-900 bg-white p-4">
            <p className="font-semibold text-zinc-900">Resumo por fase</p>
            <div className="mt-2 grid gap-2 text-sm">
              {summaryByPhase.map((phaseSummary) => (
                <p key={phaseSummary.phase}>
                  Fase {phaseSummary.phase}: {phaseSummary.totalTrials}{" "}
                  tentativas, {phaseSummary.correctCount} acertos,{" "}
                  {phaseSummary.errorCount} erros, tempo médio{" "}
                  {phaseSummary.responseAvg}ms, dígitos corretos médios{" "}
                  {phaseSummary.averageDigitsCorrectPercent}%,{" "}
                  {phaseSummary.errorTrend}
                </p>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={downloadResults}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              Baixar Resultados
            </button>
            <button
              type="button"
              onClick={finishExercise}
              className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
            >
              Continuar
            </button>
          </div>

          <p className="text-xs text-zinc-500">
            Meta sugerida de desempenho:{" "}
            {Math.round(MIN_ACCURACY_TARGET * 100)}% de acerto.
          </p>
        </div>
      )}
    </div>
  );
}
