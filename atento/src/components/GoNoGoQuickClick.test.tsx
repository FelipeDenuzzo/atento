import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { GoNoGoQuickClick } from "./GoNoGoQuickClick";

describe("GoNoGoQuickClick", () => {
  it("deve renderizar sem erros", () => {
    render(<GoNoGoQuickClick />);
    expect(screen.getByText(/clique rápido/i)).toBeInTheDocument();
  });
});
