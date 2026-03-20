"use client";

import type { AttentionContainerProps } from "../types";
import { TrilhaAlternadaTmtbMobileGame } from "@/games/trilha-alternada-tmtb/mobile/TrilhaAlternadaTmtbMobileGame";

export type AlternatingAttentionMobileContainerProps =
  AttentionContainerProps & {
    variant?: "tmtb";
  };

export function AlternatingAttentionMobileContainer(
  props: AlternatingAttentionMobileContainerProps
): JSX.Element {
  return (
    <TrilhaAlternadaTmtbMobileGame
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
