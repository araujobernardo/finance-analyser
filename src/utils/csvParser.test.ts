import { describe, it, expect } from 'vitest';
import { parseCsv } from './csvParser';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeCsv(...rows: string[]): string {
  return ['Date,Description,Amount,Balance', ...rows].join('\n');
}

// ── Happy path ──────────────────────────────────────────────────────────────

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

// ── Header validation ───────────────────────────────────────────────────────

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

// ── Row-level errors ────────────────────────────────────────────────────────

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

// ── Edge cases ──────────────────────────────────────────────────────────────

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
