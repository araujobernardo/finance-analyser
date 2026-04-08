import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CategoryRulesList } from "./CategoryRulesList";
import * as categoryRules from "../services/categoryRules";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("CategoryRulesList", () => {
  it("shows empty state when no rules exist", () => {
    render(<CategoryRulesList rules={{}} onRulesChange={vi.fn()} />);
    expect(screen.getByText(/no rules yet/i)).toBeInTheDocument();
  });

  it("renders a row for each rule", () => {
    const rules = {
      "countdown supermarket": "Groceries",
      "uber eats": "Dining",
    };
    render(<CategoryRulesList rules={rules} onRulesChange={vi.fn()} />);
    expect(screen.getByText("countdown supermarket")).toBeInTheDocument();
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("uber eats")).toBeInTheDocument();
    expect(screen.getByText("Dining")).toBeInTheDocument();
  });

  it("calls deleteRule and onRulesChange when delete button is clicked", () => {
    const deleteSpy = vi
      .spyOn(categoryRules, "deleteRule")
      .mockImplementation(() => {});
    const onChange = vi.fn();
    const rules = { countdown: "Groceries" };

    render(<CategoryRulesList rules={rules} onRulesChange={onChange} />);
    fireEvent.click(
      screen.getByRole("button", { name: /delete rule for countdown/i }),
    );

    expect(deleteSpy).toHaveBeenCalledWith("countdown");
    expect(onChange).toHaveBeenCalledWith({});
  });

  it("does not affect other rules when one is deleted", () => {
    vi.spyOn(categoryRules, "deleteRule").mockImplementation(() => {});
    const onChange = vi.fn();
    const rules = { countdown: "Groceries", uber: "Transport" };

    render(<CategoryRulesList rules={rules} onRulesChange={onChange} />);
    fireEvent.click(
      screen.getByRole("button", { name: /delete rule for countdown/i }),
    );

    expect(onChange).toHaveBeenCalledWith({ uber: "Transport" });
  });

  it("renders the section title", () => {
    render(<CategoryRulesList rules={{}} onRulesChange={vi.fn()} />);
    expect(screen.getByText("Category rules")).toBeInTheDocument();
  });
});
