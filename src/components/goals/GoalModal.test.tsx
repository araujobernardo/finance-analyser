import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GoalModal } from "./GoalModal";
import { GoalsProvider } from "../../context/GoalsContext";
import { AccountProvider } from "../../context/AccountContext";

// ── Mock useApi ────────────────────────────────────────────────────────────

const mockApiFetch = vi.fn();
vi.mock("../../lib/api", () => ({
  useApi: () => ({ apiFetch: mockApiFetch }),
  API_BASE: "",
}));

// ── Mock useToast ──────────────────────────────────────────────────────────

vi.mock("../../hooks/useToast", () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

// mockAddGoal is used to intercept addGoal calls without going through the real context
const mockAddGoal = vi.fn();

vi.mock("../../context/GoalsContext", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../../context/GoalsContext")>();
  return {
    ...original,
    useGoals: () => ({
      goals: [],
      isLoading: false,
      addGoal: mockAddGoal,
      updateGoal: vi.fn(),
      removeGoal: vi.fn(),
    }),
  };
});

function renderModal(onClose = vi.fn()) {
  return render(
    <AccountProvider>
      <GoalsProvider>
        <GoalModal onClose={onClose} />
      </GoalsProvider>
    </AccountProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  // AccountProvider fetches /api/accounts on mount
  mockApiFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ accounts: [], goals: [] }),
  });
  // Default: addGoal resolves to true (success)
  mockAddGoal.mockResolvedValue(true);
});

// ── Render ─────────────────────────────────────────────────────────────────

describe("GoalModal — render", () => {
  it('renders the "Add Goal" heading', () => {
    renderModal();
    expect(
      screen.getByRole("heading", { name: /add goal/i }),
    ).toBeInTheDocument();
  });

  it('has role="dialog" and aria-modal="true"', () => {
    renderModal();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("renders the Goal Name input", () => {
    renderModal();
    expect(screen.getByTestId("goal-modal-name-input")).toBeInTheDocument();
  });

  it("renders all four goal type tiles", () => {
    renderModal();
    expect(screen.getByText("Savings Target")).toBeInTheDocument();
    expect(screen.getByText("Debt Payoff")).toBeInTheDocument();
    expect(screen.getByText("Net Worth Milestone")).toBeInTheDocument();
    expect(screen.getByText("Spending Limit")).toBeInTheDocument();
  });

  it("renders Cancel and Save Goal buttons", () => {
    renderModal();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /save goal/i }),
    ).toBeInTheDocument();
  });

  it("shows step 1 indicator text on initial render", () => {
    renderModal();
    expect(
      screen.getByText(/step 1 of 2 — what kind of goal\?/i),
    ).toBeInTheDocument();
  });
});

// ── Tile lock gate ─────────────────────────────────────────────────────────

describe("GoalModal — tile lock gate", () => {
  it("tiles have locked class when name is empty", () => {
    renderModal();
    const tilesContainer = screen.getByTestId("goal-modal-tiles");
    expect(tilesContainer.className).toContain("goal-modal__tiles--locked");
  });

  it("tiles unlock after typing a name", async () => {
    renderModal();
    await userEvent.type(
      screen.getByTestId("goal-modal-name-input"),
      "My Goal",
    );
    expect(screen.getByTestId("goal-modal-tiles").className).not.toContain(
      "goal-modal__tiles--locked",
    );
  });
});

// ── Tile selection ─────────────────────────────────────────────────────────

describe("GoalModal — tile selection", () => {
  async function typeNameAndSelectTile(tileType: string) {
    await userEvent.type(
      screen.getByTestId("goal-modal-name-input"),
      "My Goal",
    );
    await userEvent.click(screen.getByTestId(`goal-tile-${tileType}`));
  }

  it("advances to step 2 indicator after selecting a tile", async () => {
    renderModal();
    await typeNameAndSelectTile("savings_target");
    expect(
      screen.getByText(/step 2 of 2 — fill in the details/i),
    ).toBeInTheDocument();
  });

  it("reveals the adaptive fields container after tile selection", async () => {
    renderModal();
    await typeNameAndSelectTile("savings_target");
    expect(screen.getByTestId("goal-modal-adaptive").className).toContain(
      "goal-modal__adaptive--visible",
    );
  });

  it("shows 'Target Amount' label for savings_target", async () => {
    renderModal();
    await typeNameAndSelectTile("savings_target");
    expect(screen.getByText("Target Amount")).toBeInTheDocument();
  });

  it("shows 'Total Debt Amount' label for debt_payoff", async () => {
    renderModal();
    await typeNameAndSelectTile("debt_payoff");
    expect(screen.getByText("Total Debt Amount")).toBeInTheDocument();
  });

  it("shows 'Target Net Worth' label for net_worth_milestone", async () => {
    renderModal();
    await typeNameAndSelectTile("net_worth_milestone");
    expect(screen.getByText("Target Net Worth")).toBeInTheDocument();
  });

  it("shows 'Monthly Limit' label for spending_limit", async () => {
    renderModal();
    await typeNameAndSelectTile("spending_limit");
    expect(screen.getByText("Monthly Limit")).toBeInTheDocument();
  });

  it("shows context hint banner after tile selection", async () => {
    renderModal();
    await typeNameAndSelectTile("savings_target");
    const hint = screen.getByTestId("goal-modal-context-hint");
    expect(hint).toBeInTheDocument();
    expect(hint.textContent).toMatch(/track progress towards/i);
  });
});

// ── Category field ─────────────────────────────────────────────────────────

describe("GoalModal — category field (spending_limit)", () => {
  it("shows spending category field when spending_limit is selected", async () => {
    renderModal();
    await userEvent.type(
      screen.getByTestId("goal-modal-name-input"),
      "Dining Budget",
    );
    await userEvent.click(screen.getByTestId("goal-tile-spending_limit"));
    expect(screen.getByTestId("goal-modal-category-field").className).toContain(
      "goal-modal__category--visible",
    );
  });

  it("hides and clears category field when switching away from spending_limit", async () => {
    renderModal();
    await userEvent.type(screen.getByTestId("goal-modal-name-input"), "Test");
    await userEvent.click(screen.getByTestId("goal-tile-spending_limit"));

    const catInput = screen.getByTestId(
      "goal-modal-category-input",
    ) as HTMLInputElement;
    await userEvent.type(catInput, "Dining");
    expect(catInput.value).toBe("Dining");

    await userEvent.click(screen.getByTestId("goal-tile-savings_target"));

    expect(
      screen.getByTestId("goal-modal-category-field").className,
    ).not.toContain("goal-modal__category--visible");
    expect(catInput.value).toBe("");
  });
});

// ── Validation ─────────────────────────────────────────────────────────────

describe("GoalModal — validation", () => {
  it("shows name error on Save when name is empty", async () => {
    renderModal();
    await userEvent.click(screen.getByRole("button", { name: /save goal/i }));
    const alerts = screen.getAllByRole("alert");
    expect(alerts.some((a) => /required/i.test(a.textContent ?? ""))).toBe(
      true,
    );
  });

  it("shows amount error on Save when amount is missing (after tile selected)", async () => {
    renderModal();
    await userEvent.type(
      screen.getByTestId("goal-modal-name-input"),
      "My Savings",
    );
    await userEvent.click(screen.getByTestId("goal-tile-savings_target"));
    await userEvent.click(screen.getByRole("button", { name: /save goal/i }));
    const alerts = screen.getAllByRole("alert");
    expect(
      alerts.some((a) => /amount greater than 0/i.test(a.textContent ?? "")),
    ).toBe(true);
  });

  it("clears name error as user corrects input", async () => {
    renderModal();
    await userEvent.click(screen.getByRole("button", { name: /save goal/i }));
    expect(
      screen
        .getAllByRole("alert")
        .some((a) => /required/i.test(a.textContent ?? "")),
    ).toBe(true);
    await userEvent.type(screen.getByTestId("goal-modal-name-input"), "Fix");
    await waitFor(() =>
      expect(
        screen
          .queryAllByRole("alert")
          .some((a) => /required/i.test(a.textContent ?? "")),
      ).toBe(false),
    );
  });
});

// ── Successful save ────────────────────────────────────────────────────────

describe("GoalModal — successful save", () => {
  it("calls onClose when Cancel is clicked", async () => {
    const onClose = vi.fn();
    renderModal(onClose);
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls addGoal with correct data and then onClose on a successful save", async () => {
    const onClose = vi.fn();
    mockAddGoal.mockResolvedValueOnce(true);
    renderModal(onClose);

    await userEvent.type(
      screen.getByTestId("goal-modal-name-input"),
      "Emergency Fund",
    );
    await userEvent.click(screen.getByTestId("goal-tile-savings_target"));
    await userEvent.type(screen.getByTestId("goal-modal-amount-input"), "5000");
    await userEvent.click(screen.getByRole("button", { name: /save goal/i }));

    await waitFor(() => {
      expect(mockAddGoal).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Emergency Fund",
          type: "savings_target",
          targetAmount: 5000,
        }),
      );
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  it("stays open and re-enables Save button on addGoal failure", async () => {
    const onClose = vi.fn();
    mockAddGoal.mockResolvedValueOnce(false);
    renderModal(onClose);

    await userEvent.type(
      screen.getByTestId("goal-modal-name-input"),
      "Fail Goal",
    );
    await userEvent.click(screen.getByTestId("goal-tile-savings_target"));
    await userEvent.type(screen.getByTestId("goal-modal-amount-input"), "1000");
    await userEvent.click(screen.getByRole("button", { name: /save goal/i }));

    await waitFor(() => {
      expect(onClose).not.toHaveBeenCalled();
      expect(
        screen.getByRole("button", { name: /save goal/i }),
      ).not.toBeDisabled();
    });
  });

  it("disables both buttons while isSubmitting and shows 'Saving…'", async () => {
    // Make addGoal hang so we can inspect the submitting state
    mockAddGoal.mockImplementationOnce(() => new Promise(() => {}));

    renderModal();

    await userEvent.type(
      screen.getByTestId("goal-modal-name-input"),
      "Test Goal",
    );
    await userEvent.click(screen.getByTestId("goal-tile-savings_target"));
    await userEvent.type(screen.getByTestId("goal-modal-amount-input"), "1000");
    await userEvent.click(screen.getByRole("button", { name: /save goal/i }));

    await waitFor(() => {
      const saveBtn = screen.getByTestId("goal-modal-save-btn");
      const cancelBtn = screen.getByRole("button", { name: /cancel/i });
      expect(saveBtn).toBeDisabled();
      expect(saveBtn.textContent).toMatch(/saving/i);
      expect(cancelBtn).toBeDisabled();
    });
  });
});
