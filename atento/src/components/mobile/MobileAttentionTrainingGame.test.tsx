import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MobileAttentionTrainingGame } from "./MobileAttentionTrainingGame";

describe("MobileAttentionTrainingGame", () => {
  it("deve renderizar sem erros", () => {
    render(<MobileAttentionTrainingGame />);
    // Verifica se a mensagem de indisponibilidade aparece na tela
    expect(
      screen.getByText(
        /este exercício não está disponível na versão mobile/i
      )
    ).toBeInTheDocument();
  });
});
