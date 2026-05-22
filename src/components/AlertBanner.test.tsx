// Fix #734 / FA-BUDG-003 T006 — Component tests for AlertBanner (Option A)

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AlertBanner } from "./AlertBanner";
import type { AlertedCategory, ApiUserPreferences } from "../types/api";

// ── Mock useApi ────────────────────────────────────────────────────────────────

const mockApiFetch = vi.fn();

vi.mock("../lib/api", () => ({
  useApi: () => ({ apiFetch: mockApiFetch }),
  API_BASE: "",
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePrefsResponse(
  alertThreshold = 80,
): Partial<ApiUserPreferences> & { alertThreshold: number } {
  return {
    id: "p1",
    monthStartDay: 1,
    alertThreshold,
    emailAlertsEnabled: true,
    lastAlertEmailSentAt: null,
  };
}

function makeAlertedCategory(
  overrides: Partial<AlertedCategory> = {},
): AlertedCategory {
  return {
    categoryName: "Groceries",
    limitAmount: 500,
    actualSpend: 425,
    percentageUsed: 85,
    ...overrides,
  };
}

function mockFetchResponses(
  alerts: AlertedCategory[],
  prefs: object = makePrefsResponse(),
) {
  mockApiFetch.mockImplementation((url: string) => {
    if (url === "/api/preferences") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(prefs),
      });
    }
    if (url === "/api/budgets/alerts") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(alerts),
      });
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve([]) });
  });
}

function renderBanner() {
  return render(
    <MemoryRouter>
      <AlertBanner />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── No alerts ─────────────────────────────────────────────────────────────────

describe("AlertBanner — no alerts", () => {
  it("renders nothing when alerts array is empty", async () => {
    mockFetchResponses([]);
    const { container } = renderBanner();
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("renders nothing when all categories are below threshold", async () => {
    mockFetchResponses(
      [makeAlertedCategory({ percentageUsed: 60 })],
      makePrefsResponse(80),
    );
    const { container } = renderBanner();
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("renders nothing when both API calls fail", async () => {
    mockApiFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve([]),
    });
    const { container } = renderBanner();
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });
});

// ── Alert shown ───────────────────────────────────────────────────────────────

describe("AlertBanner — alerts visible", () => {
  it("shows the banner when at least one category is at or above threshold", async () => {
    mockFetchResponses([makeAlertedCategory({ percentageUsed: 85 })]);
    renderBanner();
    await waitFor(() => {
      expect(screen.getByTestId("alert-banner")).toBeInTheDocument();
    });
  });

  it("shows 'Budget alert' label", async () => {
    mockFetchResponses([makeAlertedCategory()]);
    renderBanner();
    await waitFor(() => {
      expect(screen.getByText("Budget alert")).toBeInTheDocument();
    });
  });

  it("shows a chip for each alerted category with name and percentage", async () => {
    mockFetchResponses([
      makeAlertedCategory({ categoryName: "Groceries", percentageUsed: 85 }),
      makeAlertedCategory({ categoryName: "Transport", percentageUsed: 92.6 }),
    ]);
    renderBanner();
    await waitFor(() => {
      expect(screen.getByText("Groceries 85%")).toBeInTheDocument();
      expect(screen.getByText("Transport 93%")).toBeInTheDocument();
    });
  });

  it("applies critical class for chips over 100%", async () => {
    mockFetchResponses([
      makeAlertedCategory({ categoryName: "Dining", percentageUsed: 120 }),
    ]);
    renderBanner();
    await waitFor(() => {
      const chip = screen.getByTestId("alert-banner-chip");
      expect(chip).toHaveClass("alert-banner__chip--critical");
    });
  });

  it("does NOT apply critical class for chips at or under 100%", async () => {
    mockFetchResponses([
      makeAlertedCategory({ categoryName: "Groceries", percentageUsed: 100 }),
    ]);
    renderBanner();
    await waitFor(() => {
      const chip = screen.getByTestId("alert-banner-chip");
      expect(chip).not.toHaveClass("alert-banner__chip--critical");
    });
  });

  it("shows a Dismiss button", async () => {
    mockFetchResponses([makeAlertedCategory()]);
    renderBanner();
    await waitFor(() => {
      expect(screen.getByTestId("alert-banner-dismiss")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /dismiss budget alert/i }),
      ).toBeInTheDocument();
    });
  });

  it("filters categories below threshold using client-side threshold", async () => {
    mockFetchResponses(
      [
        makeAlertedCategory({ categoryName: "Groceries", percentageUsed: 75 }),
        makeAlertedCategory({ categoryName: "Transport", percentageUsed: 90 }),
      ],
      makePrefsResponse(80),
    );
    renderBanner();
    await waitFor(() => {
      expect(screen.queryByText(/Groceries/)).toBeNull();
      expect(screen.getByText("Transport 90%")).toBeInTheDocument();
    });
  });
});

// ── Dismiss ───────────────────────────────────────────────────────────────────

describe("AlertBanner — dismiss", () => {
  it("hides the banner when Dismiss is clicked", async () => {
    mockFetchResponses([makeAlertedCategory()]);
    renderBanner();

    await waitFor(() => {
      expect(screen.getByTestId("alert-banner")).toBeInTheDocument();
    });

    await act(async () => {
      await userEvent.click(screen.getByTestId("alert-banner-dismiss"));
    });

    expect(screen.queryByTestId("alert-banner")).toBeNull();
  });

  it("does NOT use sessionStorage or localStorage for dismiss state", async () => {
    const sessionSetSpy = vi.spyOn(Storage.prototype, "setItem");
    mockFetchResponses([makeAlertedCategory()]);
    renderBanner();

    await waitFor(() => {
      expect(screen.getByTestId("alert-banner")).toBeInTheDocument();
    });

    await act(async () => {
      await userEvent.click(screen.getByTestId("alert-banner-dismiss"));
    });

    expect(sessionSetSpy).not.toHaveBeenCalled();
  });
});
