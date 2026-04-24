import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App shell", () => {
  it("renders the sidebar", () => {
    render(<App />);
    expect(screen.getByText("Analyser")).toBeInTheDocument();
  });

  it("renders the Dashboard empty state by default", () => {
    render(<App />);
    expect(screen.getByText("No data yet")).toBeInTheDocument();
  });
});
