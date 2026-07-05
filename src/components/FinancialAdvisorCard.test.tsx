// QA tests for #946 — FinancialAdvisorCard component (v2 / fac2- redesign)
// Tests all four prop-driven states: loading, content, error, no-data.
// The card is no longer collapsible; toggle-related tests are removed.

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

  it("always shows the 'AI Financial Summary' header label", () => {
    renderCard();
    expect(screen.getByText("AI Financial Summary")).toBeInTheDocument();
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

  it("shows the 'Generating…' status in the header", () => {
    renderCard(loadingProps);
    expect(screen.getByText("Generating…")).toBeInTheDocument();
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

  it("renders the generation date in the header", () => {
    renderCard(contentProps);
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
    const btn = screen.getByRole("button", { name: /Retry/i });
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
  });

  it("Retry button calls onRetry when clicked", () => {
    const onRetry = vi.fn();
    renderCard({ ...errorProps, onRetry });
    fireEvent.click(screen.getByRole("button", { name: /Retry/i }));
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

  it("header uses the error variant class", () => {
    const { container } = renderCard(errorProps);
    expect(container.querySelector(".fac2-header--error")).toBeInTheDocument();
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

// ── Refresh disabled while generating ────────────────────────────────────────

describe("FinancialAdvisorCard — buttons absent while generating", () => {
  it("no Refresh/Retry button when isGenerating=true regardless of error", () => {
    const { queryByRole } = renderCard({
      isGenerating: true,
      summary: null,
      error: "prev error",
      previousSummary: null,
    });
    expect(queryByRole("button", { name: /Refresh/i })).not.toBeInTheDocument();
    expect(queryByRole("button", { name: /Retry/i })).not.toBeInTheDocument();
  });
});

// ── Accessibility ─────────────────────────────────────────────────────────────

describe("FinancialAdvisorCard — accessibility", () => {
  it("header icon is aria-hidden to avoid duplicate content for screen readers", () => {
    const { container } = renderCard({
      summary: "test",
      generatedAt: new Date(),
    });
    const icon = container.querySelector(".fac2-header-icon");
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("skeleton has aria-busy=true and aria-label while generating", () => {
    renderCard({ isGenerating: true });
    const skeleton = screen.getByTestId("fac-skeleton");
    expect(skeleton).toHaveAttribute("aria-busy", "true");
    expect(skeleton).toHaveAttribute("aria-label", "Generating summary");
  });

  it("Refresh button has aria-label='Refresh summary'", () => {
    renderCard({ summary: "test", generatedAt: new Date() });
    const btn = screen.getByRole("button", { name: "Refresh summary" });
    expect(btn).toBeInTheDocument();
  });
});
