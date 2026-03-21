import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StroopInvertido } from "./StroopInvertido";

describe("StroopInvertido", () => {
  it("deve renderizar sem erros", () => {
    render(<StroopInvertido />);
    expect(screen.getByText(/stroop invertido/i)).toBeInTheDocument();
  });
});
