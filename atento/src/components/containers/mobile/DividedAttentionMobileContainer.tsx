"use client";

import type { AttentionContainerProps } from "../types";
import { MapaSimbolosMonitorSomMobileGame } from "@/games/mapa-simbolos-monitor-som/mobile/MapaSimbolosMonitorSomMobileGame";
import { RadarTonoMobileGame } from "@/games/radar-tono/mobile/RadarTonoMobileGame";
import type { AttentionExercise } from "@/types/game";

export type DividedAttentionMobileContainerProps = AttentionContainerProps & {
  exercise?: AttentionExercise;
  variant?: "default";
};

export function DividedAttentionMobileContainer(
  props: DividedAttentionMobileContainerProps
): JSX.Element | null {
  const { exercise, reportContext, onComplete } = props;
  if (!exercise) return null;

  switch (exercise.kind) {
    case "radar-tone":
      return (
        <RadarTonoMobileGame
          basePoints={exercise.points}
          startingLevel={"startingLevel" in exercise ? exercise.startingLevel : 1}
          maxLevelHint={"maxLevelHint" in exercise ? exercise.maxLevelHint : 1}
          reportContext={reportContext}
          onComplete={onComplete}
        />
      );
    case "symbol-map-sound-monitor":
      return (
        <MapaSimbolosMonitorSomMobileGame
          basePoints={exercise.points}
          startingLevel={"startingLevel" in exercise ? exercise.startingLevel : 1}
          maxLevelHint={"maxLevelHint" in exercise ? exercise.maxLevelHint : 1}
          reportContext={reportContext}
          onComplete={onComplete}
        />
      );
    // Adicione outros casos conforme necessário
    default:
      return null;
  }
}
