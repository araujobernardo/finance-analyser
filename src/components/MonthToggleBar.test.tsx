import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MonthToggleBar } from "./MonthToggleBar";

describe("MonthToggleBar", () => {
  it("renders nothing when months array is empty", () => {
    const { container } = render(
      <MonthToggleBar
        months={[]}
        selectedMonth={null}
        onMonthSelect={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders a button for each month", () => {
    render(
      <MonthToggleBar
        months={["2025-01", "2025-02", "2025-03"]}
        selectedMonth="2025-01"
        onMonthSelect={vi.fn()}
      />,
    );
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("formats month keys as human-readable labels", () => {
    render(
      <MonthToggleBar
        months={["2025-03"]}
        selectedMonth="2025-03"
        onMonthSelect={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Mar 2025" }),
    ).toBeInTheDocument();
  });

  it("marks the selected month button as active", () => {
    render(
      <MonthToggleBar
        months={["2025-01", "2025-02"]}
        selectedMonth="2025-02"
        onMonthSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("Feb 2025").closest("button")).toHaveClass(
      "month-toggle-btn--active",
    );
    expect(screen.getByText("Jan 2025").closest("button")).not.toHaveClass(
      "month-toggle-btn--active",
    );
  });

  it("sets aria-pressed on the active button only", () => {
    render(
      <MonthToggleBar
        months={["2025-01", "2025-02"]}
        selectedMonth="2025-01"
        onMonthSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("Jan 2025").closest("button")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("Feb 2025").closest("button")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("calls onMonthSelect with the clicked month key", async () => {
    const onMonthSelect = vi.fn();
    render(
      <MonthToggleBar
        months={["2025-01", "2025-02"]}
        selectedMonth="2025-01"
        onMonthSelect={onMonthSelect}
      />,
    );
    await userEvent.click(screen.getByText("Feb 2025"));
    expect(onMonthSelect).toHaveBeenCalledOnce();
    expect(onMonthSelect).toHaveBeenCalledWith("2025-02");
  });

  it("renders a single month without error", () => {
    render(
      <MonthToggleBar
        months={["2024-12"]}
        selectedMonth="2024-12"
        onMonthSelect={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Dec 2024" }),
    ).toBeInTheDocument();
  });
});
