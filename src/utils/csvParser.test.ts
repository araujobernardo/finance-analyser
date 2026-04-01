import { describe, it, expect } from 'vitest';
import { parseCsv } from './csvParser';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Builds a legacy-format CSV (Date, Description, Amount, Balance). */
function makeCsv(...rows: string[]): string {
  return ['Date,Description,Amount,Balance', ...rows].join('\n');
}

/**
 * Builds an NZ bank export CSV with 6 metadata lines followed by the standard
 * NZ column headers, then the provided data rows.
 */
function makeNzCsv(...rows: string[]): string {
  const metadata = [
    'Westpac New Zealand Limited',
    '"Account Number:","12-3456-7890123-00"',
    '"Account Name:","JOHN SMITH"',
    '"From Date:","01/03/2024"',
    '"To Date:","31/03/2024"',
    '"#","Transactions:"',
  ];
  return [
    ...metadata,
    'Date,Unique Id,Tran Type,Cheque Number,Payee,Memo,Amount',
    ...rows,
  ].join('\n');
}

// ── Legacy format — happy path ──────────────────────────────────────────────

describe('parseCsv — happy path', () => {
  it('parses a single valid row', () => {
    const { transactions, errors } = parseCsv(
      makeCsv('15/03/2024,Countdown Supermarket,-85.50,1234.00')
    );
    expect(errors).toHaveLength(0);
    expect(transactions).toHaveLength(1);

    const t = transactions[0];
    expect(t.date).toEqual(new Date(2024, 2, 15));
    expect(t.description).toBe('Countdown Supermarket');
    expect(t.amount).toBe(-85.5);
    expect(t.balance).toBe(1234.0);
  });

  it('parses multiple valid rows', () => {
    const { transactions, errors } = parseCsv(
      makeCsv(
        '01/01/2024,Salary,3000.00,5000.00',
        '02/01/2024,Power Bill,-120.00,4880.00',
        '03/01/2024,Cafe,-12.50,4867.50'
      )
    );
    expect(errors).toHaveLength(0);
    expect(transactions).toHaveLength(3);
    expect(transactions[0].amount).toBe(3000);
    expect(transactions[1].amount).toBe(-120);
    expect(transactions[2].amount).toBe(-12.5);
  });

  it('handles headers in any case (case-insensitive)', () => {
    const csv = 'DATE,DESCRIPTION,AMOUNT,BALANCE\n10/06/2024,Test,100.00,200.00';
    const { transactions, errors } = parseCsv(csv);
    expect(errors).toHaveLength(0);
    expect(transactions).toHaveLength(1);
  });

  it('handles CRLF line endings', () => {
    const csv = 'Date,Description,Amount,Balance\r\n10/06/2024,Test,100.00,200.00\r\n';
    const { transactions, errors } = parseCsv(csv);
    expect(errors).toHaveLength(0);
    expect(transactions).toHaveLength(1);
  });

  it('handles quoted fields containing commas', () => {
    const csv = makeCsv('10/06/2024,"Smith, John - Payment",-50.00,950.00');
    const { transactions, errors } = parseCsv(csv);
    expect(errors).toHaveLength(0);
    expect(transactions[0].description).toBe('Smith, John - Payment');
  });

  it('strips currency symbols and commas from amounts', () => {
    const csv = makeCsv('10/06/2024,Test,"$1,200.00","$10,000.00"');
    const { transactions, errors } = parseCsv(csv);
    expect(errors).toHaveLength(0);
    expect(transactions[0].amount).toBe(1200);
    expect(transactions[0].balance).toBe(10000);
  });

  it('returns both valid transactions and errors when a file has mixed rows', () => {
    const { transactions, errors } = parseCsv(
      makeCsv(
        '01/01/2024,Valid Row,-50.00,950.00',
        'not-a-date,Bad Row,-50.00,950.00',
        '03/01/2024,Another Valid,-20.00,930.00'
      )
    );
    expect(transactions).toHaveLength(2);
    expect(errors).toHaveLength(1);
    expect(errors[0].row).toBe(3);
  });
});

// ── Legacy format — header validation ──────────────────────────────────────

describe('parseCsv — header validation', () => {
  it('returns an error when the file is empty', () => {
    const { transactions, errors } = parseCsv('');
    expect(transactions).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/empty/i);
  });

  it('returns an error listing missing columns', () => {
    const { transactions, errors } = parseCsv('Date,Description\n01/01/2024,Test');
    expect(transactions).toHaveLength(0);
    expect(errors[0].message).toMatch(/missing required columns/i);
    expect(errors[0].message).toMatch(/amount/i);
    expect(errors[0].message).toMatch(/balance/i);
  });

  it('returns an error for a completely wrong header', () => {
    const { transactions, errors } = parseCsv('Foo,Bar,Baz,Qux\n1,2,3,4');
    expect(transactions).toHaveLength(0);
    expect(errors[0].message).toMatch(/missing required columns/i);
  });
});

// ── Legacy format — row-level errors ───────────────────────────────────────

describe('parseCsv — row-level errors', () => {
  it('skips a row with an invalid date format and records an error', () => {
    const { transactions, errors } = parseCsv(
      makeCsv('2024-03-15,Bad Date Format,-50.00,950.00')
    );
    expect(transactions).toHaveLength(0);
    expect(errors[0].message).toMatch(/invalid date/i);
    expect(errors[0].row).toBe(2);
  });

  it('skips a row with an impossible date (31 Feb) and records an error', () => {
    const { transactions, errors } = parseCsv(
      makeCsv('31/02/2024,Impossible Date,-50.00,950.00')
    );
    expect(transactions).toHaveLength(0);
    expect(errors[0].message).toMatch(/invalid date/i);
  });

  it('skips a row with an invalid month (13) and records an error', () => {
    const { transactions, errors } = parseCsv(
      makeCsv('01/13/2024,Bad Month,-50.00,950.00')
    );
    expect(transactions).toHaveLength(0);
    expect(errors[0].message).toMatch(/invalid date/i);
  });

  it('skips a row with an empty description and records an error', () => {
    const { transactions, errors } = parseCsv(
      makeCsv('01/01/2024,,-50.00,950.00')
    );
    expect(transactions).toHaveLength(0);
    expect(errors[0].message).toMatch(/description is empty/i);
  });

  it('skips a row with a non-numeric amount and records an error', () => {
    const { transactions, errors } = parseCsv(
      makeCsv('01/01/2024,Test,N/A,950.00')
    );
    expect(transactions).toHaveLength(0);
    expect(errors[0].message).toMatch(/invalid amount/i);
  });

  it('skips a row with a non-numeric balance and records an error', () => {
    const { transactions, errors } = parseCsv(
      makeCsv('01/01/2024,Test,-50.00,N/A')
    );
    expect(transactions).toHaveLength(0);
    expect(errors[0].message).toMatch(/invalid balance/i);
  });

  it('skips a row with too few columns and records an error', () => {
    const { transactions, errors } = parseCsv(
      makeCsv('01/01/2024,Test,-50.00')
    );
    expect(transactions).toHaveLength(0);
    expect(errors[0].message).toMatch(/expected at least 4 columns/i);
  });

  it('includes the raw row string in every error for debugging', () => {
    const raw = 'bad-date,Test,-50.00,950.00';
    const { errors } = parseCsv(makeCsv(raw));
    expect(errors[0].raw).toBe(raw);
  });
});

// ── Legacy format — edge cases ──────────────────────────────────────────────

describe('parseCsv — edge cases', () => {
  it('handles a file with headers only (no data rows)', () => {
    const { transactions, errors } = parseCsv('Date,Description,Amount,Balance');
    expect(transactions).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });

  it('ignores blank lines between rows', () => {
    const csv = 'Date,Description,Amount,Balance\n\n01/01/2024,Test,-50.00,950.00\n\n';
    const { transactions, errors } = parseCsv(csv);
    expect(errors).toHaveLength(0);
    expect(transactions).toHaveLength(1);
  });

  it('parses zero amount correctly', () => {
    const { transactions } = parseCsv(makeCsv('01/01/2024,Fee Refund,0.00,1000.00'));
    expect(transactions[0].amount).toBe(0);
  });

  it('parses a positive (credit) amount correctly', () => {
    const { transactions } = parseCsv(makeCsv('01/01/2024,Salary,3000.00,6000.00'));
    expect(transactions[0].amount).toBe(3000);
  });

  it('parses a negative (debit) amount correctly', () => {
    const { transactions } = parseCsv(makeCsv('01/01/2024,Supermarket,-45.99,954.01'));
    expect(transactions[0].amount).toBe(-45.99);
  });
});

// ── NZ bank format — happy path ─────────────────────────────────────────────

describe('parseCsv — NZ bank format — happy path', () => {
  it('parses a single valid row, skipping the 6 metadata lines', () => {
    const { transactions, errors } = parseCsv(
      makeNzCsv('2024/03/15,2024031501,EFTPOS,,Countdown Supermarket,Food shopping,-85.50')
    );
    expect(errors).toHaveLength(0);
    expect(transactions).toHaveLength(1);

    const t = transactions[0];
    expect(t.date).toEqual(new Date(2024, 2, 15));
    expect(t.description).toBe('Countdown Supermarket Food shopping');
    expect(t.amount).toBe(-85.5);
    expect(t.balance).toBeUndefined();
  });

  it('parses multiple rows', () => {
    const { transactions, errors } = parseCsv(
      makeNzCsv(
        '2024/03/01,ID001,CREDIT,,Employer,Salary,3000.00',
        '2024/03/02,ID002,EFTPOS,,Power Co,,-120.00',
        '2024/03/03,ID003,EFTPOS,,Cafe,Coffee,-12.50'
      )
    );
    expect(errors).toHaveLength(0);
    expect(transactions).toHaveLength(3);
    expect(transactions[0].amount).toBe(3000);
    expect(transactions[2].amount).toBe(-12.5);
  });

  it('parses the date in YYYY/MM/DD format correctly', () => {
    const { transactions } = parseCsv(
      makeNzCsv('2024/01/05,ID001,EFTPOS,,Test Merchant,,-10.00')
    );
    expect(transactions[0].date).toEqual(new Date(2024, 0, 5));
  });

  it('builds description from Payee only when Memo is empty', () => {
    const { transactions, errors } = parseCsv(
      makeNzCsv('2024/03/10,ID001,EFTPOS,,Countdown Supermarket,,-50.00')
    );
    expect(errors).toHaveLength(0);
    expect(transactions[0].description).toBe('Countdown Supermarket');
  });

  it('builds description from Memo only when Payee is empty', () => {
    const { transactions, errors } = parseCsv(
      makeNzCsv('2024/03/10,ID001,EFTPOS,,,Direct debit payment,-50.00')
    );
    expect(errors).toHaveLength(0);
    expect(transactions[0].description).toBe('Direct debit payment');
  });

  it('builds description by joining non-empty Payee and Memo with a space', () => {
    const { transactions } = parseCsv(
      makeNzCsv('2024/03/10,ID001,EFTPOS,,The Merchant,Some reference,-50.00')
    );
    expect(transactions[0].description).toBe('The Merchant Some reference');
  });

  it('handles quoted payee fields containing commas', () => {
    const { transactions, errors } = parseCsv(
      makeNzCsv('2024/03/10,ID001,EFTPOS,,"Smith, John",Transfer,-100.00')
    );
    expect(errors).toHaveLength(0);
    expect(transactions[0].description).toBe('Smith, John Transfer');
  });

  it('handles a file with headers only (no data rows)', () => {
    const { transactions, errors } = parseCsv(makeNzCsv());
    expect(transactions).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });

  it('does not set balance on NZ format transactions', () => {
    const { transactions } = parseCsv(
      makeNzCsv('2024/03/15,ID001,EFTPOS,,Merchant,,-50.00')
    );
    expect(transactions[0].balance).toBeUndefined();
  });
});

// ── NZ bank format — errors ─────────────────────────────────────────────────

describe('parseCsv — NZ bank format — errors', () => {
  it('skips a row with an invalid YYYY/MM/DD date and records an error', () => {
    const { transactions, errors } = parseCsv(
      makeNzCsv('15/03/2024,ID001,EFTPOS,,Merchant,,−50.00')
    );
    expect(transactions).toHaveLength(0);
    expect(errors[0].message).toMatch(/invalid date/i);
    expect(errors[0].message).toMatch(/yyyy\/mm\/dd/i);
  });

  it('skips a row with an impossible date (31 Feb) and records an error', () => {
    const { transactions, errors } = parseCsv(
      makeNzCsv('2024/02/31,ID001,EFTPOS,,Merchant,,−50.00')
    );
    expect(transactions).toHaveLength(0);
    expect(errors[0].message).toMatch(/invalid date/i);
  });

  it('skips a row where both Payee and Memo are empty and records an error', () => {
    const { transactions, errors } = parseCsv(
      makeNzCsv('2024/03/10,ID001,EFTPOS,,,,-50.00')
    );
    expect(transactions).toHaveLength(0);
    expect(errors[0].message).toMatch(/description is empty/i);
  });

  it('skips a row with a non-numeric amount and records an error', () => {
    const { transactions, errors } = parseCsv(
      makeNzCsv('2024/03/10,ID001,EFTPOS,,Merchant,,N/A')
    );
    expect(transactions).toHaveLength(0);
    expect(errors[0].message).toMatch(/invalid amount/i);
  });

  it('returns both valid and invalid rows in a mixed file', () => {
    const { transactions, errors } = parseCsv(
      makeNzCsv(
        '2024/03/01,ID001,EFTPOS,,Valid Merchant,,-50.00',
        'bad-date,ID002,EFTPOS,,Merchant,,-20.00',
        '2024/03/03,ID003,EFTPOS,,Another Valid,,-30.00'
      )
    );
    expect(transactions).toHaveLength(2);
    expect(errors).toHaveLength(1);
  });

  it('includes the raw row string in every error', () => {
    const raw = '2024/03/10,ID001,EFTPOS,,,,-50.00';
    const { errors } = parseCsv(makeNzCsv(raw));
    expect(errors[0].raw).toBe(raw);
  });
});
