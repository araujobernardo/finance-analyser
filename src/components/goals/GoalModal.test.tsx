import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GoalModal } from "./GoalModal";
import { GoalsProvider } from "../../context/GoalsContext";
import { AccountProvider } from "../../context/AccountContext";
import type { ApiGoal } from "../../types/api";

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

// mockAddGoal / mockUpdateGoal intercept context calls without going through the real context
const mockAddGoal = vi.fn();
const mockUpdateGoal = vi.fn();

vi.mock("../../context/GoalsContext", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../../context/GoalsContext")>();
  return {
    ...original,
    useGoals: () => ({
      goals: [],
      isLoading: false,
      addGoal: mockAddGoal,
      updateGoal: mockUpdateGoal,
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

/** Minimal ApiGoal fixture for edit-mode tests */
const MOCK_GOAL: ApiGoal = {
  id: "goal-123",
  userId: "user-1",
  name: "Emergency Fund",
  type: "savings_target",
  targetAmount: "20000",
  targetDate: "2026-12-31",
  linkedAccountId: null,
  categoryName: null,
  currentAmount: "8000",
  status: "active",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

function renderEditModal(goal: ApiGoal = MOCK_GOAL, onClose = vi.fn()) {
  return render(
    <AccountProvider>
      <GoalsProvider>
        <GoalModal onClose={onClose} goal={goal} />
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
  // Default: addGoal and updateGoal resolve to true (success)
  mockAddGoal.mockResolvedValue(true);
  mockUpdateGoal.mockResolvedValue(true);
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

  it("#898: shows account error for savings_target when accounts exist but none selected", async () => {
    // Override mock to return one account so validation triggers
    mockApiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        accounts: [
          {
            id: "acct-1",
            nickname: "Main",
            accountType: "Checking",
            colour: "#aaa",
            userId: "u1",
            createdAt: "2026-01-01T00:00:00Z",
          },
        ],
        goals: [],
      }),
    });
    renderModal();
    await userEvent.type(
      screen.getByTestId("goal-modal-name-input"),
      "My Savings",
    );
    await userEvent.click(screen.getByTestId("goal-tile-savings_target"));
    await userEvent.type(screen.getByTestId("goal-modal-amount-input"), "5000");
    await userEvent.click(screen.getByRole("button", { name: /save goal/i }));
    await waitFor(() => {
      const alerts = screen.queryAllByRole("alert");
      expect(
        alerts.some((a) => /select an account/i.test(a.textContent ?? "")),
      ).toBe(true);
    });
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

// ── Edit mode ──────────────────────────────────────────────────────────────

describe("GoalModal — edit mode render", () => {
  it('renders "Edit Goal" heading when goal prop is provided', () => {
    renderEditModal();
    expect(
      screen.getByRole("heading", { name: /edit goal/i }),
    ).toBeInTheDocument();
  });

  it('shows "Editing: [goal name]" subtitle instead of step indicator', () => {
    renderEditModal();
    expect(screen.getByText(/editing: emergency fund/i)).toBeInTheDocument();
    expect(screen.queryByText(/step 1 of 2/i)).not.toBeInTheDocument();
  });

  it("pre-populates the name field from the goal prop", () => {
    renderEditModal();
    const nameInput = screen.getByTestId(
      "goal-modal-name-input",
    ) as HTMLInputElement;
    expect(nameInput.value).toBe("Emergency Fund");
  });

  it("pre-populates the target amount field from the goal prop", () => {
    renderEditModal();
    const amountInput = screen.getByTestId(
      "goal-modal-amount-input",
    ) as HTMLInputElement;
    expect(amountInput.value).toBe("20000");
  });

  it("pre-populates the currentAmount field from the goal prop", () => {
    renderEditModal();
    const currentInput = screen.getByTestId(
      "goal-modal-current-amount-input",
    ) as HTMLInputElement;
    expect(currentInput.value).toBe("8000");
  });

  it("shows the currentAmount field in edit mode", () => {
    renderEditModal();
    expect(
      screen.getByTestId("goal-modal-current-amount-field"),
    ).toBeInTheDocument();
  });

  it("does NOT show currentAmount field in add mode", () => {
    renderModal();
    expect(
      screen.queryByTestId("goal-modal-current-amount-field"),
    ).not.toBeInTheDocument();
  });

  it("adaptive fields are immediately visible in edit mode (no step-gate)", () => {
    renderEditModal();
    expect(screen.getByTestId("goal-modal-adaptive").className).toContain(
      "goal-modal__adaptive--visible",
    );
  });

  it("selected tile is highlighted when pre-populated from goal prop", () => {
    renderEditModal();
    expect(screen.getByTestId("goal-tile-savings_target").className).toContain(
      "goal-modal__tile--selected",
    );
  });

  it("shows Save Changes button instead of Save Goal in edit mode", () => {
    renderEditModal();
    expect(
      screen.getByRole("button", { name: /save changes/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /save goal/i }),
    ).not.toBeInTheDocument();
  });
});

describe("GoalModal — edit mode save", () => {
  it("calls updateGoal (not addGoal) with correct data on save", async () => {
    const onClose = vi.fn();
    renderEditModal(MOCK_GOAL, onClose);

    // Change the name
    const nameInput = screen.getByTestId("goal-modal-name-input");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Updated Fund");

    await userEvent.click(
      screen.getByRole("button", { name: /save changes/i }),
    );

    await waitFor(() => {
      expect(mockUpdateGoal).toHaveBeenCalledWith(
        "goal-123",
        expect.objectContaining({
          name: "Updated Fund",
          type: "savings_target",
          targetAmount: 20000,
          currentAmount: 8000,
        }),
      );
      expect(mockAddGoal).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  it("passes null for currentAmount when the field is cleared", async () => {
    const onClose = vi.fn();
    renderEditModal(MOCK_GOAL, onClose);

    const currentInput = screen.getByTestId("goal-modal-current-amount-input");
    await userEvent.clear(currentInput);

    await userEvent.click(
      screen.getByRole("button", { name: /save changes/i }),
    );

    await waitFor(() => {
      expect(mockUpdateGoal).toHaveBeenCalledWith(
        "goal-123",
        expect.objectContaining({ currentAmount: null }),
      );
    });
  });

  it("stays open when updateGoal returns false", async () => {
    const onClose = vi.fn();
    mockUpdateGoal.mockResolvedValueOnce(false);
    renderEditModal(MOCK_GOAL, onClose);

    await userEvent.click(
      screen.getByRole("button", { name: /save changes/i }),
    );

    await waitFor(() => {
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});

describe("GoalModal — edit mode category field (spending_limit)", () => {
  it("shows category field pre-populated when goal type is spending_limit", () => {
    const spendingGoal = {
      ...MOCK_GOAL,
      type: "spending_limit" as const,
      categoryName: "Dining",
      targetAmount: "500",
      currentAmount: null,
    };
    renderEditModal(spendingGoal);
    const catField = screen.getByTestId("goal-modal-category-field");
    expect(catField.className).toContain("goal-modal__category--visible");
    const catInput = screen.getByTestId(
      "goal-modal-category-input",
    ) as HTMLInputElement;
    expect(catInput.value).toBe("Dining");
  });

  it("hides category field when switching away from spending_limit in edit mode", async () => {
    const spendingGoal = {
      ...MOCK_GOAL,
      type: "spending_limit" as const,
      categoryName: "Dining",
      targetAmount: "500",
      currentAmount: null,
    };
    renderEditModal(spendingGoal);
    await userEvent.click(screen.getByTestId("goal-tile-savings_target"));
    expect(
      screen.getByTestId("goal-modal-category-field").className,
    ).not.toContain("goal-modal__category--visible");
  });
});
