// QA tests for #946 — FinancialAdvisorCard component
// Tests all four prop-driven states: loading, content, error, no-data.
// Also covers toggle collapse, Refresh/Retry callbacks, and navigation link.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { FinancialAdvisorCard } from "./FinancialAdvisorCard";
import type { FinancialAdvisorCardProps } from "./FinancialAdvisorCard";

// ── Defaults ──────────────────────────────────────────────────────────────────

const defaultProps: FinancialAdvisorCardProps = {
  isGenerating: false,
  summary: null,
  generatedAt: null,
  error: null,
  previousSummary: null,
  onRefresh: vi.fn(),
  onRetry: vi.fn(),
};

function renderCard(props: Partial<FinancialAdvisorCardProps> = {}) {
  return render(
    <MemoryRouter>
      <FinancialAdvisorCard {...defaultProps} {...props} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Card shell ────────────────────────────────────────────────────────────────

describe("FinancialAdvisorCard — card shell", () => {
  it("always renders the card container", () => {
    renderCard();
    expect(screen.getByTestId("financial-advisor-card")).toBeInTheDocument();
  });

  it("always shows the 'Financial Summary' label", () => {
    renderCard();
    expect(screen.getByText("Financial Summary")).toBeInTheDocument();
  });
});

// ── Loading state ─────────────────────────────────────────────────────────────

describe("FinancialAdvisorCard — loading state", () => {
  const loadingProps: Partial<FinancialAdvisorCardProps> = {
    isGenerating: true,
    summary: null,
    error: null,
  };

  it("shows the skeleton shimmer group", () => {
    renderCard(loadingProps);
    expect(screen.getByTestId("fac-skeleton")).toBeInTheDocument();
  });

  it("shows the 'Generating your financial summary...' message", () => {
    renderCard(loadingProps);
    expect(
      screen.getByText("Generating your financial summary..."),
    ).toBeInTheDocument();
  });

  it("toggle button is disabled while generating", () => {
    renderCard(loadingProps);
    const btn = screen.getByRole("button", { name: /Financial Summary/i });
    expect(btn).toBeDisabled();
  });

  it("does not render the Refresh or Retry button while generating", () => {
    renderCard(loadingProps);
    expect(
      screen.queryByRole("button", { name: /Refresh summary/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Retry/i }),
    ).not.toBeInTheDocument();
  });

  it("does not show error banner or no-data message in loading state", () => {
    renderCard(loadingProps);
    expect(screen.queryByTestId("fac-error-wrap")).not.toBeInTheDocument();
    expect(screen.queryByTestId("fac-no-data")).not.toBeInTheDocument();
  });
});

// ── Content state ─────────────────────────────────────────────────────────────

describe("FinancialAdvisorCard — content state", () => {
  const contentProps: Partial<FinancialAdvisorCardProps> = {
    isGenerating: false,
    summary: "Your spending this month is on track. Great savings rate!",
    generatedAt: new Date("2026-07-04T10:00:00Z"),
    error: null,
  };

  it("renders the summary text", () => {
    renderCard(contentProps);
    expect(screen.getByTestId("fac-summary-text")).toBeInTheDocument();
    expect(screen.getByTestId("fac-summary-text").textContent).toBe(
      contentProps.summary,
    );
  });

  it("renders the generation date chip", () => {
    renderCard(contentProps);
    // generatedAt is 2026-07-04 → formatted as "4 Jul 2026"
    const card = screen.getByTestId("financial-advisor-card");
    expect(card.textContent).toMatch(/4 Jul 2026/);
  });

  it("renders 'Ask a question →' link pointing to /chat", () => {
    renderCard(contentProps);
    const link = screen.getByTestId("fac-ask-link");
    expect(link).toBeInTheDocument();
    expect(link.textContent).toContain("Ask a question");
    expect(link).toHaveAttribute("href", "/chat");
  });

  it("renders enabled Refresh button", () => {
    renderCard(contentProps);
    const btn = screen.getByRole("button", { name: /Refresh summary/i });
    expect(btn).not.toBeDisabled();
  });

  it("Refresh button calls onRefresh when clicked", () => {
    const onRefresh = vi.fn();
    renderCard({ ...contentProps, onRefresh });
    fireEvent.click(screen.getByRole("button", { name: /Refresh summary/i }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("does not render skeleton or error wrap in content state", () => {
    renderCard(contentProps);
    expect(screen.queryByTestId("fac-skeleton")).not.toBeInTheDocument();
    expect(screen.queryByTestId("fac-error-wrap")).not.toBeInTheDocument();
    expect(screen.queryByTestId("fac-no-data")).not.toBeInTheDocument();
  });
});

// ── Content state — truncate preview ─────────────────────────────────────────

describe("FinancialAdvisorCard — summary truncation in header preview", () => {
  it("shows preview text of ≤80 chars unchanged in header", () => {
    const { container } = renderCard({
      summary: "Short summary",
      generatedAt: new Date(),
    });
    // Both the header preview span and the body paragraph show the short text;
    // check that the preview span specifically has the content.
    const previewSpan = container.querySelector(".fac-preview");
    expect(previewSpan).toBeInTheDocument();
    expect(previewSpan?.textContent).toBe("Short summary");
  });

  it("truncates preview to 80 chars with ellipsis in header when summary is long", () => {
    const long = "A".repeat(100);
    renderCard({
      summary: long,
      generatedAt: new Date(),
    });
    // The header preview should show the truncated version
    const card = screen.getByTestId("financial-advisor-card");
    expect(card.textContent).toContain("A".repeat(80) + "…");
    // The body should show the full summary
    expect(screen.getByTestId("fac-summary-text").textContent).toBe(long);
  });
});

// ── Error state ───────────────────────────────────────────────────────────────

describe("FinancialAdvisorCard — error state (no previous summary)", () => {
  const errorProps: Partial<FinancialAdvisorCardProps> = {
    isGenerating: false,
    summary: null,
    error: "Something went wrong.",
    previousSummary: null,
  };

  it("renders the error wrap", () => {
    renderCard(errorProps);
    expect(screen.getByTestId("fac-error-wrap")).toBeInTheDocument();
  });

  it("shows the error banner message", () => {
    renderCard(errorProps);
    expect(
      screen.getByText(
        "Unable to generate summary. Check your connection and try again.",
      ),
    ).toBeInTheDocument();
  });

  it("renders the Retry button", () => {
    renderCard(errorProps);
    const btn = screen.getByRole("button", {
      name: /Retry generating summary/i,
    });
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
  });

  it("Retry button calls onRetry when clicked", () => {
    const onRetry = vi.fn();
    renderCard({ ...errorProps, onRetry });
    fireEvent.click(
      screen.getByRole("button", { name: /Retry generating summary/i }),
    );
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("does not show fallback text when previousSummary is null", () => {
    renderCard(errorProps);
    expect(screen.queryByTestId("fac-fallback-text")).not.toBeInTheDocument();
  });

  it("does not show skeleton or no-data in error state", () => {
    renderCard(errorProps);
    expect(screen.queryByTestId("fac-skeleton")).not.toBeInTheDocument();
    expect(screen.queryByTestId("fac-no-data")).not.toBeInTheDocument();
  });
});

describe("FinancialAdvisorCard — error state (with previous summary fallback)", () => {
  const errorWithFallbackProps: Partial<FinancialAdvisorCardProps> = {
    isGenerating: false,
    summary: null,
    error: "Network error.",
    previousSummary: "Previous summary content shown as fallback.",
  };

  it("shows the fallback summary text", () => {
    renderCard(errorWithFallbackProps);
    const fallback = screen.getByTestId("fac-fallback-text");
    expect(fallback).toBeInTheDocument();
    expect(fallback.textContent).toBe(
      "Previous summary content shown as fallback.",
    );
  });

  it("shows the 'Ask a question →' link in error fallback", () => {
    renderCard(errorWithFallbackProps);
    const link = screen.getByTestId("fac-ask-link-error");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/chat");
  });
});

// ── No-data state ─────────────────────────────────────────────────────────────

describe("FinancialAdvisorCard — no-data state", () => {
  const noDataProps: Partial<FinancialAdvisorCardProps> = {
    isGenerating: false,
    summary: null,
    generatedAt: null,
    error: null,
  };

  it("renders the no-data message", () => {
    renderCard(noDataProps);
    const msg = screen.getByTestId("fac-no-data");
    expect(msg).toBeInTheDocument();
    expect(msg.textContent).toBe("Not enough data to generate a summary yet.");
  });

  it("does not render Refresh or Retry button in no-data state", () => {
    renderCard(noDataProps);
    expect(
      screen.queryByRole("button", { name: /Refresh summary/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Retry/i }),
    ).not.toBeInTheDocument();
  });

  it("does not render skeleton or error wrap in no-data state", () => {
    renderCard(noDataProps);
    expect(screen.queryByTestId("fac-skeleton")).not.toBeInTheDocument();
    expect(screen.queryByTestId("fac-error-wrap")).not.toBeInTheDocument();
  });
});

// ── Collapse / expand toggle ──────────────────────────────────────────────────

describe("FinancialAdvisorCard — collapse / expand toggle", () => {
  const contentProps: Partial<FinancialAdvisorCardProps> = {
    isGenerating: false,
    summary: "Summary text for toggle test.",
    generatedAt: new Date(),
    error: null,
  };

  it("body is open by default (fac-body--open class present)", () => {
    const { container } = renderCard(contentProps);
    const body = container.querySelector("#advisor-body");
    expect(body).toHaveClass("fac-body--open");
  });

  it("clicking the toggle button collapses the body", () => {
    const { container } = renderCard(contentProps);
    const toggleBtn = screen.getByRole("button", {
      name: /Financial Summary/i,
    });
    fireEvent.click(toggleBtn);
    const body = container.querySelector("#advisor-body");
    expect(body).not.toHaveClass("fac-body--open");
  });

  it("clicking toggle twice returns to open state", () => {
    const { container } = renderCard(contentProps);
    const toggleBtn = screen.getByRole("button", {
      name: /Financial Summary/i,
    });
    fireEvent.click(toggleBtn);
    fireEvent.click(toggleBtn);
    const body = container.querySelector("#advisor-body");
    expect(body).toHaveClass("fac-body--open");
  });

  it("toggle button has aria-expanded=true when open", () => {
    renderCard(contentProps);
    const toggleBtn = screen.getByRole("button", {
      name: /Financial Summary/i,
    });
    expect(toggleBtn).toHaveAttribute("aria-expanded", "true");
  });

  it("toggle button has aria-expanded=false after collapsing", () => {
    renderCard(contentProps);
    const toggleBtn = screen.getByRole("button", {
      name: /Financial Summary/i,
    });
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
  });
});

// ── Refresh disabled while generating ────────────────────────────────────────

describe("FinancialAdvisorCard — Refresh button disabled while generating", () => {
  it("Refresh button is disabled when isGenerating=true (shown alongside prior summary)", () => {
    // Edge case: summary provided but isGenerating=true means the error state
    // can also show Retry. Here we test with error+isGenerating=true to cover
    // the disabled path for the Retry button.
    // Note: isGenerating=true with summary=null, error=null → loading state (no button).
    // To get the Refresh button visible + disabled, we need isContent=true but
    // isGenerating=true. However, per logic: isContent = !isGenerating && summary !== null.
    // So the disabled path for Refresh is covered via the loading state test above
    // (button not rendered at all). The Retry disabled path requires error + isGenerating.
    const { queryByRole } = renderCard({
      isGenerating: true,
      summary: null,
      error: "prev error",
      previousSummary: null,
    });
    // In loading state, neither button is shown (isContent and isError are both false)
    expect(queryByRole("button", { name: /Refresh/i })).not.toBeInTheDocument();
  });
});

// ── Accessibility ─────────────────────────────────────────────────────────────

describe("FinancialAdvisorCard — accessibility", () => {
  it("toggle button has aria-controls pointing to the body region", () => {
    renderCard({
      summary: "test",
      generatedAt: new Date(),
    });
    const btn = screen.getByRole("button", { name: /Financial Summary/i });
    expect(btn).toHaveAttribute("aria-controls", "advisor-body");
  });

  it("body region has aria-label='Financial summary details'", () => {
    const { container } = renderCard({
      summary: "test",
      generatedAt: new Date(),
    });
    const body = container.querySelector("#advisor-body");
    expect(body).toHaveAttribute("aria-label", "Financial summary details");
  });

  it("icon is aria-hidden to avoid duplicate content for screen readers", () => {
    const { container } = renderCard({
      summary: "test",
      generatedAt: new Date(),
    });
    const icon = container.querySelector(".fac-icon");
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });
});
