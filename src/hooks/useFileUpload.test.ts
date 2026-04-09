import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFileUpload } from "./useFileUpload";
import * as storage from "../services/storage";

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

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.stubEnv("VITE_ANTHROPIC_API_KEY", ""); // force instant fallback — no real API calls in hook tests
});

// ── handleFile — single month ──────────────────────────────────────────────

describe("useFileUpload — handleFile", () => {
  it("parses the file and saves transactions when no duplicate exists", async () => {
    const saveSpy = vi.spyOn(storage, "saveTransactions");
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(VALID_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(saveSpy).toHaveBeenCalledWith("2024-03", expect.any(Array));
    expect(result.current.selectedFile?.name).toBe("statement.csv");
    expect(result.current.isDuplicate).toBe(false);
    expect(result.current.parseErrors).toHaveLength(0);
  });

  it("sets isDuplicate and duplicateMonth when month already exists", async () => {
    storage.saveTransactions("2024-03", []);
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(VALID_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.isDuplicate).toBe(true);
    expect(result.current.duplicateMonth).toBe("March 2024");
  });

  it("does not save when a duplicate is detected — waits for user choice", async () => {
    storage.saveTransactions("2024-03", []);
    const saveSpy = vi.spyOn(storage, "saveTransactions");
    saveSpy.mockClear();

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(VALID_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(saveSpy).not.toHaveBeenCalled();
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

  it("does not save when CSV has no valid transactions", async () => {
    const saveSpy = vi.spyOn(storage, "saveTransactions");
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(EMPTY_DATA_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(saveSpy).not.toHaveBeenCalled();
    expect(result.current.isDuplicate).toBe(false);
  });
});

// ── handleFile — multi-month ───────────────────────────────────────────────

describe("useFileUpload — multi-month upload", () => {
  it("saves a separate entry for each month in the CSV", async () => {
    const saveSpy = vi.spyOn(storage, "saveTransactions");
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(MULTI_MONTH_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(saveSpy).toHaveBeenCalledWith("2024-03", expect.any(Array));
    expect(saveSpy).toHaveBeenCalledWith("2024-04", expect.any(Array));
    expect(saveSpy).toHaveBeenCalledWith("2024-05", expect.any(Array));
    expect(saveSpy).toHaveBeenCalledTimes(3);
  });

  it("sets savedMonthKey to the most recent month", async () => {
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(MULTI_MONTH_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.savedMonthKey).toBe("2024-05");
  });

  it("sets savedMonthCount to the number of months saved", async () => {
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(MULTI_MONTH_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.savedMonthCount).toBe(3);
  });

  it("sets isDuplicate when any month already exists", async () => {
    storage.saveTransactions("2024-04", []);
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(MULTI_MONTH_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.isDuplicate).toBe(true);
  });

  it("lists all duplicate months in duplicateMonth string", async () => {
    storage.saveTransactions("2024-03", []);
    storage.saveTransactions("2024-05", []);
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(MULTI_MONTH_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.duplicateMonth).toContain("March 2024");
    expect(result.current.duplicateMonth).toContain("May 2024");
  });

  it("does not save any month when duplicates are detected — waits for user choice", async () => {
    storage.saveTransactions("2024-04", []);
    const saveSpy = vi.spyOn(storage, "saveTransactions");
    saveSpy.mockClear();

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(MULTI_MONTH_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(saveSpy).not.toHaveBeenCalled();
  });

  it("saves all months on confirmReplace (including duplicates)", async () => {
    storage.saveTransactions("2024-04", []);
    const saveSpy = vi.spyOn(storage, "saveTransactions");
    saveSpy.mockClear();

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(MULTI_MONTH_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      result.current.confirmReplace();
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(saveSpy).toHaveBeenCalledWith("2024-03", expect.any(Array));
    expect(saveSpy).toHaveBeenCalledWith("2024-04", expect.any(Array));
    expect(saveSpy).toHaveBeenCalledWith("2024-05", expect.any(Array));
    expect(result.current.isDuplicate).toBe(false);
  });
});

// ── confirmReplace ─────────────────────────────────────────────────────────

describe("useFileUpload — confirmReplace", () => {
  it("saves the pending transactions and clears isDuplicate", async () => {
    storage.saveTransactions("2024-03", []);
    const saveSpy = vi.spyOn(storage, "saveTransactions");
    saveSpy.mockClear();

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

    expect(saveSpy).toHaveBeenCalledWith("2024-03", expect.any(Array));
    expect(result.current.isDuplicate).toBe(false);
    expect(result.current.duplicateMonth).toBeNull();
  });
});

// ── cancelReplace ──────────────────────────────────────────────────────────

describe("useFileUpload — cancelReplace", () => {
  it("clears isDuplicate and selectedFile without saving", async () => {
    storage.saveTransactions("2024-03", []);
    const saveSpy = vi.spyOn(storage, "saveTransactions");
    saveSpy.mockClear();

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(VALID_CSV));
      await new Promise((r) => setTimeout(r, 50));
    });

    act(() => {
      result.current.cancelReplace();
    });

    expect(saveSpy).not.toHaveBeenCalled();
    expect(result.current.isDuplicate).toBe(false);
    expect(result.current.selectedFile).toBeNull();
  });
});

// ── formatMonthKey (via duplicateMonth output) ─────────────────────────────

describe("useFileUpload — month name formatting", () => {
  it("formats the duplicate month as a human-readable name", async () => {
    storage.saveTransactions("2024-04", []);
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(VALID_CSV_APRIL));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.duplicateMonth).toBe("April 2024");
  });
});
