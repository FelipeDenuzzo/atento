import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import React from "react";
import { VisualSearchHunt } from "./VisualSearchHunt";

describe("VisualSearchHunt", () => {
  it("deve renderizar sem erros", () => {
    render(<VisualSearchHunt />);
    expect(screen.getByRole('button', { name: /começar fase/i })).toBeInTheDocument();
  });
});
