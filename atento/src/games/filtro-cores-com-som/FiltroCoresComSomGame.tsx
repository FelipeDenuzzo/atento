"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReportContext } from "@/components/AttentionTrainingGame";
import { COLOR_HEX, COLOR_LABEL, LEVELS } from "./levels";
import {
  average,
  buildSessionSummary,
  getNextTargetColor,
  hitTestShape,
  saveSessionLog,
  shouldSpawnShape,
  updateShapes,
  getClickZone,
} from "./logic";


// Tipos de zona e bloco
export type Zone = "top" | "center" | "bottom";
export type BlockConfig = {
  index: number;
  activeZone: Zone;
  // outros parâmetros do bloco podem ser adicionados aqui
};

import { ColorId, FallingShape, LevelSummary, ShapeKind, TargetMode, ClickZone, AttemptLog } from "./types";
// Configuração dos blocos/fases com zona ativa
const BLOCKS: BlockConfig[] = [
  { index: 1, activeZone: "center" },
  { index: 2, activeZone: "top" },
  { index: 3, activeZone: "bottom" },
];

type Phase = "intro" | "running" | "level-summary" | "session-summary";

type Props = {
  basePoints: number;
  startingLevel: number;
  maxLevelHint: number;
  reportContext?: ReportContext;
  onComplete: (result: { success: boolean; pointsEarned: number }) => void;
};


const SHAPE_IMG: Record<ShapeKind, string> = {
  "círculo": "circulo",
  "quadrado": "quadrado",
  "triângulo": "triangulo",
};

type Feedback = "none" | "correct" | "wrong";

function randomItem<T>(items: T[], rng: () => number = Math.random): T {
  return items[Math.floor(rng() * items.length)];
}

function playTone(type: "correct" | "wrong") {
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (type === "correct") {
      oscillator.frequency.value = 880;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.12);
    } else {
      oscillator.frequency.value = 200;
      oscillator.type = "sawtooth";
      gainNode.gain.setValueAtTime(0.18, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.18);
    }
  } catch {
    // Sem audio
  }
}


function speakTarget(targetMode: TargetMode, value: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const text = targetMode === "color" ? COLOR_LABEL[value as ColorId] : value.charAt(0).toUpperCase() + value.slice(1);
  const utterance = new SpeechSynthesisUtterance(`${text}!`);
  utterance.lang = "pt-BR";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export function FiltroCoresComSomGame({
  basePoints,
  startingLevel,
  maxLevelHint,
  reportContext,
  onComplete,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const shapesRef = useRef<FallingShape[]>([]);
  const levelStartRef = useRef<number | null>(null);

  const levels = useMemo(() => LEVELS, []);
  const firstLevelIndex = Math.max(0, levels.findIndex((level) => level.id >= startingLevel));
  const lastAllowedLevelId = Math.max(startingLevel, maxLevelHint);

  const [levelIndex, setLevelIndex] = useState(firstLevelIndex);
  const [phase, setPhase] = useState<Phase>("intro");
  // currentTarget: para shape-color, formato "forma-cor" (ex: "círculo-azul")
  const [currentTarget, setCurrentTarget] = useState<string>(levels[firstLevelIndex]?.initialTarget ?? "green");
  const [flashTarget, setFlashTarget] = useState(false);
  const [timeRemainingMs, setTimeRemainingMs] = useState(levels[firstLevelIndex]?.durationMs ?? 0);
  const [hits, setHits] = useState(0);
  const [errors, setErrors] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>("none");
  const [shapes, setShapes] = useState<FallingShape[]>([]);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [levelSummaries, setLevelSummaries] = useState<LevelSummary[]>([]);
  // Novos estados para avaliação seletiva e zonas
  const [attemptLogs, setAttemptLogs] = useState<AttemptLog[]>([]);
  const [centralHits, setCentralHits] = useState(0);
  const [omissions, setOmissions] = useState(0);
  const [spatialErrors, setSpatialErrors] = useState(0);
  const [falseAlarms, setFalseAlarms] = useState(0);
  const [activeZone, setActiveZone] = useState<Zone>(BLOCKS[0].activeZone);

  const level = levels[levelIndex];
  const targetMode: TargetMode = level.targetMode;
  const canAdvance = levelIndex < levels.length - 1 && levels[levelIndex + 1].id <= lastAllowedLevelId;

  const summary = useMemo(() => buildSessionSummary(levelSummaries), [levelSummaries]);

  const syncShapes = useCallback((next: FallingShape[]) => {
    shapesRef.current = next;
    setShapes(next);
  }, []);

  const createShape = useCallback((): FallingShape | null => {
    const container = containerRef.current;
    if (!container) return null;

    const rect = container.getBoundingClientRect();
    const size = 18 + Math.random() * 14;
    const x = size + Math.random() * (rect.width - size * 2);
    const y = -size;
    const colorId = randomItem(level.availableColors);
    const shapeKinds = level.availableShapes;
    const kind = shapeKinds[Math.floor(Math.random() * shapeKinds.length)];
    const now = performance.now();

    return {
      id: `shape-${now}-${Math.round(Math.random() * 1000)}`,
      x,
      y,
      size,
      colorId,
      kind,
      isCaptured: false,
      spawnedAt: now,
    };
  }, [level.availableColors]);

  const resetLevelState = useCallback(() => {
    syncShapes([]);
    setHits(0);
    setErrors(0);
    setReactionTimes([]);
    setFeedback("none");
    setTimeRemainingMs(level.durationMs);
    setCurrentTarget(level.initialTarget);
    setAttemptLogs([]);
    setCentralHits(0);
    setOmissions(0);
    setSpatialErrors(0);
    setFalseAlarms(0);
    // Atualiza zona ativa conforme bloco
    const block = BLOCKS.find(b => b.index === levelIndex + 1);
    setActiveZone(block?.activeZone ?? "center");
  }, [level, syncShapes, levelIndex]);

  // Função para sortear alvo shape-color
  function getRandomShapeColorTarget(): string {
    const color = randomItem(level.availableColors);
    const shape = randomItem(level.availableShapes);
    return `${shape}-${color}`;
  }

  const startLevel = useCallback(() => {
    resetLevelState();
    setPhase("running");
    levelStartRef.current = performance.now();
    setCurrentTarget(level.initialTarget);
    speakTarget(targetMode, level.initialTarget);
  }, [level.initialTarget, resetLevelState, targetMode, level.availableColors, level.availableShapes]);

  useEffect(() => {
    if (phase !== "running") return;

    const spawnTimer = window.setInterval(() => {
      if (!shouldSpawnShape(shapesRef.current, level.maxSimultaneousShapes)) return;
      const shape = createShape();
      if (!shape) return;
      syncShapes([...shapesRef.current, shape]);
    }, level.spawnIntervalMs);

    const targetTimer = window.setInterval(() => {
      setCurrentTarget((current) => {
        let next: string | undefined;
        if (targetMode === "color") {
          const arr = level.availableColors;
          next = arr[(arr.indexOf(current as ColorId) + 1) % arr.length];
        } else if (targetMode === "shape") {
          const arr = level.availableShapes;
          next = arr[(arr.indexOf(current as ShapeKind) + 1) % arr.length];
        }
        if (next !== undefined && next !== current) {
          speakTarget(targetMode, next);
          setFlashTarget(true);
          window.setTimeout(() => setFlashTarget(false), 300);
          return next;
        }
        return current;
      });
    }, level.targetChangeIntervalMs);

    const timeTimer = window.setInterval(() => {
      if (!levelStartRef.current) return;
      const elapsed = performance.now() - levelStartRef.current;
      const remaining = Math.max(0, level.durationMs - elapsed);
      setTimeRemainingMs(remaining);
      if (remaining <= 0) {
        setPhase("level-summary");
      }
    }, 200);

    return () => {
      window.clearInterval(spawnTimer);
      window.clearInterval(targetTimer);
      window.clearInterval(timeTimer);
    };
  }, [
    phase,
    level.availableColors,
    level.targetChangeIntervalMs,
    level.durationMs,
    level.maxSimultaneousShapes,
    level.spawnIntervalMs,
    createShape,
    syncShapes,
  ]);

  useEffect(() => {
    if (phase !== "running") return;

    function step(timestamp: number) {
      const last = lastFrameRef.current ?? timestamp;
      const deltaSeconds = Math.min(0.05, (timestamp - last) / 1000);
      lastFrameRef.current = timestamp;

      const container = containerRef.current;
      const height = container?.getBoundingClientRect().height ?? 0;
      const nextShapes = updateShapes(
        shapesRef.current,
        deltaSeconds,
        level.fallSpeed,
        height,
        timestamp,
      );
      syncShapes(nextShapes);

      animationRef.current = window.requestAnimationFrame(step);
    }

    animationRef.current = window.requestAnimationFrame(step);

    return () => {
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
      }
      lastFrameRef.current = null;
    };
  }, [phase, level.fallSpeed, syncShapes]);

  useEffect(() => {
    if (phase !== "level-summary") return;

    const levelSummary: LevelSummary = {
      levelId: level.id,
      levelName: level.name,
      durationMs: level.durationMs,
      hits,
      errors,
      averageReactionMs: average(reactionTimes),
    };

    setLevelSummaries((prev) => [...prev, levelSummary]);
  }, [phase, errors, hits, level, reactionTimes]);

  useEffect(() => {
    if (phase === "level-summary" || phase === "session-summary") {
      syncShapes([]);
    }
  }, [phase, syncShapes]);

  // Função para registrar tentativa detalhada e atualizar métricas
  const registerAttempt = useCallback((log: AttemptLog & {
    targetZone: Zone | null;
    activeZone: Zone;
    clickZone: Zone | null;
    hasTarget: boolean;
    isClick: boolean;
    isCorrectTarget: boolean;
  }) => {
    setAttemptLogs((prev) => [...prev, log]);
    // Métricas
    if (log.isCorrectTarget) setCentralHits((v) => v + 1);
    else if (log.hasTarget && log.targetZone === log.activeZone && !log.isClick) setOmissions((v) => v + 1);
    else if (log.hasTarget && log.targetZone === log.activeZone && log.isClick && log.clickZone !== log.activeZone) setSpatialErrors((v) => v + 1);
    else if (!log.hasTarget || (log.hasTarget && log.targetZone !== log.activeZone && log.isClick)) setFalseAlarms((v) => v + 1);
  }, []);

  // Função para detectar zona do clique
  const getZoneForClick = (shape: FallingShape, clickY: number): ClickZone => {
    return getClickZone(shape, clickY);
  };

  // Adaptar handleShapeClick para registrar zona e detalhes
  const handleShapeClick = useCallback(
    (shape: FallingShape, event?: React.MouseEvent) => {
      if (phase !== "running" || shape.isCaptured) return;
      const now = performance.now();
      let isTarget = false;
      if (targetMode === "color") {
        isTarget = shape.colorId === currentTarget;
      } else if (targetMode === "shape") {
        isTarget = shape.kind === currentTarget;
      }
      // Determina zona do estímulo (não existe shape.zone, usar 'center')
      const shapeZone: Zone = "center";
      // Calcular zona do clique
      let clickedZone: Zone = shapeZone;
      if (event && event.nativeEvent) {
        const btn = event.currentTarget as HTMLElement;
        const rect = btn.getBoundingClientRect();
        const clickY = event.nativeEvent.clientY - rect.top;
        clickedZone = getClickZone(shape, shape.y - shape.size + clickY) as Zone;
      }
      const isClick = true;
      const hasTarget = isTarget;
      const isCorrectTarget = hasTarget && shapeZone === activeZone && clickedZone === activeZone;
      const reactionMs = isCorrectTarget ? Math.max(0, Math.round(now - shape.spawnedAt)) : null;
      // Registro detalhado
      registerAttempt({
        targetMode,
        targetValue: currentTarget,
        clickedItemId: shape.id,
        clickedZone,
        isCorrectItem: isTarget,
        isCentralHit: isCorrectTarget,
        reactionTimeMs: reactionMs,
        targetZone: shapeZone,
        activeZone,
        clickZone: clickedZone,
        hasTarget,
        isClick,
        isCorrectTarget,
      });
      if (isCorrectTarget) {
        setReactionTimes((prev) => [...prev, reactionMs!]);
        setHits((value) => value + 1);
        setFeedback("correct");
        playTone("correct");
      } else {
        setErrors((value) => value + 1);
        setFeedback("wrong");
        playTone("wrong");
      }
      const nextShapes = shapesRef.current.map((s) =>
        s.id === shape.id ? { ...s, isCaptured: true, capturedAt: now } : s
      );
      syncShapes(nextShapes);
    },
    [currentTarget, phase, syncShapes, targetMode, registerAttempt, activeZone],
  );

  // Clique/touch agora é por item

  function continueAfterLevel() {
    if (canAdvance) {
      setLevelIndex((value) => value + 1);
      setPhase("intro");
      return;
    }
    saveSessionLog(levelSummaries, reportContext);
    setPhase("session-summary");
  }

  function finishSession() {
    const pointsEarned = Math.round(basePoints * summary.accuracy);
    const success = summary.accuracy >= 0.7;
    onComplete({ success, pointsEarned });
  }

  useEffect(() => {
    if (phase !== "intro") return;
    resetLevelState();
  }, [phase, resetLevelState]);



  // Função para calcular a zona de um Y relativo ao container
  function getZoneFromY(y: number, containerHeight: number): Zone {
    const zoneHeight = containerHeight / 3;
    if (y < zoneHeight) return "top";
    if (y < zoneHeight * 2) return "center";
    return "bottom";
  }

  // Função para obter a zona de um estímulo pela posição Y do centro
  function getZoneOfShape(shape: FallingShape, containerHeight: number): Zone {
    const y = shape.y;
    return getZoneFromY(y, containerHeight);
  }

  // Handler de clique no container
  const handleContainerClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (phase !== "running") return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const clickY = event.clientY - rect.top;
    const clickZone = getZoneFromY(clickY, rect.height);

    // Verifica se algum shape foi clicado (de cima para baixo)
    const clickX = event.clientX - rect.left;
    let clickedShape: FallingShape | null = null;
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];
      if (shape.isCaptured) continue;
      const dx = clickX - shape.x;
      const dy = clickY - shape.y;
      if (shape.kind === "círculo") {
        if (dx * dx + dy * dy <= shape.size * shape.size) {
          clickedShape = shape;
          break;
        }
      } else if (shape.kind === "quadrado" || shape.kind === "triângulo") {
        if (Math.abs(dx) <= shape.size && Math.abs(dy) <= shape.size) {
          clickedShape = shape;
          break;
        }
      }
    }

    // Avaliação
    let isTarget = false;
    let targetZone: Zone | null = null;
    let hasTarget = false;
    let isCorrectTarget = false;
    let reactionMs: number | null = null;
    const now = performance.now();
    if (clickedShape) {
      if (targetMode === "color") {
        isTarget = clickedShape.colorId === currentTarget;
      } else {
        isTarget = clickedShape.kind === currentTarget;
      }
      targetZone = getZoneOfShape(clickedShape, rect.height);
      hasTarget = isTarget;
      isCorrectTarget = hasTarget && targetZone === activeZone && clickZone === activeZone;
      reactionMs = isCorrectTarget ? Math.max(0, Math.round(now - clickedShape.spawnedAt)) : null;
    }

    registerAttempt({
      targetMode,
      targetValue: currentTarget,
      clickedItemId: clickedShape ? clickedShape.id : null,
      clickedZone: clickZone,
      isCorrectItem: isTarget,
      isCentralHit: isCorrectTarget,
      reactionTimeMs: reactionMs,
      targetZone,
      activeZone,
      clickZone,
      hasTarget,
      isClick: true,
      isCorrectTarget,
    });

    if (isCorrectTarget) {
      setReactionTimes((prev) => [...prev, reactionMs!]);
      setHits((value) => value + 1);
      setFeedback("correct");
      playTone("correct");
    } else {
      setErrors((value) => value + 1);
      setFeedback("wrong");
      playTone("wrong");
    }
    if (clickedShape) {
      const nextShapes = shapesRef.current.map((s) =>
        s.id === clickedShape!.id ? { ...s, isCaptured: true, capturedAt: now } : s
      );
      syncShapes(nextShapes);
    }
  }, [phase, shapes, targetMode, currentTarget, activeZone, registerAttempt, syncShapes]);

  return (
    <div className="space-y-5">
      {phase === "intro" && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-6">
          <div>
            <p className="text-sm text-zinc-500">Nível atual</p>
            <h3 className="text-xl font-semibold text-zinc-900">{level.name}</h3>
            <p className="mt-2 text-sm text-zinc-700">
              Formas coloridas vão cair pela tela. Uma voz vai anunciar uma cor ou uma forma — e essa é a <strong>única cor ou forma que você deve clicar</strong>. Deixe todos outros itens passarem sem tocar. Fique atento: a voz pode anunciar uma <strong>nova cor a qualquer momento</strong>, e você precisará mudar seu foco imediatamente.
              Você deve clicar apenas quando o item anunciado estiver na faixa destacada em verde. A cada bloco, a faixa ativa muda, então preste atenção para não clicar fora dela!
            </p>
            <div className="mt-2 flex flex-col gap-1">
              <span className="text-xs text-zinc-500">Faixa ativa deste bloco:</span>
              <span className="font-bold text-base" style={{ color: "#059669" }}>{activeZone === "top" ? "Faixa superior" : activeZone === "center" ? "Faixa central" : "Faixa inferior"}</span>
            </div>
</div>
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm">
            <div>
              <p className="text-xs text-zinc-500">ALVO ATUAL</p>
              <p className="text-base font-semibold text-black">
                {targetMode === "color"
                  ? (COLOR_LABEL[currentTarget as ColorId]?.toUpperCase() || String(currentTarget).toUpperCase())
                  : targetMode === "shape"
                    ? (typeof currentTarget === "string" ? currentTarget.charAt(0).toUpperCase() + currentTarget.slice(1) : String(currentTarget))
                    : (() => {
                        const [shape, color] = currentTarget.split("-");
                        return `${shape.charAt(0).toUpperCase() + shape.slice(1)} ${COLOR_LABEL[color as ColorId]}`;
                      })()
                }
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={startLevel}
            className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-base font-medium text-white hover:bg-zinc-700"
          >
            Iniciar nivel
          </button>
        </div>
      )}

      {phase === "running" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className={`rounded-lg border px-3 py-2 text-sm font-semibold text-black ${flashTarget ? "border-emerald-400 bg-emerald-50" : "border-zinc-200 bg-white"}`}>
              Alvo: {targetMode === "color"
                ? COLOR_LABEL[currentTarget as ColorId]
                : currentTarget.charAt(0).toUpperCase() + currentTarget.slice(1)}
            </div>
          </div>
          <div
            ref={containerRef}
            className="relative h-[520px] w-full overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-b from-zinc-50 to-white"
            onClick={handleContainerClick}
            style={{ cursor: "pointer" }}
          >
            {/* Camada visual das zonas */}
            <div className="absolute inset-0 pointer-events-none z-0 flex flex-col h-full w-full">
              <div className={
                `h-1/3 w-full transition-colors border-b border-emerald-200 ` +
                (activeZone === "top" ? "bg-emerald-100/60" : "bg-transparent")
              } />
              <div className={
                `h-1/3 w-full transition-colors border-b border-emerald-200 ` +
                (activeZone === "center" ? "bg-emerald-100/60" : "bg-transparent")
              } />
              <div className={
                `h-1/3 w-full transition-colors ` +
                (activeZone === "bottom" ? "bg-emerald-100/60" : "bg-transparent")
              } />
            </div>
            {/* Estímulos renderizados normalmente */}
            {shapes.map((shape) => {
              const imgSrc = `/images/visual-search/${SHAPE_IMG[shape.kind]}_${COLOR_LABEL[shape.colorId].toLowerCase()}.png`;
              return (
                <img
                  key={shape.id}
                  src={imgSrc}
                  alt={`${COLOR_LABEL[shape.colorId]} ${shape.kind}`}
                  style={{
                    position: "absolute",
                    left: shape.x - shape.size,
                    top: shape.y - shape.size,
                    width: shape.size * 2,
                    height: shape.size * 2,
                    opacity: shape.isCaptured ? 0.2 : 1,
                    pointerEvents: "none",
                    userSelect: "none",
                    zIndex: 10,
                  }}
                  draggable={false}
                />
              );
            })}
          </div>
          {/* Feedback textual removido conforme solicitado */}
        </div>
      )}

      {phase === "level-summary" && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-6">
          <h3 className="text-xl font-semibold text-zinc-900">Resumo do nível</h3>
          <div className="space-y-2 text-zinc-700">
            <p>Você clicou no alvo na área destacada em <strong>{hits > 0 ? Math.round((centralHits / hits) * 100) : 0}%</strong> das vezes.</p>
            <p>Você deixou de clicar quando o alvo estava na área destacada em <strong>{hits > 0 ? Math.round((omissions / hits) * 100) : 0}%</strong> das vezes.</p>
            <p>Você clicou fora da área destacada ou sem alvo em <strong>{spatialErrors + falseAlarms}</strong> ocasiões.</p>

          </div>
          <button
            type="button"
            onClick={continueAfterLevel}
            className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-base font-medium text-white hover:bg-zinc-700"
          >
            {canAdvance ? "Próximo nível" : "Ver resumo final"}
          </button>
        </div>
      )}

      {phase === "session-summary" && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-6">
          <h3 className="text-xl font-semibold text-zinc-900">Sessão concluída</h3>
          <div className="space-y-2 text-zinc-700">
            <p>Você clicou no alvo na área destacada em <strong>{hits > 0 ? Math.round((centralHits / hits) * 100) : 0}%</strong> das vezes.</p>
            <p>Você deixou de clicar quando o alvo estava na área destacada em <strong>{hits > 0 ? Math.round((omissions / hits) * 100) : 0}%</strong> das vezes.</p>
            <p>Você clicou fora da área destacada ou sem alvo em <strong>{spatialErrors + falseAlarms}</strong> ocasiões.</p>
            {/* Tempo de resposta removido conforme solicitado */}
            <p>Total de tentativas: <strong>{attemptLogs.length}</strong></p>
          </div>
          <button
            type="button"
            onClick={finishSession}
            className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-base font-medium text-white hover:bg-emerald-700"
          >
            Concluir exercício
          </button>
        </div>
      )}
    </div>
  );
}
