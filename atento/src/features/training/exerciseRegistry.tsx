import { ReactNode } from "react";
import { FlankerSetas } from "@/components/FlankerSetas";
import { StroopInvertido } from "@/components/StroopInvertido";
import { GoNoGoQuickClick } from "@/components/GoNoGoQuickClick";
import { VisualSearchHunt } from "@/components/VisualSearchHunt";
import { SelectiveAttentionContainer } from "@/components/containers/SelectiveAttentionContainer";
import { SustainedAttentionContainer } from "@/components/containers/SustainedAttentionContainer";
import { AlternatingAttentionContainer } from "@/components/containers/AlternatingAttentionContainer";
import { DividedAttentionContainer } from "@/components/containers/DividedAttentionContainer";

// Registry: kind -> componente React
export const exerciseRegistry: Record<string, (props: any) => ReactNode> = {
  "flanker": FlankerSetas,
  "stroop": StroopInvertido,
  "go-no-go-expandido": GoNoGoQuickClick,
  "visual-search": VisualSearchHunt,
  // Containers para tipos de atenção (exemplo)
  "seletiva": SelectiveAttentionContainer,
  "sustentada": SustainedAttentionContainer,
  "alternada": AlternatingAttentionContainer,
  "dividida": DividedAttentionContainer,
  // Adicione outros mapeamentos conforme necessário
};

// Função utilitária para obter componente pelo kind
export function getExerciseComponent(kind: string) {
  return exerciseRegistry[kind];
}
