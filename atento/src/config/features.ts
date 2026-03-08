const isFeatureEnabled = (value: string | undefined): boolean => {
  if (value === "false") return false;
  if (value === "true") return true;
  return true;
};

export const ENABLE_GONOGO_EXPANDIDO = isFeatureEnabled(
  process.env.NEXT_PUBLIC_ENABLE_GONOGO_EXPANDIDO,
);

export const ENABLE_COLOR_FILTER_WITH_SOUND = isFeatureEnabled(
  process.env.NEXT_PUBLIC_ENABLE_COLOR_FILTER_WITH_SOUND,
);

export const ENABLE_COUNTING_FLOW_TASK = isFeatureEnabled(
  process.env.NEXT_PUBLIC_ENABLE_COUNTING_FLOW_TASK,
);

export const ENABLE_LONG_MAZES = isFeatureEnabled(
  process.env.NEXT_PUBLIC_ENABLE_LONG_MAZES,
);

export const ENABLE_SYMBOL_MAP = isFeatureEnabled(
  process.env.NEXT_PUBLIC_ENABLE_SYMBOL_MAP,
);

export const ENABLE_MATRIX_SYMBOL_SEARCH = isFeatureEnabled(
  process.env.NEXT_PUBLIC_ENABLE_MATRIX_SYMBOL_SEARCH,
);

export const ENABLE_FIND_MISSING_ITEM = isFeatureEnabled(
  process.env.NEXT_PUBLIC_ENABLE_FIND_MISSING_ITEM,
);

export const ENABLE_COPY_MATRICES = isFeatureEnabled(
  process.env.NEXT_PUBLIC_ENABLE_COPY_MATRICES,
);

export const ENABLE_LONG_WORD_SEARCH = isFeatureEnabled(
  process.env.NEXT_PUBLIC_ENABLE_LONG_WORD_SEARCH,
);

export const ENABLE_RADAR_TONE = isFeatureEnabled(
  process.env.NEXT_PUBLIC_ENABLE_RADAR_TONE,
);

export const ENABLE_DRIVE_SIGNS = isFeatureEnabled(
  process.env.NEXT_PUBLIC_ENABLE_DRIVE_SIGNS,
);

export const ENABLE_DRIVE_WORD_TARGET = isFeatureEnabled(
  process.env.NEXT_PUBLIC_ENABLE_DRIVE_WORD_TARGET,
);

export const ENABLE_CHAT_ERROR_VIGILANCE = isFeatureEnabled(
  process.env.NEXT_PUBLIC_ENABLE_CHAT_ERROR_VIGILANCE,
);

export const ENABLE_SYMBOL_MAP_SOUND_MONITOR = isFeatureEnabled(
  process.env.NEXT_PUBLIC_ENABLE_SYMBOL_MAP_SOUND_MONITOR,
);

export const ENABLE_RAPID_CLASSIFICATION_MEMORY = isFeatureEnabled(
  process.env.NEXT_PUBLIC_ENABLE_RAPID_CLASSIFICATION_MEMORY,
);

export const ENABLE_COLOR_SHAPE_SWITCH = isFeatureEnabled(
  process.env.NEXT_PUBLIC_ENABLE_COLOR_SHAPE_SWITCH,
);

export const ENABLE_POSITION_RULE_SWITCH = isFeatureEnabled(
  process.env.NEXT_PUBLIC_ENABLE_POSITION_RULE_SWITCH,
);

export const ENABLE_REVERSAL_GO_NOGO_SWITCH = isFeatureEnabled(
  process.env.NEXT_PUBLIC_ENABLE_REVERSAL_GO_NOGO_SWITCH,
);

export const ENABLE_TRILHA_ALTERNADA_TMTB = isFeatureEnabled(
  process.env.NEXT_PUBLIC_ENABLE_TRILHA_ALTERNADA_TMTB,
);
