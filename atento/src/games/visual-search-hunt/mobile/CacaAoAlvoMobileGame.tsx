import React from "react";

type Props = {
  onCorrectSound?: () => void;
  onErrorSound?: () => void;
  onEnd: (result: { success: boolean; pointsEarned: number }) => void;
  basePoints: number;
  startingLevel: number;
  maxLevelHint: number;
};

export function CacaAoAlvoMobileGame({
  onCorrectSound,
  onErrorSound,
  onEnd,
  basePoints,
  startingLevel,
  maxLevelHint,
}: Props) {
  // TODO: Implementar lógica e UI mobile adaptada
  // - Grade responsiva: célula min 72px, colunas dinâmicas
  // - Remover número da fase e indicação do alvo
  // - Área de jogo ocupa 100vw, overflow: hidden
  // - Chamar onCorrectSound/onErrorSound nos eventos
  // - Chamar onEnd ao finalizar
  // - Não mostrar margens laterais
  return (
    <div style={{ width: "100vw", overflow: "hidden", margin: 0, padding: 0 }}>
      {/* Implementação da grade e lógica mobile aqui */}
      <div style={{ minHeight: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#888" }}>
          [Caça às Figuras — versão mobile em desenvolvimento]
        </span>
      </div>
    </div>
  );
}
