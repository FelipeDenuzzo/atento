"use client";

import type { AttentionContainerProps } from "./types";
import { TrilhaAlternadaTmtbGame } from "@/games/trilha-alternada-tmtb/TrilhaAlternadaTmtbGame";

export type AlternatingAttentionContainerProps = AttentionContainerProps & {
  variant?: "tmtb";
};

export function AlternatingAttentionContainer(
  props: AlternatingAttentionContainerProps
): JSX.Element {
  return (
    <TrilhaAlternadaTmtbGame
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
