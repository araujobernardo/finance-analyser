import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ChatPanel } from "./ChatPanel";

// Mock the claudeChat service so tests don't hit the real API
vi.mock("../services/claudeChat", () => ({
  streamChatResponse: vi.fn(),
  buildFinanceContext: vi.fn(() => "No data yet."),
}));

import { streamChatResponse } from "../services/claudeChat";
const mockStream = streamChatResponse as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  // Default: immediately call onDone with no chunks
  mockStream.mockImplementation(
    (_history: unknown, _onChunk: unknown, onDone: () => void) => {
      onDone();
    },
  );
});

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

  it("adds a user bubble immediately on submit", async () => {
    render(<ChatPanel />);
    fireEvent.click(screen.getByRole("button", { name: /open chat/i }));

    const input = screen.getByRole("textbox", { name: /message input/i });
    fireEvent.change(input, { target: { value: "What is my top expense?" } });
    await act(async () => {
      fireEvent.submit(input.closest("form")!);
    });

    expect(screen.getByText("What is my top expense?")).toBeInTheDocument();
  });

  it("clears the input after submit", async () => {
    render(<ChatPanel />);
    fireEvent.click(screen.getByRole("button", { name: /open chat/i }));

    const input = screen.getByRole("textbox", {
      name: /message input/i,
    }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Hello" } });
    await act(async () => {
      fireEvent.submit(input.closest("form")!);
    });

    expect(input.value).toBe("");
  });

  it("does not submit when the input is blank", async () => {
    render(<ChatPanel />);
    fireEvent.click(screen.getByRole("button", { name: /open chat/i }));

    await act(async () => {
      fireEvent.submit(
        screen
          .getByRole("textbox", { name: /message input/i })
          .closest("form")!,
      );
    });

    expect(mockStream).not.toHaveBeenCalled();
  });

  it("renders streamed chunks into the bot bubble", async () => {
    mockStream.mockImplementation(
      (_history: unknown, onChunk: (d: string) => void, onDone: () => void) => {
        onChunk("Hello ");
        onChunk("there!");
        onDone();
      },
    );

    render(<ChatPanel />);
    fireEvent.click(screen.getByRole("button", { name: /open chat/i }));

    const input = screen.getByRole("textbox", { name: /message input/i });
    fireEvent.change(input, { target: { value: "Hi" } });
    await act(async () => {
      fireEvent.submit(input.closest("form")!);
    });

    expect(screen.getByText("Hello there!")).toBeInTheDocument();
  });

  it("shows an error message when the API call fails", async () => {
    mockStream.mockImplementation(
      (
        _history: unknown,
        _onChunk: unknown,
        _onDone: unknown,
        onError: (e: Error) => void,
      ) => {
        onError(new Error("API key missing"));
      },
    );

    render(<ChatPanel />);
    fireEvent.click(screen.getByRole("button", { name: /open chat/i }));

    const input = screen.getByRole("textbox", { name: /message input/i });
    fireEvent.change(input, { target: { value: "Hello" } });
    await act(async () => {
      fireEvent.submit(input.closest("form")!);
    });

    expect(screen.getByText(/Error: API key missing/)).toBeInTheDocument();
  });
});
