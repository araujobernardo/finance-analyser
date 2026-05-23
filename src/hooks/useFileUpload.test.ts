import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFileUpload } from "./useFileUpload";

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

const DEFAULT_ID = "test-account-id";

/** Returns a successful import API response. */
function mockImportSuccess(imported = 1, skipped = 0) {
  mockApiFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ imported, skipped }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_ANTHROPIC_API_KEY", ""); // force instant fallback — no real API calls
});

// ── handleFile — single month ──────────────────────────────────────────────

describe("useFileUpload — handleFile", () => {
  it("POSTs to import endpoint and sets savedMonthKey when no duplicate exists", async () => {
    mockImportSuccess(2);
    const { result } = renderHook(() =>
      useFileUpload({ accountId: DEFAULT_ID }),
    );

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
    const { result } = renderHook(() =>
      useFileUpload({ accountId: DEFAULT_ID }),
    );

    await act(async () => {
      result.current.handleFile(makeFile(VALID_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.importedCount).toBe(5);
    expect(result.current.skippedCount).toBe(1);
  });

  it("isDuplicate is always false — localStorage duplicate detection removed in T013", async () => {
    // storage.ts deleted: duplicate detection is now API-based (FA-MIGR-002).
    // isDuplicate is always false; uploads proceed immediately.
    mockImportSuccess(2);
    const { result } = renderHook(() =>
      useFileUpload({ accountId: DEFAULT_ID }),
    );

    await act(async () => {
      result.current.handleFile(makeFile(VALID_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.isDuplicate).toBe(false);
    expect(result.current.duplicateMonth).toBeNull();
  });

  it("always calls apiFetch immediately — no duplicate-wait state", async () => {
    mockImportSuccess(2);
    const { result } = renderHook(() =>
      useFileUpload({ accountId: DEFAULT_ID }),
    );

    await act(async () => {
      result.current.handleFile(makeFile(VALID_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockApiFetch).toHaveBeenCalledTimes(1);
  });

  it("collects parse errors and still sets selectedFile", async () => {
    const badCsv =
      "Date,Description,Amount,Balance\nbad-date,Test,-50.00,950.00";
    const { result } = renderHook(() =>
      useFileUpload({ accountId: DEFAULT_ID }),
    );

    await act(async () => {
      result.current.handleFile(makeFile(badCsv));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.parseErrors.length).toBeGreaterThan(0);
    expect(result.current.selectedFile?.name).toBe("statement.csv");
  });

  it("does not call apiFetch when CSV has no valid transactions", async () => {
    const { result } = renderHook(() =>
      useFileUpload({ accountId: DEFAULT_ID }),
    );

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
    const { result } = renderHook(() =>
      useFileUpload({ accountId: DEFAULT_ID }),
    );

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
    const { result } = renderHook(() =>
      useFileUpload({ accountId: DEFAULT_ID }),
    );

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
    const { result } = renderHook(() =>
      useFileUpload({ accountId: DEFAULT_ID }),
    );

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
    const { result } = renderHook(() =>
      useFileUpload({ accountId: DEFAULT_ID }),
    );

    await act(async () => {
      result.current.handleFile(makeFile(MULTI_MONTH_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.importedCount).toBe(6);
  });

  it("isDuplicate is always false for multi-month uploads — no localStorage check", async () => {
    // storage.ts deleted: all months upload immediately, no duplicate detection.
    mockImportSuccess(1);
    mockImportSuccess(1);
    mockImportSuccess(1);
    const { result } = renderHook(() =>
      useFileUpload({ accountId: DEFAULT_ID }),
    );

    await act(async () => {
      result.current.handleFile(makeFile(MULTI_MONTH_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.isDuplicate).toBe(false);
    expect(result.current.duplicateMonth).toBeNull();
  });
});

// ── confirmReplace ─────────────────────────────────────────────────────────

describe("useFileUpload — confirmReplace", () => {
  it("is a no-op — duplicate detection removed in T013", () => {
    // confirmReplace is kept for interface compatibility but does nothing.
    const { result } = renderHook(() => useFileUpload());
    // Should not throw
    act(() => {
      result.current.confirmReplace();
    });
    expect(result.current.isDuplicate).toBe(false);
  });
});

// ── cancelReplace ──────────────────────────────────────────────────────────

describe("useFileUpload — cancelReplace", () => {
  it("clears selectedFile without calling apiFetch", async () => {
    mockImportSuccess(2);
    const { result } = renderHook(() =>
      useFileUpload({ accountId: DEFAULT_ID }),
    );

    await act(async () => {
      result.current.handleFile(makeFile(VALID_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    act(() => {
      result.current.cancelReplace();
    });

    expect(result.current.isDuplicate).toBe(false);
    expect(result.current.selectedFile).toBeNull();
  });
});

// ── duplicateMonth (always null now) ─────────────────────────────────────────

describe("useFileUpload — duplicateMonth", () => {
  it("is always null — localStorage duplicate detection removed in T013", async () => {
    mockImportSuccess(1);
    const { result } = renderHook(() =>
      useFileUpload({ accountId: DEFAULT_ID }),
    );

    await act(async () => {
      result.current.handleFile(makeFile(VALID_CSV_APRIL));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.duplicateMonth).toBeNull();
  });
});

// ── per-account scoping ─────────────────────────────────────────────────────

describe("useFileUpload — per-account scoping", () => {
  const ACCOUNT_A = "account-a";

  it("POSTs to the correct account ID URL when accountId is provided", async () => {
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
});

// ── uploadError — no accountId ─────────────────────────────────────────────

describe("useFileUpload — uploadError when no accountId", () => {
  it("sets uploadError and does not call apiFetch when accountId is undefined", async () => {
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(VALID_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(result.current.uploadError).toBeTruthy();
    expect(result.current.uploadError).toContain("select a specific account");
  });

  it("uploadError is null when accountId is provided and upload succeeds", async () => {
    mockImportSuccess(2);
    const { result } = renderHook(() =>
      useFileUpload({ accountId: DEFAULT_ID }),
    );

    await act(async () => {
      result.current.handleFile(makeFile(VALID_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.uploadError).toBeNull();
  });
});

// ── uploadError — HTTP error ───────────────────────────────────────────────

describe("useFileUpload — uploadError on HTTP failure", () => {
  it("sets uploadError (not skippedCount) when API returns non-ok response", async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => "Account not found",
    });
    const { result } = renderHook(() =>
      useFileUpload({ accountId: DEFAULT_ID }),
    );

    await act(async () => {
      result.current.handleFile(makeFile(VALID_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.uploadError).toBeTruthy();
    expect(result.current.uploadError).toContain("Upload failed");
    // skippedCount must NOT be inflated by the HTTP error
    expect(result.current.skippedCount).toBe(0);
  });
});
