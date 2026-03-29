export interface Transaction {
  date: Date;
  description: string;
  amount: number;
  balance: number;
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

const EXPECTED_HEADERS = ["date", "description", "amount", "balance"];

/**
 * Parses a NZ bank CSV string into typed Transaction objects.
 *
 * Expected columns (case-insensitive): Date, Description, Amount, Balance
 * Date format: DD/MM/YYYY
 * Amount: negative = debit, positive = credit
 *
 * Returns all valid transactions plus a list of row-level errors so the
 * caller can report skipped rows to the user without throwing.
 */
export function parseCsv(csvText: string): ParseResult {
  const transactions: Transaction[] = [];
  const errors: ParseError[] = [];

  const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== "");

  if (lines.length === 0) {
    return { transactions, errors: [{ row: 0, message: "File is empty.", raw: "" }] };
  }

  // ── Validate headers ──────────────────────────────────────────────────────

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());

  const missingHeaders = EXPECTED_HEADERS.filter(h => !headers.includes(h));
  if (missingHeaders.length > 0) {
    return {
      transactions,
      errors: [
        {
          row: 1,
          message: `Missing required columns: ${missingHeaders.join(", ")}. Found: ${headers.join(", ")}`,
          raw: lines[0],
        },
      ],
    };
  }

  const dateIdx        = headers.indexOf("date");
  const descriptionIdx = headers.indexOf("description");
  const amountIdx      = headers.indexOf("amount");
  const balanceIdx     = headers.indexOf("balance");

  // ── Parse rows ────────────────────────────────────────────────────────────

  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i + 1;
    const raw = lines[i];
    const cols = splitCsvRow(raw);

    if (cols.length < EXPECTED_HEADERS.length) {
      errors.push({ row: rowNumber, message: `Expected at least 4 columns, found ${cols.length}.`, raw });
      continue;
    }

    const rawDate        = cols[dateIdx].trim();
    const rawDescription = cols[descriptionIdx].trim();
    const rawAmount      = cols[amountIdx].trim();
    const rawBalance     = cols[balanceIdx].trim();

    // Date — DD/MM/YYYY
    const date = parseDdMmYyyy(rawDate);
    if (date === null) {
      errors.push({ row: rowNumber, message: `Invalid date "${rawDate}". Expected DD/MM/YYYY.`, raw });
      continue;
    }

    // Description
    if (rawDescription === "") {
      errors.push({ row: rowNumber, message: "Description is empty.", raw });
      continue;
    }

    // Amount
    const amount = parseNumber(rawAmount);
    if (amount === null) {
      errors.push({ row: rowNumber, message: `Invalid amount "${rawAmount}".`, raw });
      continue;
    }

    // Balance
    const balance = parseNumber(rawBalance);
    if (balance === null) {
      errors.push({ row: rowNumber, message: `Invalid balance "${rawBalance}".`, raw });
      continue;
    }

    transactions.push({ date, description: rawDescription, amount, balance });
  }

  return { transactions, errors };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parses DD/MM/YYYY into a Date. Returns null if invalid. */
function parseDdMmYyyy(value: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;

  const day   = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year  = parseInt(match[3], 10);

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31)     return null;

  const date = new Date(year, month - 1, day);

  // Guard against dates like 31/02/2024 which JS silently rolls over
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
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
