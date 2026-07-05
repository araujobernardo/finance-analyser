// QA tests for #947 — Past Summaries section on ChatPage
// Tests: loading skeletons, error state, empty state, summaries list,
// default-expanded behaviour, toggle section, toggle per-entry,
// helper functions (formatSummaryDate / buildPreview via DOM output).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ChatPage } from "./ChatPage";
import type { ApiTransaction, ApiFinancialSummary } from "../types/api";

// ── Mock @anthropic-ai/sdk ───────────────────────────────────────────────────

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "mocked response" }],
      }),
    },
  })),
}));

// ── Mock AccountContext ──────────────────────────────────────────────────────

const mockAccounts = [{ id: "acc-1", nickname: "Main", colour: "#6C8EBF" }];
let mockRawTransactions: ApiTransaction[] = [];

vi.mock("../context/AccountContext", () => ({
  useAccount: () => ({
    accounts: mockAccounts,
    isLoading: false,
    error: null,
    activeAccountId: "acc-1",
    refetch: vi.fn(),
    setActiveAccountId: vi.fn(),
    addAccount: vi.fn(),
    removeAccount: vi.fn(),
    updateAccount: vi.fn(),
  }),
  useAllTransactions: () => mockRawTransactions,
  ALL_ACCOUNTS_ID: "all",
}));

// ── Mock useApi ──────────────────────────────────────────────────────────────

const mockApiFetch = vi.fn();

vi.mock("../lib/api", () => ({
  useApi: () => ({ apiFetch: mockApiFetch }),
  API_BASE: "",
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeTxn(overrides: Partial<ApiTransaction> = {}): ApiTransaction {
  return {
    id: "txn-1",
    userId: "user-1",
    accountId: "acc-1",
    date: "2026-03-15",
    amount: -100,
    description: "Supermarket",
    category: "Groceries",
    isTransfer: false,
    isManualTransfer: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeSummary(
  overrides: Partial<ApiFinancialSummary> = {},
): ApiFinancialSummary {
  return {
    id: "sum-1",
    generatedAt: "2026-07-04T10:00:00.000Z",
    content: "Your finances look healthy this month.",
    previousSummaryId: null,
    ...overrides,
  };
}

function makeOkResponse(data: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data),
  } as unknown as Response);
}

function makeErrorResponse(status = 500) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ error: "Server error" }),
  } as unknown as Response);
}

function renderChatPage() {
  return render(
    <MemoryRouter>
      <ChatPage />
    </MemoryRouter>,
  );
}

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Default: non-empty transactions so the summaries section renders
  mockRawTransactions = [makeTxn()];
});

// ── Loading state ─────────────────────────────────────────────────────────────

describe("ChatPage Past Summaries — loading state", () => {
  it("renders two skeleton rows while the fetch is in-flight", () => {
    // apiFetch never resolves during this test
    mockApiFetch.mockReturnValue(new Promise(() => {}));
    const { container } = renderChatPage();
    expect(screen.getByTestId("summaries-skeletons")).toBeInTheDocument();
    const skeletons = container.querySelectorAll(".summaries-skeleton");
    expect(skeletons).toHaveLength(2);
  });

  it("shows '...' in the count label while loading", () => {
    mockApiFetch.mockReturnValue(new Promise(() => {}));
    renderChatPage();
    expect(screen.getByText("...")).toBeInTheDocument();
  });

  it("section header toggle button is disabled while loading", () => {
    mockApiFetch.mockReturnValue(new Promise(() => {}));
    renderChatPage();
    const btn = screen.getByTestId("summaries-section-header");
    expect(btn).toBeDisabled();
  });
});

// ── Error state ───────────────────────────────────────────────────────────────

describe("ChatPage Past Summaries — error state", () => {
  it("shows the error message when the fetch fails", async () => {
    mockApiFetch.mockReturnValue(makeErrorResponse(500));
    renderChatPage();
    await waitFor(() =>
      expect(screen.getByTestId("summaries-error")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("summaries-error")).toHaveTextContent(
      "Could not load summaries.",
    );
  });

  it("does not show skeletons after a failed fetch", async () => {
    mockApiFetch.mockReturnValue(makeErrorResponse(500));
    renderChatPage();
    await waitFor(() =>
      expect(
        screen.queryByTestId("summaries-skeletons"),
      ).not.toBeInTheDocument(),
    );
  });
});

// ── Empty state ───────────────────────────────────────────────────────────────

describe("ChatPage Past Summaries — empty state", () => {
  it("shows empty state message when API returns []", async () => {
    mockApiFetch.mockReturnValue(makeOkResponse([]));
    renderChatPage();
    await waitFor(() =>
      expect(screen.getByTestId("summaries-empty")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("summaries-empty")).toHaveTextContent(
      "No summaries yet. Come back after your first login.",
    );
  });

  it("shows '0 reports' count label for empty list", async () => {
    mockApiFetch.mockReturnValue(makeOkResponse([]));
    renderChatPage();
    await waitFor(() =>
      expect(screen.getByText("0 reports")).toBeInTheDocument(),
    );
  });
});

// ── With summaries ────────────────────────────────────────────────────────────

describe("ChatPage Past Summaries — with summaries", () => {
  const three = [
    makeSummary({
      id: "s1",
      generatedAt: "2026-07-04T10:00:00.000Z",
      content: "Summary one.",
    }),
    makeSummary({
      id: "s2",
      generatedAt: "2026-06-04T10:00:00.000Z",
      content: "Summary two.",
    }),
    makeSummary({
      id: "s3",
      generatedAt: "2026-05-04T10:00:00.000Z",
      content: "Summary three.",
    }),
  ];

  it("renders an entry for each summary", async () => {
    mockApiFetch.mockReturnValue(makeOkResponse(three));
    renderChatPage();
    await waitFor(() =>
      expect(screen.getAllByTestId("summaries-entry")).toHaveLength(3),
    );
  });

  it("first two entries are expanded by default (aria-expanded=true)", async () => {
    mockApiFetch.mockReturnValue(makeOkResponse(three));
    renderChatPage();
    await waitFor(() =>
      expect(screen.getAllByTestId("summaries-entry")).toHaveLength(3),
    );
    const toggles = screen.getAllByRole("button", { name: /(Jul|Jun|May)/i });
    expect(toggles[0]).toHaveAttribute("aria-expanded", "true");
    expect(toggles[1]).toHaveAttribute("aria-expanded", "true");
  });

  it("third entry is collapsed by default (aria-expanded=false)", async () => {
    mockApiFetch.mockReturnValue(makeOkResponse(three));
    renderChatPage();
    await waitFor(() =>
      expect(screen.getAllByTestId("summaries-entry")).toHaveLength(3),
    );
    const toggle3 = screen.getByTestId("summaries-entry-toggle-s3");
    expect(toggle3).toHaveAttribute("aria-expanded", "false");
  });

  it("shows '3 reports' in the count label", async () => {
    mockApiFetch.mockReturnValue(makeOkResponse(three));
    renderChatPage();
    await waitFor(() =>
      expect(screen.getByText("3 reports")).toBeInTheDocument(),
    );
  });

  it("shows '1 report' (singular) for a single summary", async () => {
    mockApiFetch.mockReturnValue(makeOkResponse([makeSummary()]));
    renderChatPage();
    await waitFor(() =>
      expect(screen.getByText("1 report")).toBeInTheDocument(),
    );
  });

  it("entry content is visible for expanded entries", async () => {
    mockApiFetch.mockReturnValue(
      makeOkResponse([
        makeSummary({
          id: "s1",
          content: "Your finances look healthy this month.",
        }),
      ]),
    );
    const { container } = renderChatPage();
    await waitFor(() =>
      expect(
        container.querySelector(".summaries-entry-content"),
      ).toBeInTheDocument(),
    );
    const contentEl = container.querySelector(".summaries-entry-content");
    expect(contentEl).toHaveTextContent(
      "Your finances look healthy this month.",
    );
  });

  it("full content is rendered (not truncated) inside the entry body", async () => {
    const long = "A".repeat(200);
    mockApiFetch.mockReturnValue(
      makeOkResponse([makeSummary({ id: "s1", content: long })]),
    );
    renderChatPage();
    await waitFor(() => expect(screen.getByText(long)).toBeInTheDocument());
  });
});

// ── Toggle section ────────────────────────────────────────────────────────────

describe("ChatPage Past Summaries — toggle section header", () => {
  it("section body starts open (no .closed class)", async () => {
    mockApiFetch.mockReturnValue(makeOkResponse([]));
    const { container } = renderChatPage();
    await waitFor(() =>
      expect(screen.getByTestId("summaries-empty")).toBeInTheDocument(),
    );
    expect(container.querySelector(".summaries-body")).not.toHaveClass(
      "closed",
    );
  });

  it("clicking the section header collapses the body (adds .closed class)", async () => {
    mockApiFetch.mockReturnValue(makeOkResponse([]));
    const { container } = renderChatPage();
    await waitFor(() =>
      expect(screen.getByTestId("summaries-empty")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId("summaries-section-header"));
    expect(container.querySelector(".summaries-body")).toHaveClass("closed");
  });

  it("clicking the section header twice returns to open state", async () => {
    mockApiFetch.mockReturnValue(makeOkResponse([]));
    const { container } = renderChatPage();
    await waitFor(() =>
      expect(screen.getByTestId("summaries-empty")).toBeInTheDocument(),
    );
    const btn = screen.getByTestId("summaries-section-header");
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(container.querySelector(".summaries-body")).not.toHaveClass(
      "closed",
    );
  });

  it("section header aria-expanded reflects open/closed state", async () => {
    mockApiFetch.mockReturnValue(makeOkResponse([]));
    renderChatPage();
    await waitFor(() =>
      expect(screen.getByTestId("summaries-empty")).toBeInTheDocument(),
    );
    const btn = screen.getByTestId("summaries-section-header");
    expect(btn).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "false");
  });
});

// ── Toggle per-entry ──────────────────────────────────────────────────────────

describe("ChatPage Past Summaries — toggle individual entry", () => {
  const summaries = [
    makeSummary({
      id: "s1",
      generatedAt: "2026-07-04T10:00:00.000Z",
      content: "First.",
    }),
    makeSummary({
      id: "s2",
      generatedAt: "2026-06-04T10:00:00.000Z",
      content: "Second.",
    }),
    makeSummary({
      id: "s3",
      generatedAt: "2026-05-04T10:00:00.000Z",
      content: "Third.",
    }),
  ];

  it("clicking an expanded entry collapses it", async () => {
    mockApiFetch.mockReturnValue(makeOkResponse(summaries));
    renderChatPage();
    await waitFor(() =>
      expect(
        screen.getByTestId("summaries-entry-toggle-s1"),
      ).toBeInTheDocument(),
    );
    const toggle = screen.getByTestId("summaries-entry-toggle-s1");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("clicking a collapsed entry expands it", async () => {
    mockApiFetch.mockReturnValue(makeOkResponse(summaries));
    renderChatPage();
    await waitFor(() =>
      expect(
        screen.getByTestId("summaries-entry-toggle-s3"),
      ).toBeInTheDocument(),
    );
    const toggle = screen.getByTestId("summaries-entry-toggle-s3");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("toggling one entry does not affect the other entries", async () => {
    mockApiFetch.mockReturnValue(makeOkResponse(summaries));
    renderChatPage();
    await waitFor(() =>
      expect(
        screen.getByTestId("summaries-entry-toggle-s2"),
      ).toBeInTheDocument(),
    );
    // s2 starts open — collapse it
    fireEvent.click(screen.getByTestId("summaries-entry-toggle-s2"));
    // s1 and s3 should be unaffected
    expect(screen.getByTestId("summaries-entry-toggle-s1")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByTestId("summaries-entry-toggle-s3")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});

// ── buildPreview helper (tested via DOM) ─────────────────────────────────────

describe("ChatPage — buildPreview helper (via rendered preview span)", () => {
  // Three entries: s1 and s2 are expanded by default; s3 is collapsed.
  // The collapsed entry's preview span is always visible (opacity-0 when open),
  // so we read s3's preview to test buildPreview without interference from the
  // entry-content paragraph that also holds the full text.

  it("returns content unchanged when content is under 80 chars", async () => {
    const short = "Short content.";
    const three = [
      makeSummary({ id: "s1", content: "first" }),
      makeSummary({ id: "s2", content: "second" }),
      makeSummary({ id: "s3", content: short }),
    ];
    mockApiFetch.mockReturnValue(makeOkResponse(three));
    const { container } = renderChatPage();
    await waitFor(() =>
      expect(screen.getAllByTestId("summaries-entry")).toHaveLength(3),
    );
    // s3 is collapsed — preview span[2] shows the raw content (no truncation)
    const previewSpans = container.querySelectorAll(".summaries-entry-preview");
    expect(previewSpans[2].textContent).toBe(short);
  });

  it("truncates content over 80 chars at the last word boundary with '...'", async () => {
    const long =
      "The quick brown fox jumps over the lazy dog and then continues on for quite a bit more text here";
    const three = [
      makeSummary({ id: "s1", content: "first" }),
      makeSummary({ id: "s2", content: "second" }),
      makeSummary({ id: "s3", content: long }),
    ];
    mockApiFetch.mockReturnValue(makeOkResponse(three));
    const { container } = renderChatPage();
    await waitFor(() =>
      expect(screen.getAllByTestId("summaries-entry")).toHaveLength(3),
    );
    const previewSpans = container.querySelectorAll(".summaries-entry-preview");
    const text = previewSpans[2].textContent ?? "";
    expect(text.length).toBeLessThanOrEqual(83); // 80 chars + "..."
    expect(text).toMatch(/\.\.\.$/);
  });
});

// ── formatSummaryDate helper (tested via DOM) ─────────────────────────────────

describe("ChatPage — formatSummaryDate helper (via rendered date label)", () => {
  it("formats ISO timestamp as day-month-year without leading zero", async () => {
    mockApiFetch.mockReturnValue(
      makeOkResponse([
        makeSummary({ id: "s1", generatedAt: "2026-07-04T10:00:00.000Z" }),
      ]),
    );
    renderChatPage();
    await waitFor(() =>
      expect(screen.getByTestId("summaries-entry")).toBeInTheDocument(),
    );
    // The date label for 2026-07-04 should be "4 Jul 2026" (en-NZ locale)
    const dateEl = screen.getByText(/Jul 2026/);
    expect(dateEl).toBeInTheDocument();
    // Must not have a leading zero
    expect(dateEl.textContent).not.toMatch(/^0/);
  });
});

// ── Empty-state transactions guard ───────────────────────────────────────────

describe("ChatPage — empty transactions guard", () => {
  it("shows chat-empty state when rawTransactions is empty", () => {
    mockRawTransactions = [];
    mockApiFetch.mockReturnValue(makeOkResponse([]));
    renderChatPage();
    expect(screen.getByText("Upload transactions first.")).toBeInTheDocument();
    expect(screen.queryByTestId("summaries-section")).not.toBeInTheDocument();
  });
});
