import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AlertPreferencesSection } from "./SettingsPage";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockApiFetch = vi.fn();

vi.mock("../lib/api", () => ({
  useApi: () => ({ apiFetch: mockApiFetch }),
  API_BASE: "",
}));

// AuthContext is consumed by useApi internally; mock it to avoid
// "useAuth must be used within AuthProvider".
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ accessToken: "test-token", logout: vi.fn() }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function renderSection() {
  return render(<AlertPreferencesSection />);
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("AlertPreferencesSection — rendering (#636)", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    // Default: GET /api/preferences returns threshold=80
    mockApiFetch.mockImplementation((url: string) => {
      if (url === "/api/preferences") {
        return Promise.resolve({
          alertThreshold: 80,
          emailAlertsEnabled: true,
        });
      }
      return Promise.resolve({});
    });
  });

  it("renders the Alert Preferences section heading", async () => {
    renderSection();
    expect(await screen.findByText("Alert Preferences")).toBeInTheDocument();
  });

  it("renders the threshold input with the fetched value (80)", async () => {
    renderSection();
    const input = (await screen.findByTestId(
      "alert-threshold-input",
    )) as HTMLInputElement;
    expect(input.value).toBe("80");
  });

  it("fetches GET /api/preferences on mount", async () => {
    renderSection();
    await screen.findByTestId("alert-threshold-input");
    expect(mockApiFetch).toHaveBeenCalledWith("/api/preferences");
  });
});

describe("AlertPreferencesSection — validation (#636)", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockApiFetch.mockResolvedValue({
      alertThreshold: 80,
      emailAlertsEnabled: true,
    });
  });

  it("shows an inline error when the user types a value below 50", async () => {
    const user = userEvent.setup();
    renderSection();
    const input = await screen.findByTestId("alert-threshold-input");

    await user.clear(input);
    await user.type(input, "30");
    // Trigger validation via blur
    await user.tab();

    expect(
      await screen.findByTestId("alert-threshold-error"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("alert-threshold-error").textContent).toMatch(
      /50.*100|between/i,
    );
  });

  it("shows an inline error when the user types a value above 100", async () => {
    const user = userEvent.setup();
    renderSection();
    const input = await screen.findByTestId("alert-threshold-input");

    await user.clear(input);
    await user.type(input, "110");
    await user.tab();

    expect(
      await screen.findByTestId("alert-threshold-error"),
    ).toBeInTheDocument();
  });

  it("shows an inline error for non-integer input", async () => {
    const user = userEvent.setup();
    renderSection();
    const input = await screen.findByTestId("alert-threshold-input");

    await user.clear(input);
    await user.type(input, "75.5");
    await user.tab();

    expect(
      await screen.findByTestId("alert-threshold-error"),
    ).toBeInTheDocument();
  });

  it("does not show an error for a valid value (75)", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValue({ alertThreshold: 80 });
    // PATCH also resolves successfully
    mockApiFetch.mockImplementation((_url: string, opts?: RequestInit) => {
      if (opts?.method === "PATCH") {
        return Promise.resolve({ alertThreshold: 75 });
      }
      return Promise.resolve({ alertThreshold: 80 });
    });

    renderSection();
    const input = await screen.findByTestId("alert-threshold-input");

    await user.clear(input);
    await user.type(input, "75");
    await user.tab();

    await waitFor(() => {
      expect(
        screen.queryByTestId("alert-threshold-error"),
      ).not.toBeInTheDocument();
    });
  });
});

describe("AlertPreferencesSection — PATCH on valid blur (#636)", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it("calls PATCH /api/preferences with alertThreshold when a valid value is blurred", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockImplementation((_url: string, opts?: RequestInit) => {
      if (opts?.method === "PATCH") {
        return Promise.resolve({ alertThreshold: 70 });
      }
      return Promise.resolve({ alertThreshold: 80 });
    });

    renderSection();
    const input = await screen.findByTestId("alert-threshold-input");

    await user.clear(input);
    await user.type(input, "70");
    await user.tab();

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/preferences",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ alertThreshold: 70 }),
        }),
      );
    });
  });

  it("does not call PATCH when the value is unchanged after blur", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValue({ alertThreshold: 80 });

    renderSection();
    const input = await screen.findByTestId("alert-threshold-input");

    // Focus then blur without changing value
    await user.click(input);
    await user.tab();

    await waitFor(() => {
      // Only the initial GET should have been called
      const patchCalls = (
        mockApiFetch.mock.calls as [string, RequestInit | undefined][]
      ).filter(([, opts]) => opts?.method === "PATCH");
      expect(patchCalls).toHaveLength(0);
    });
  });
});
