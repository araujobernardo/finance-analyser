import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CategoryBadge } from "./CategoryBadge";

function renderBadge(category = "Groceries", onChange = vi.fn()) {
  return render(
    <CategoryBadge category={category} onCategoryChange={onChange} />,
  );
}

describe("CategoryBadge", () => {
  it("displays the current category", () => {
    renderBadge("Transport");
    expect(screen.getByRole("button")).toHaveTextContent("Transport");
  });

  it("shows 'Uncategorised' when category is empty string", () => {
    renderBadge("");
    expect(screen.getByRole("button")).toHaveTextContent("Uncategorised");
  });

  it("opens the dropdown when clicked", () => {
    renderBadge();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("lists all available categories in the dropdown", () => {
    renderBadge();
    fireEvent.click(screen.getByRole("button"));
    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThanOrEqual(11);
    expect(options.some((o) => o.textContent === "Groceries")).toBe(true);
    expect(options.some((o) => o.textContent === "Transport")).toBe(true);
  });

  it("calls onCategoryChange with the selected category", () => {
    const onChange = vi.fn();
    renderBadge("Groceries", onChange);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.mouseDown(screen.getByRole("option", { name: "Dining" }));
    expect(onChange).toHaveBeenCalledWith("Dining");
  });

  it("does not call onCategoryChange when selecting the same category", () => {
    const onChange = vi.fn();
    renderBadge("Groceries", onChange);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.mouseDown(screen.getByRole("option", { name: "Groceries" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("closes the dropdown after a selection", () => {
    renderBadge();
    fireEvent.click(screen.getByRole("button"));
    fireEvent.mouseDown(screen.getByRole("option", { name: "Dining" }));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes the dropdown on Escape key", () => {
    renderBadge();
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("marks the current category as selected in the dropdown", () => {
    renderBadge("Transport");
    fireEvent.click(screen.getByRole("button"));
    const selectedOption = screen.getByRole("option", { name: "Transport" });
    expect(selectedOption).toHaveAttribute("aria-selected", "true");
  });
});
