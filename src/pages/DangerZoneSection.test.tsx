import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DangerZoneSection } from "./SettingsPage";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockApiFetch = vi.fn();

vi.mock("../lib/api", () => ({
  useApi: () => ({ apiFetch: mockApiFetch }),
  API_BASE: "",
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ accessToken: "test-token", logout: vi.fn() }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function renderSection() {
  return render(<DangerZoneSection />);
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("DangerZoneSection — rendering (#769)", () => {
  it("renders the Danger Zone section heading", () => {
    renderSection();
    expect(screen.getByText("Danger Zone")).toBeInTheDocument();
  });

  it("renders the delete all transactions button", () => {
    renderSection();
    expect(screen.getByTestId("danger-zone-open-btn")).toBeInTheDocument();
  });

  it("does not show the confirmation dialog initially", () => {
    renderSection();
    expect(screen.queryByTestId("danger-zone-dialog")).not.toBeInTheDocument();
  });
});

describe("DangerZoneSection — confirmation dialog (#769)", () => {
  it("shows the dialog when the delete button is clicked", async () => {
    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByTestId("danger-zone-open-btn"));
    expect(screen.getByTestId("danger-zone-dialog")).toBeInTheDocument();
  });

  it("keeps the confirm button disabled when no text is entered", async () => {
    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByTestId("danger-zone-open-btn"));
    const confirmBtn = screen.getByTestId(
      "danger-zone-confirm-btn",
    ) as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);
  });

  it("keeps the confirm button disabled when wrong text is entered", async () => {
    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByTestId("danger-zone-open-btn"));

    await user.type(screen.getByTestId("danger-zone-confirm-input"), "delete");
    const confirmBtn = screen.getByTestId(
      "danger-zone-confirm-btn",
    ) as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);
  });

  it("enables the confirm button only when exact 'DELETE' is typed", async () => {
    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByTestId("danger-zone-open-btn"));

    await user.type(screen.getByTestId("danger-zone-confirm-input"), "DELETE");
    const confirmBtn = screen.getByTestId(
      "danger-zone-confirm-btn",
    ) as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(false);
  });

  it("hides the dialog and shows success message when confirm is clicked and API succeeds", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValue({
      ok: true,
      status: 204,
    } as unknown as Response);

    renderSection();
    await user.click(screen.getByTestId("danger-zone-open-btn"));
    await user.type(screen.getByTestId("danger-zone-confirm-input"), "DELETE");
    await user.click(screen.getByTestId("danger-zone-confirm-btn"));

    await waitFor(() => {
      expect(
        screen.queryByTestId("danger-zone-dialog"),
      ).not.toBeInTheDocument();
    });
    expect(
      await screen.findByTestId("danger-zone-success"),
    ).toBeInTheDocument();
  });

  it("calls DELETE /api/transactions when confirm is clicked", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValue({
      ok: true,
      status: 204,
    } as unknown as Response);

    renderSection();
    await user.click(screen.getByTestId("danger-zone-open-btn"));
    await user.type(screen.getByTestId("danger-zone-confirm-input"), "DELETE");
    await user.click(screen.getByTestId("danger-zone-confirm-btn"));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith("/api/transactions", {
        method: "DELETE",
      });
    });
  });

  it("shows an error message when the API returns an error response", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Server error" }),
    } as unknown as Response);

    renderSection();
    await user.click(screen.getByTestId("danger-zone-open-btn"));
    await user.type(screen.getByTestId("danger-zone-confirm-input"), "DELETE");
    await user.click(screen.getByTestId("danger-zone-confirm-btn"));

    expect(await screen.findByTestId("danger-zone-error")).toBeInTheDocument();
  });

  it("hides the dialog when Cancel is clicked", async () => {
    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByTestId("danger-zone-open-btn"));
    expect(screen.getByTestId("danger-zone-dialog")).toBeInTheDocument();

    await user.click(screen.getByTestId("danger-zone-cancel-btn"));
    expect(screen.queryByTestId("danger-zone-dialog")).not.toBeInTheDocument();
  });
});
