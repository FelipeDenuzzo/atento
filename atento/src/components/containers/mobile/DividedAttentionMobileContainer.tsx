"use client";

import type { AttentionContainerProps } from "../types";
import { MapaSimbolosMonitorSomMobileGame } from "@/games/mapa-simbolos-monitor-som/mobile/MapaSimbolosMonitorSomMobileGame";

export type DividedAttentionMobileContainerProps = AttentionContainerProps & {
  variant?: "default";
};

export function DividedAttentionMobileContainer(
  props: DividedAttentionMobileContainerProps
): JSX.Element {
  return (
    <MapaSimbolosMonitorSomMobileGame
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
