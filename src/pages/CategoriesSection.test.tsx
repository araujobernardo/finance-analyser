import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CategoriesSection } from "./SettingsPage";

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

function mockOkResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function mockErrorResponse(status = 500): Response {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({ error: "Server error" }),
  } as unknown as Response;
}

const CATEGORY_A = {
  id: "cat-1",
  userId: "user-1",
  name: "Groceries",
  colour: "#ff0000",
  createdAt: "2026-01-01T00:00:00Z",
};

const CATEGORY_B = {
  id: "cat-2",
  userId: "user-1",
  name: "Transport",
  colour: "#00ff00",
  createdAt: "2026-01-02T00:00:00Z",
};

function renderSection() {
  return render(<CategoriesSection />);
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("CategoriesSection — rendering (#769)", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockApiFetch.mockResolvedValue(
      mockOkResponse({ categories: [CATEGORY_A, CATEGORY_B] }),
    );
  });

  it("renders the Categories section heading", async () => {
    renderSection();
    expect(await screen.findByText("Categories")).toBeInTheDocument();
  });

  it("renders a list item for each category", async () => {
    renderSection();
    expect(await screen.findByTestId("categories-list")).toBeInTheDocument();
    expect(
      screen.getByTestId(`category-name-${CATEGORY_A.id}`),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`category-name-${CATEGORY_B.id}`),
    ).toBeInTheDocument();
  });

  it("shows empty state when no categories exist", async () => {
    mockApiFetch.mockResolvedValue(mockOkResponse({ categories: [] }));
    renderSection();
    expect(await screen.findByTestId("categories-empty")).toBeInTheDocument();
    expect(screen.getByTestId("categories-empty").textContent).toMatch(
      /no categories/i,
    );
  });

  it("renders the add-category form", async () => {
    renderSection();
    await screen.findByTestId("categories-list");
    expect(screen.getByTestId("category-new-name")).toBeInTheDocument();
    expect(screen.getByTestId("category-add-btn")).toBeInTheDocument();
  });
});

describe("CategoriesSection — add category (#769)", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockApiFetch.mockImplementation((_url: string, opts?: RequestInit) => {
      if (opts?.method === "POST") {
        return Promise.resolve(
          mockOkResponse({
            id: "cat-new",
            userId: "user-1",
            name: "Dining",
            colour: "#6366f1",
            createdAt: "2026-01-03T00:00:00Z",
          }),
        );
      }
      return Promise.resolve(mockOkResponse({ categories: [CATEGORY_A] }));
    });
  });

  it("calls POST /api/categories when Add is clicked with a name", async () => {
    const user = userEvent.setup();
    renderSection();
    await screen.findByTestId("categories-list");

    await user.type(screen.getByTestId("category-new-name"), "Dining");
    await user.click(screen.getByTestId("category-add-btn"));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/categories",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"name":"Dining"'),
        }),
      );
    });
  });

  it("adds the new category to the list after successful POST", async () => {
    const user = userEvent.setup();
    renderSection();
    await screen.findByTestId("categories-list");

    await user.type(screen.getByTestId("category-new-name"), "Dining");
    await user.click(screen.getByTestId("category-add-btn"));

    expect(await screen.findByDisplayValue("Dining")).toBeInTheDocument();
  });

  it("shows an error when Add is clicked with an empty name", async () => {
    const user = userEvent.setup();
    renderSection();
    await screen.findByTestId("categories-list");

    await user.click(screen.getByTestId("category-add-btn"));

    expect(await screen.findByTestId("category-add-error")).toBeInTheDocument();
  });

  it("shows an error when the server returns an error response", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockImplementation((_url: string, opts?: RequestInit) => {
      if (opts?.method === "POST")
        return Promise.resolve(mockErrorResponse(400));
      return Promise.resolve(mockOkResponse({ categories: [] }));
    });
    renderSection();
    await screen.findByTestId("categories-empty");

    await user.type(screen.getByTestId("category-new-name"), "Bad");
    await user.click(screen.getByTestId("category-add-btn"));

    expect(await screen.findByTestId("category-add-error")).toBeInTheDocument();
  });
});

describe("CategoriesSection — delete category (#769)", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockApiFetch.mockImplementation((_url: string, opts?: RequestInit) => {
      if (opts?.method === "DELETE") {
        return Promise.resolve({
          ok: true,
          status: 204,
        } as unknown as Response);
      }
      return Promise.resolve(
        mockOkResponse({ categories: [CATEGORY_A, CATEGORY_B] }),
      );
    });
  });

  it("removes a category from the list when delete is clicked", async () => {
    const user = userEvent.setup();
    renderSection();
    await screen.findByTestId("categories-list");

    await user.click(screen.getByTestId(`category-delete-${CATEGORY_A.id}`));

    await waitFor(() => {
      expect(
        screen.queryByTestId(`category-name-${CATEGORY_A.id}`),
      ).not.toBeInTheDocument();
    });
  });

  it("keeps other categories when one is deleted", async () => {
    const user = userEvent.setup();
    renderSection();
    await screen.findByTestId("categories-list");

    await user.click(screen.getByTestId(`category-delete-${CATEGORY_A.id}`));

    await waitFor(() => {
      expect(
        screen.getByTestId(`category-name-${CATEGORY_B.id}`),
      ).toBeInTheDocument();
    });
  });
});

describe("CategoriesSection — rename category (#769)", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockApiFetch.mockImplementation((_url: string, opts?: RequestInit) => {
      if (opts?.method === "PATCH") {
        return Promise.resolve(
          mockOkResponse({ ...CATEGORY_A, name: "Food & Drink" }),
        );
      }
      return Promise.resolve(mockOkResponse({ categories: [CATEGORY_A] }));
    });
  });

  it("calls PATCH /api/categories/:id when a name input is blurred with a changed value", async () => {
    const user = userEvent.setup();
    renderSection();
    const nameInput = await screen.findByTestId(
      `category-name-${CATEGORY_A.id}`,
    );

    await user.tripleClick(nameInput);
    await user.type(nameInput, "Food & Drink");
    await user.tab();

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        `/api/categories/${CATEGORY_A.id}`,
        expect.objectContaining({ method: "PATCH" }),
      );
    });
  });
});
