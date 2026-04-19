import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ChatPanel } from "./ChatPanel";

// Mock the claudeChat service so tests don't hit the real API
vi.mock("../services/claudeChat", () => ({
  streamChatResponse: vi.fn(),
  buildFinanceContext: vi.fn(() => "No data yet."),
}));

// Mock chatStorage to control persistence behaviour
vi.mock("../services/chatStorage", () => ({
  loadChatHistory: vi.fn(() => []),
  saveChatHistory: vi.fn(),
  clearChatHistory: vi.fn(),
}));

import { streamChatResponse } from "../services/claudeChat";
import * as chatStorage from "../services/chatStorage";

const mockStream = streamChatResponse as ReturnType<typeof vi.fn>;
const mockLoad = vi.mocked(chatStorage.loadChatHistory);
const mockSave = vi.mocked(chatStorage.saveChatHistory);

beforeEach(() => {
  vi.clearAllMocks();
  mockLoad.mockReturnValue([]);
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

  // Persistence tests (T004)
  it("loads history on mount and displays persisted messages", () => {
    mockLoad.mockReturnValue([
      {
        role: "user",
        content: "Previous question",
        timestamp: "2026-01-01T00:00:00Z",
      },
      {
        role: "assistant",
        content: "Previous answer",
        timestamp: "2026-01-01T00:00:01Z",
      },
    ]);

    render(<ChatPanel />);
    fireEvent.click(screen.getByRole("button", { name: /open chat/i }));

    expect(screen.getByText("Previous question")).toBeInTheDocument();
    expect(screen.getByText("Previous answer")).toBeInTheDocument();
  });

  it("does not show empty state when history exists", () => {
    mockLoad.mockReturnValue([
      {
        role: "user",
        content: "Hello",
        timestamp: "2026-01-01T00:00:00Z",
      },
    ]);

    render(<ChatPanel />);
    fireEvent.click(screen.getByRole("button", { name: /open chat/i }));

    expect(screen.queryByText(/ask me anything/i)).not.toBeInTheDocument();
  });

  it("persists user message after send", async () => {
    render(<ChatPanel />);
    fireEvent.click(screen.getByRole("button", { name: /open chat/i }));

    const input = screen.getByRole("textbox", { name: /message input/i });
    fireEvent.change(input, { target: { value: "Save this message" } });
    await act(async () => {
      fireEvent.submit(input.closest("form")!);
    });

    expect(mockSave).toHaveBeenCalledWith(
      "global",
      expect.arrayContaining([
        expect.objectContaining({
          role: "user",
          content: "Save this message",
        }),
      ]),
    );
  });

  it("does not persist error messages", async () => {
    mockStream.mockImplementation(
      (
        _history: unknown,
        _onChunk: unknown,
        _onDone: unknown,
        onError: (e: Error) => void,
      ) => {
        onError(new Error("Network error"));
      },
    );

    render(<ChatPanel />);
    fireEvent.click(screen.getByRole("button", { name: /open chat/i }));

    const input = screen.getByRole("textbox", { name: /message input/i });
    fireEvent.change(input, { target: { value: "Hello" } });
    await act(async () => {
      fireEvent.submit(input.closest("form")!);
    });

    // save is called once for the user message, but NOT for the error
    const saveCalls = mockSave.mock.calls;
    const errorSave = saveCalls.find((call) =>
      (call[1] as { content: string }[]).some((m) =>
        m.content?.includes("Network error"),
      ),
    );
    expect(errorSave).toBeUndefined();
  });
});
