export interface Transaction {
  date: Date;
  description: string;
  amount: number;
  balance?: number; // present in legacy format; absent in NZ bank format
  category?: string; // assigned by auto-categorisation; overridable by user
}

export interface ParseResult {
  transactions: Transaction[];
  errors: ParseError[];
}

export interface ParseError {
  row: number;
  message: string;
  raw: string;
}

/**
 * Parses a CSV exported from a NZ bank, legacy flat format, or credit card
 * statement (e.g. ANZ/ASB Visa Platinum).
 *
 * Legacy format (flat):
 *   Columns: Date, Description, Amount, Balance
 *   Date:    DD/MM/YYYY
 *
 * NZ bank format (e.g. Westpac NZ):
 *   6 metadata lines, then:
 *   Columns: Date, Unique Id, Tran Type, Cheque Number, Payee, Memo, Amount
 *   Date:    YYYY/MM/DD
 *   Description is built from Payee + Memo (non-empty parts joined by a space).
 *
 * Credit card format (e.g. ANZ Visa):
 *   Metadata lines, then:
 *   Columns: Date Processed, Date of Transaction, Unique Id, Tran Type,
 *            Reference, Description, Amount
 *   Date:    YYYY/MM/DD  (Date of Transaction is used)
 *   Amounts: positive = debit (expense), negative = credit (income) — inverted
 *            on import so expenses become negative and income positive.
 *
 * Format is auto-detected from column headers.
 */
export function parseCsv(csvText: string): ParseResult {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    return {
      transactions: [],
      errors: [{ row: 0, message: "File is empty.", raw: "" }],
    };
  }

  // ── Find header line ──────────────────────────────────────────────────────
  // The first line whose columns contain a recognised date column name is the
  // header row — everything before it is metadata.

  const DATE_COLS = new Set(["date", "date processed", "date of transaction"]);

  let headerLineIndex = -1;
  let headers: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const cols = lines[i]
      .split(",")
      .map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
    if (cols.some((c) => DATE_COLS.has(c))) {
      headerLineIndex = i;
      headers = cols;
      break;
    }
  }

  if (headerLineIndex === -1) {
    return {
      transactions: [],
      errors: [
        {
          row: 1,
          message:
            "Unrecognised file format: no column header row found. " +
            "Expected a CSV with a Date (or Date of Transaction) column.",
          raw: lines[0],
        },
      ],
    };
  }

  // ── Detect format ─────────────────────────────────────────────────────────

  const isNzFormat = headers.includes("payee") || headers.includes("memo");
  const isCreditCardFormat =
    headers.includes("tran type") &&
    headers.includes("description") &&
    headers.includes("date of transaction");

  if (isNzFormat) {
    return parseNzFormat(lines, headerLineIndex, headers);
  }
  if (isCreditCardFormat) {
    return parseCreditCardFormat(lines, headerLineIndex, headers);
  }
  return parseLegacyFormat(lines, headerLineIndex, headers);
}

// ── Legacy format ─────────────────────────────────────────────────────────────

const LEGACY_REQUIRED = ["date", "description", "amount", "balance"];

function parseLegacyFormat(
  lines: string[],
  headerLineIndex: number,
  headers: string[],
): ParseResult {
  const transactions: Transaction[] = [];
  const errors: ParseError[] = [];

  const missing = LEGACY_REQUIRED.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return {
      transactions,
      errors: [
        {
          row: headerLineIndex + 1,
          message: `Missing required columns: ${missing.join(", ")}. Found: ${headers.join(", ")}`,
          raw: lines[headerLineIndex],
        },
      ],
    };
  }

  const dateIdx = headers.indexOf("date");
  const descriptionIdx = headers.indexOf("description");
  const amountIdx = headers.indexOf("amount");
  const balanceIdx = headers.indexOf("balance");

  for (let i = headerLineIndex + 1; i < lines.length; i++) {
    const rowNumber = i + 1;
    const raw = lines[i];
    const cols = splitCsvRow(raw);

    if (cols.length < LEGACY_REQUIRED.length) {
      errors.push({
        row: rowNumber,
        message: `Expected at least 4 columns, found ${cols.length}.`,
        raw,
      });
      continue;
    }

    const rawDate = cols[dateIdx].trim();
    const rawDescription = cols[descriptionIdx].trim();
    const rawAmount = cols[amountIdx].trim();
    const rawBalance = cols[balanceIdx].trim();

    const date = parseDdMmYyyy(rawDate);
    if (date === null) {
      errors.push({
        row: rowNumber,
        message: `Invalid date "${rawDate}". Expected DD/MM/YYYY.`,
        raw,
      });
      continue;
    }

    if (rawDescription === "") {
      errors.push({ row: rowNumber, message: "Description is empty.", raw });
      continue;
    }

    const amount = parseNumber(rawAmount);
    if (amount === null) {
      errors.push({
        row: rowNumber,
        message: `Invalid amount "${rawAmount}".`,
        raw,
      });
      continue;
    }

    const balance = parseNumber(rawBalance);
    if (balance === null) {
      errors.push({
        row: rowNumber,
        message: `Invalid balance "${rawBalance}".`,
        raw,
      });
      continue;
    }

    transactions.push({ date, description: rawDescription, amount, balance });
  }

  return { transactions, errors };
}

// ── NZ bank format ────────────────────────────────────────────────────────────

const NZ_REQUIRED = ["date", "amount"];

function parseNzFormat(
  lines: string[],
  headerLineIndex: number,
  headers: string[],
): ParseResult {
  const transactions: Transaction[] = [];
  const errors: ParseError[] = [];

  const missing = NZ_REQUIRED.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return {
      transactions,
      errors: [
        {
          row: headerLineIndex + 1,
          message: `Missing required columns: ${missing.join(", ")}. Found: ${headers.join(", ")}`,
          raw: lines[headerLineIndex],
        },
      ],
    };
  }

  const dateIdx = headers.indexOf("date");
  const amountIdx = headers.indexOf("amount");
  const payeeIdx = headers.indexOf("payee"); // -1 if absent
  const memoIdx = headers.indexOf("memo"); // -1 if absent

  const minCols = Math.max(dateIdx, amountIdx, payeeIdx, memoIdx) + 1;

  for (let i = headerLineIndex + 1; i < lines.length; i++) {
    const rowNumber = i + 1;
    const raw = lines[i];
    const cols = splitCsvRow(raw);

    if (cols.length < minCols) {
      errors.push({
        row: rowNumber,
        message: `Expected at least ${minCols} columns, found ${cols.length}.`,
        raw,
      });
      continue;
    }

    const rawDate = cols[dateIdx].trim();
    const rawAmount = cols[amountIdx].trim();
    const payee = payeeIdx >= 0 ? cols[payeeIdx].trim() : "";
    const memo = memoIdx >= 0 ? cols[memoIdx].trim() : "";

    const date = parseYyyyMmDd(rawDate);
    if (date === null) {
      errors.push({
        row: rowNumber,
        message: `Invalid date "${rawDate}". Expected YYYY/MM/DD.`,
        raw,
      });
      continue;
    }

    const description = [payee, memo].filter((s) => s !== "").join(" ");
    if (description === "") {
      errors.push({ row: rowNumber, message: "Description is empty.", raw });
      continue;
    }

    const amount = parseNumber(rawAmount);
    if (amount === null) {
      errors.push({
        row: rowNumber,
        message: `Invalid amount "${rawAmount}".`,
        raw,
      });
      continue;
    }

    transactions.push({ date, description, amount });
  }

  return { transactions, errors };
}

// ── Credit card format ────────────────────────────────────────────────────────

const CC_REQUIRED = ["date of transaction", "description", "amount"];

function parseCreditCardFormat(
  lines: string[],
  headerLineIndex: number,
  headers: string[],
): ParseResult {
  const transactions: Transaction[] = [];
  const errors: ParseError[] = [];

  const missing = CC_REQUIRED.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return {
      transactions,
      errors: [
        {
          row: headerLineIndex + 1,
          message: `Missing required columns: ${missing.join(", ")}. Found: ${headers.join(", ")}`,
          raw: lines[headerLineIndex],
        },
      ],
    };
  }

  const dateIdx = headers.indexOf("date of transaction");
  const descIdx = headers.indexOf("description");
  const amountIdx = headers.indexOf("amount");

  const minCols = Math.max(dateIdx, descIdx, amountIdx) + 1;

  for (let i = headerLineIndex + 1; i < lines.length; i++) {
    const rowNumber = i + 1;
    const raw = lines[i];
    const cols = splitCsvRow(raw);

    if (cols.length < minCols) {
      errors.push({
        row: rowNumber,
        message: `Expected at least ${minCols} columns, found ${cols.length}.`,
        raw,
      });
      continue;
    }

    const rawDate = cols[dateIdx].trim();
    const rawDescription = cols[descIdx].trim();
    const rawAmount = cols[amountIdx].trim();

    const date = parseYyyyMmDd(rawDate);
    if (date === null) {
      errors.push({
        row: rowNumber,
        message: `Invalid date "${rawDate}". Expected YYYY/MM/DD.`,
        raw,
      });
      continue;
    }

    if (rawDescription === "") {
      errors.push({ row: rowNumber, message: "Description is empty.", raw });
      continue;
    }

    const rawAmountNum = parseNumber(rawAmount);
    if (rawAmountNum === null) {
      errors.push({
        row: rowNumber,
        message: `Invalid amount "${rawAmount}".`,
        raw,
      });
      continue;
    }

    // Credit card CSVs use positive for debits (expenses) and negative for
    // credits (income/payments). Negate so our convention is: negative = expense.
    const amount = -rawAmountNum;

    transactions.push({ date, description: rawDescription, amount });
  }

  return { transactions, errors };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parses DD/MM/YYYY into a Date. Returns null if invalid. */
function parseDdMmYyyy(value: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

/** Parses YYYY/MM/DD into a Date. Returns null if invalid. */
function parseYyyyMmDd(value: string): Date | null {
  const match = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(value);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

/** Parses a numeric string, stripping currency symbols and commas. Returns null if not a finite number. */
function parseNumber(value: string): number | null {
  const cleaned = value.replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return isFinite(n) ? n : null;
}

/**
 * Splits a single CSV row, respecting double-quoted fields that may contain
 * commas. Handles the simple quoting style used by NZ bank exports.
 */
function splitCsvRow(row: string): string[] {
  const cols: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      cols.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cols.push(current);
  return cols;
}
