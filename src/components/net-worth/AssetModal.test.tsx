import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AssetModal } from "./AssetModal";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockAddAsset = vi.fn();
const mockUpdateAsset = vi.fn();

vi.mock("../../context/NetWorthContext", () => ({
  useNetWorth: () => ({
    assets: [],
    liabilities: [],
    isLoading: false,
    addAsset: mockAddAsset,
    updateAsset: mockUpdateAsset,
    removeAsset: vi.fn(),
    refreshNetWorth: vi.fn(),
  }),
}));

vi.mock("../../context/AccountContext", () => ({
  useAccount: () => ({
    accounts: [
      { id: "acct-1", nickname: "Savings", color: "#10b981" },
      { id: "acct-2", nickname: "Checking", color: "#3b82f6" },
    ],
    isLoading: false,
    addAccount: vi.fn(),
    updateAccount: vi.fn(),
    removeAccount: vi.fn(),
  }),
}));

vi.mock("../../lib/api", () => ({
  useApi: () => ({ apiFetch: vi.fn() }),
  API_BASE: "",
}));

vi.mock("../../hooks/useToast", () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function renderModal(onClose = vi.fn()) {
  return render(<AssetModal onClose={onClose} />);
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("AssetModal — backdrop (#551)", () => {
  beforeEach(() => {
    mockAddAsset.mockReset();
    mockUpdateAsset.mockReset();
  });

  it("renders a backdrop element with correct role and aria attributes", () => {
    renderModal();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "asset-modal-title");
  });

  it("renders the 'Add Asset' heading inside the panel", () => {
    renderModal();
    expect(screen.getByText("Add Asset")).toBeInTheDocument();
  });

  it("calls onClose when the backdrop is clicked (outside the panel)", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderModal(onClose);

    const dialog = screen.getByRole("dialog");
    // Simulate a click directly on the backdrop (target === currentTarget)
    await user.click(dialog);

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does NOT call onClose when clicking inside the panel", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderModal(onClose);

    // Click a child element inside the panel — not the backdrop itself
    const heading = screen.getByText("Add Asset");
    await user.click(heading);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("renders Name, Type, Value, and Linked Account fields", () => {
    renderModal();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Type")).toBeInTheDocument();
    expect(screen.getByLabelText("Value (NZD)")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Linked Account (optional)"),
    ).toBeInTheDocument();
  });

  it("populates the Linked Account dropdown with accounts from context", () => {
    renderModal();
    const select = screen.getByLabelText(
      "Linked Account (optional)",
    ) as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    // Verify the two mocked accounts appear as options inside the linked account select
    const options = Array.from(select.options).map((o) => o.text);
    expect(options).toContain("Savings");
    expect(options).toContain("Checking");
  });
});
