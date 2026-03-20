"use client";

import type { AttentionContainerProps } from "./types";
import { MapaSimbolosMonitorSomGame } from "@/games/mapa-simbolos-monitor-som/MapaSimbolosMonitorSomGame";

export type DividedAttentionContainerProps = AttentionContainerProps & {
  variant?: "default";
};

export function DividedAttentionContainer(
  props: DividedAttentionContainerProps
): JSX.Element {
  return (
    <MapaSimbolosMonitorSomGame
      basePoints={100}
      startingLevel={1}
      maxLevelHint={3}
      reportContext={props.reportContext}
      onComplete={(result) => {
        props.onComplete({
          success: result.success ?? true,
          pointsEarned: result.pointsEarned ?? 0,
        });
      }}
    />
  );
}
