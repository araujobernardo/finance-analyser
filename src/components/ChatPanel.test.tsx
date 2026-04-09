import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatPanel } from "./ChatPanel";

describe("ChatPanel", () => {
  it("renders the floating action button", () => {
    render(<ChatPanel />);
    expect(
      screen.getByRole("button", { name: /open chat/i }),
    ).toBeInTheDocument();
  });

  it("panel is not visible initially", () => {
    render(<ChatPanel />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the panel when the FAB is clicked", () => {
    render(<ChatPanel />);
    fireEvent.click(screen.getByRole("button", { name: /open chat/i }));
    expect(
      screen.getByRole("dialog", { name: /chat panel/i }),
    ).toBeInTheDocument();
  });

  it("closes the panel when the close button inside the panel is clicked", () => {
    const { container } = render(<ChatPanel />);
    fireEvent.click(screen.getByRole("button", { name: /open chat/i }));
    const closeBtn = container.querySelector(
      ".chat-panel__close",
    ) as HTMLElement;
    fireEvent.click(closeBtn);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows an empty-state message when there are no messages", () => {
    render(<ChatPanel />);
    fireEvent.click(screen.getByRole("button", { name: /open chat/i }));
    expect(screen.getByText(/ask me anything/i)).toBeInTheDocument();
  });

  it("adds a user bubble and a bot placeholder on submit", () => {
    render(<ChatPanel />);
    fireEvent.click(screen.getByRole("button", { name: /open chat/i }));

    const input = screen.getByRole("textbox", { name: /message input/i });
    fireEvent.change(input, { target: { value: "What is my top expense?" } });
    fireEvent.submit(input.closest("form")!);

    expect(screen.getByText("What is my top expense?")).toBeInTheDocument();
    expect(screen.getByText("…")).toBeInTheDocument();
  });

  it("clears the input after submit", () => {
    render(<ChatPanel />);
    fireEvent.click(screen.getByRole("button", { name: /open chat/i }));

    const input = screen.getByRole("textbox", {
      name: /message input/i,
    }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Hello" } });
    fireEvent.submit(input.closest("form")!);

    expect(input.value).toBe("");
  });

  it("does not submit when the input is blank", () => {
    render(<ChatPanel />);
    fireEvent.click(screen.getByRole("button", { name: /open chat/i }));

    fireEvent.submit(
      screen.getByRole("textbox", { name: /message input/i }).closest("form")!,
    );

    expect(screen.queryByText("…")).not.toBeInTheDocument();
  });
});
