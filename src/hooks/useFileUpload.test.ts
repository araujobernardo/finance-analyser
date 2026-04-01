import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFileUpload } from './useFileUpload';
import * as storage from '../services/storage';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeFile(content: string, name = 'statement.csv'): File {
  return new File([content], name, { type: 'text/csv' });
}

const VALID_CSV =
  'Date,Description,Amount,Balance\n15/03/2024,Countdown,-85.50,1234.00\n16/03/2024,Salary,3000.00,4234.00';

const VALID_CSV_APRIL =
  'Date,Description,Amount,Balance\n01/04/2024,Power Bill,-120.00,900.00';

const EMPTY_DATA_CSV = 'Date,Description,Amount,Balance\n';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

// ── handleFile — happy path ────────────────────────────────────────────────

describe('useFileUpload — handleFile', () => {
  it('parses the file and saves transactions when no duplicate exists', async () => {
    const saveSpy = vi.spyOn(storage, 'saveTransactions');
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(VALID_CSV));
      await new Promise(r => setTimeout(r, 50));
    });

    expect(saveSpy).toHaveBeenCalledWith('2024-03', expect.any(Array));
    expect(result.current.selectedFile?.name).toBe('statement.csv');
    expect(result.current.isDuplicate).toBe(false);
    expect(result.current.parseErrors).toHaveLength(0);
  });

  it('sets isDuplicate and duplicateMonth when month already exists', async () => {
    storage.saveTransactions('2024-03', []);
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(VALID_CSV));
      await new Promise(r => setTimeout(r, 50));
    });

    expect(result.current.isDuplicate).toBe(true);
    expect(result.current.duplicateMonth).toBe('March 2024');
  });

  it('does not save when a duplicate is detected — waits for user choice', async () => {
    storage.saveTransactions('2024-03', []);
    const saveSpy = vi.spyOn(storage, 'saveTransactions');
    saveSpy.mockClear();

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(VALID_CSV));
      await new Promise(r => setTimeout(r, 50));
    });

    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('collects parse errors and still sets selectedFile', async () => {
    const badCsv = 'Date,Description,Amount,Balance\nbad-date,Test,-50.00,950.00';
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(badCsv));
      await new Promise(r => setTimeout(r, 50));
    });

    expect(result.current.parseErrors.length).toBeGreaterThan(0);
    expect(result.current.selectedFile?.name).toBe('statement.csv');
  });

  it('does not save when CSV has no valid transactions', async () => {
    const saveSpy = vi.spyOn(storage, 'saveTransactions');
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(EMPTY_DATA_CSV));
      await new Promise(r => setTimeout(r, 50));
    });

    expect(saveSpy).not.toHaveBeenCalled();
    expect(result.current.isDuplicate).toBe(false);
  });
});

// ── confirmReplace ─────────────────────────────────────────────────────────

describe('useFileUpload — confirmReplace', () => {
  it('saves the pending transactions and clears isDuplicate', async () => {
    storage.saveTransactions('2024-03', []);
    const saveSpy = vi.spyOn(storage, 'saveTransactions');
    saveSpy.mockClear();

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(VALID_CSV));
      await new Promise(r => setTimeout(r, 50));
    });

    expect(result.current.isDuplicate).toBe(true);

    act(() => { result.current.confirmReplace(); });

    expect(saveSpy).toHaveBeenCalledWith('2024-03', expect.any(Array));
    expect(result.current.isDuplicate).toBe(false);
    expect(result.current.duplicateMonth).toBeNull();
  });
});

// ── cancelReplace ──────────────────────────────────────────────────────────

describe('useFileUpload — cancelReplace', () => {
  it('clears isDuplicate and selectedFile without saving', async () => {
    storage.saveTransactions('2024-03', []);
    const saveSpy = vi.spyOn(storage, 'saveTransactions');
    saveSpy.mockClear();

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(VALID_CSV));
      await new Promise(r => setTimeout(r, 50));
    });

    act(() => { result.current.cancelReplace(); });

    expect(saveSpy).not.toHaveBeenCalled();
    expect(result.current.isDuplicate).toBe(false);
    expect(result.current.selectedFile).toBeNull();
  });
});

// ── formatMonthKey (via duplicateMonth output) ─────────────────────────────

describe('useFileUpload — month name formatting', () => {
  it('formats the duplicate month as a human-readable name', async () => {
    storage.saveTransactions('2024-04', []);
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      result.current.handleFile(makeFile(VALID_CSV_APRIL));
      await new Promise(r => setTimeout(r, 50));
    });

    expect(result.current.duplicateMonth).toBe('April 2024');
  });
});
