import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFileUpload } from "./useFileUpload";
import * as storage from "../services/storage";

// ── Mock useApi ────────────────────────────────────────────────────────────

const mockApiFetch = vi.fn();
vi.mock("../lib/api", () => ({
  useApi: () => ({ apiFetch: mockApiFetch }),
  API_BASE: "",
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function makeFile(content: string, name = "statement.csv"): File {
  return new File([content], name, { type: "text/csv" });
}

const VALID_CSV =
  "Date,Description,Amount,Balance\n15/03/2024,Countdown,-85.50,1234.00\n16/03/2024,Salary,3000.00,4234.00";

const VALID_CSV_APRIL =
  "Date,Description,Amount,Balance\n01/04/2024,Power Bill,-120.00,900.00";

const MULTI_MONTH_CSV =
  "Date,Description,Amount,Balance\n" +
  "15/03/2024,Countdown,-85.50,1234.00\n" +
  "01/04/2024,Power Bill,-120.00,900.00\n" +
  "15/05/2024,Salary,3000.00,4234.00";

const EMPTY_DATA_CSV = "Date,Description,Amount,Balance\n";

const DEFAULT_ID = storage.DEFAULT_ACCOUNT_ID;

/** Returns a successful import API response. */
function mockImportSuccess(imported = 1, skipped = 0) {
  mockApiFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ imported, skipped }),
  });
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.stubEnv("VITE_ANTHROPIC_API_KEY", ""); // force instant fallback — no real API calls
});

// ── handleFile — single month ──────────────────────────────────────────────

describe("useFileUpload — handleFile", () => {
  it("POSTs to import endpoint and sets savedMonthKey when no duplicate exists", async () => {
    mockImportSuccess(2);
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(VALID_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockApiFetch).toHaveBeenCalledWith(
      `/api/accounts/${DEFAULT_ID}/transactions/import`,
      expect.objectContaining({ method: "POST" }),
    );
    expect(result.current.selectedFile?.name).toBe("statement.csv");
    expect(result.current.isDuplicate).toBe(false);
    expect(result.current.parseErrors).toHaveLength(0);
    expect(result.current.savedMonthKey).toBe("2024-03");
  });

  it("exposes importedCount and skippedCount from API response", async () => {
    mockImportSuccess(5, 1);
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(VALID_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.importedCount).toBe(5);
    expect(result.current.skippedCount).toBe(1);
  });

  it("sets isDuplicate and duplicateMonth when localStorage month already exists", async () => {
    // Seed the legacy localStorage month index to simulate a duplicate
    storage.saveTransactions(DEFAULT_ID, "2024-03", []);
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(VALID_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.isDuplicate).toBe(true);
    expect(result.current.duplicateMonth).toBe("March 2024");
  });

  it("does not call apiFetch when a duplicate is detected — waits for user choice", async () => {
    storage.saveTransactions(DEFAULT_ID, "2024-03", []);
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(VALID_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it("collects parse errors and still sets selectedFile", async () => {
    const badCsv =
      "Date,Description,Amount,Balance\nbad-date,Test,-50.00,950.00";
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(badCsv));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.parseErrors.length).toBeGreaterThan(0);
    expect(result.current.selectedFile?.name).toBe("statement.csv");
  });

  it("does not call apiFetch when CSV has no valid transactions", async () => {
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(EMPTY_DATA_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(result.current.isDuplicate).toBe(false);
  });
});

// ── handleFile — multi-month ───────────────────────────────────────────────

describe("useFileUpload — multi-month upload", () => {
  it("calls import endpoint once per month in the CSV", async () => {
    mockImportSuccess(1);
    mockImportSuccess(1);
    mockImportSuccess(1);
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(MULTI_MONTH_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockApiFetch).toHaveBeenCalledTimes(3);
  });

  it("sets savedMonthKey to the most recent month", async () => {
    mockImportSuccess(1);
    mockImportSuccess(1);
    mockImportSuccess(1);
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(MULTI_MONTH_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.savedMonthKey).toBe("2024-05");
  });

  it("sets savedMonthCount to the number of months saved", async () => {
    mockImportSuccess(1);
    mockImportSuccess(1);
    mockImportSuccess(1);
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(MULTI_MONTH_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.savedMonthCount).toBe(3);
  });

  it("sums importedCount across all months", async () => {
    mockImportSuccess(2);
    mockImportSuccess(3);
    mockImportSuccess(1);
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(MULTI_MONTH_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.importedCount).toBe(6);
  });

  it("sets isDuplicate when any localStorage month already exists", async () => {
    storage.saveTransactions(DEFAULT_ID, "2024-04", []);
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(MULTI_MONTH_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.isDuplicate).toBe(true);
  });

  it("lists all duplicate months in duplicateMonth string", async () => {
    storage.saveTransactions(DEFAULT_ID, "2024-03", []);
    storage.saveTransactions(DEFAULT_ID, "2024-05", []);
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(MULTI_MONTH_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.duplicateMonth).toContain("March 2024");
    expect(result.current.duplicateMonth).toContain("May 2024");
  });

  it("does not call apiFetch when duplicates are detected — waits for user choice", async () => {
    storage.saveTransactions(DEFAULT_ID, "2024-04", []);
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(MULTI_MONTH_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it("calls import endpoint for all months on confirmReplace (including duplicates)", async () => {
    storage.saveTransactions(DEFAULT_ID, "2024-04", []);
    mockImportSuccess(1);
    mockImportSuccess(1);
    mockImportSuccess(1);

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(MULTI_MONTH_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      result.current.confirmReplace();
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockApiFetch).toHaveBeenCalledTimes(3);
    expect(result.current.isDuplicate).toBe(false);
  });
});

// ── confirmReplace ─────────────────────────────────────────────────────────

describe("useFileUpload — confirmReplace", () => {
  it("calls import endpoint and clears isDuplicate", async () => {
    storage.saveTransactions(DEFAULT_ID, "2024-03", []);
    mockImportSuccess(2);

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(VALID_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.isDuplicate).toBe(true);

    await act(async () => {
      result.current.confirmReplace();
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockApiFetch).toHaveBeenCalledWith(
      `/api/accounts/${DEFAULT_ID}/transactions/import`,
      expect.objectContaining({ method: "POST" }),
    );
    expect(result.current.isDuplicate).toBe(false);
    expect(result.current.duplicateMonth).toBeNull();
  });
});

// ── cancelReplace ──────────────────────────────────────────────────────────

describe("useFileUpload — cancelReplace", () => {
  it("clears isDuplicate and selectedFile without calling apiFetch", async () => {
    storage.saveTransactions(DEFAULT_ID, "2024-03", []);
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(VALID_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    act(() => {
      result.current.cancelReplace();
    });

    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(result.current.isDuplicate).toBe(false);
    expect(result.current.selectedFile).toBeNull();
  });
});

// ── formatMonthKey (via duplicateMonth output) ─────────────────────────────

describe("useFileUpload — month name formatting", () => {
  it("formats the duplicate month as a human-readable name", async () => {
    storage.saveTransactions(DEFAULT_ID, "2024-04", []);
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(VALID_CSV_APRIL));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.duplicateMonth).toBe("April 2024");
  });
});

// ── per-account scoping ─────────────────────────────────────────────────────

describe("useFileUpload — per-account scoping", () => {
  const ACCOUNT_A = "account-a";
  const ACCOUNT_B = "account-b";

  it("saves without duplicate warning when the same month exists only in a different account", async () => {
    // Seed the month under account-b only
    storage.saveTransactions(ACCOUNT_B, "2024-03", []);
    mockImportSuccess(2);

    const { result } = renderHook(() =>
      useFileUpload({ accountId: ACCOUNT_A }),
    );

    await act(async () => {
      result.current.handleFile(makeFile(VALID_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.isDuplicate).toBe(false);
    expect(mockApiFetch).toHaveBeenCalledWith(
      `/api/accounts/${ACCOUNT_A}/transactions/import`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("detects a duplicate only within the same account", async () => {
    // Seed the month under account-a
    storage.saveTransactions(ACCOUNT_A, "2024-03", []);

    const { result } = renderHook(() =>
      useFileUpload({ accountId: ACCOUNT_A }),
    );

    await act(async () => {
      result.current.handleFile(makeFile(VALID_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.isDuplicate).toBe(true);
    expect(result.current.duplicateMonth).toBe("March 2024");
  });

  it("POSTs to the correct account ID URL", async () => {
    mockImportSuccess(2);

    const { result } = renderHook(() =>
      useFileUpload({ accountId: ACCOUNT_A }),
    );

    await act(async () => {
      result.current.handleFile(makeFile(VALID_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockApiFetch).toHaveBeenCalledWith(
      `/api/accounts/${ACCOUNT_A}/transactions/import`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("re-uploading the same month for a different account after switching does not trigger duplicate", async () => {
    // Account A already has 2024-04 in localStorage
    storage.saveTransactions(ACCOUNT_A, "2024-04", []);
    mockImportSuccess(1);

    // Now upload under account B — no duplicate expected
    const { result } = renderHook(() =>
      useFileUpload({ accountId: ACCOUNT_B }),
    );

    await act(async () => {
      result.current.handleFile(makeFile(VALID_CSV_APRIL));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.isDuplicate).toBe(false);
  });
});
