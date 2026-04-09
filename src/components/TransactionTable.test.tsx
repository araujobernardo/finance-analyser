import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransactionTable } from "./TransactionTable";
import type { Transaction } from "../utils/csvParser";

function txn(
  date: string,
  description: string,
  amount: number,
  category?: string,
  balance?: number,
): Transaction {
  return { date: new Date(date), description, amount, category, balance };
}

const SAMPLE: Transaction[] = [
  txn("2024-03-15", "Countdown Supermarket", -120.5, "Groceries"),
  txn("2024-03-10", "Salary", 3000, "Income"),
  txn("2024-03-20", "Uber Eats", -45.0, "Dining"),
  txn("2024-03-05", "Petrol Station", -80.0, "Transport"),
];

function renderTable(transactions = SAMPLE) {
  return render(<TransactionTable transactions={transactions} />);
}

describe("TransactionTable — rendering", () => {
  it("renders a row for each transaction", () => {
    renderTable();
    const rows = screen.getAllByRole("row");
    // 1 header + 4 data rows
    expect(rows).toHaveLength(5);
  });

  it("shows description for each transaction", () => {
    renderTable();
    expect(screen.getByText("Countdown Supermarket")).toBeInTheDocument();
    expect(screen.getByText("Salary")).toBeInTheDocument();
    expect(screen.getByText("Uber Eats")).toBeInTheDocument();
  });

  it("shows category for each transaction", () => {
    renderTable();
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Income")).toBeInTheDocument();
  });

  it("shows 'Uncategorised' for transactions without a category", () => {
    renderTable([txn("2024-03-01", "Mystery", -10)]);
    expect(screen.getByText("Uncategorised")).toBeInTheDocument();
  });

  it("does not render a Balance column when no transaction has balance", () => {
    renderTable();
    expect(
      screen.queryByRole("columnheader", { name: /balance/i }),
    ).not.toBeInTheDocument();
  });

  it("renders a Balance column when at least one transaction has balance", () => {
    renderTable([txn("2024-03-01", "Salary", 3000, "Income", 5000)]);
    expect(
      screen.getByRole("columnheader", { name: /balance/i }),
    ).toBeInTheDocument();
  });

  it("leaves balance cell blank when balance is missing", () => {
    renderTable([
      txn("2024-03-01", "Salary", 3000, "Income", 5000),
      txn("2024-03-02", "Groceries", -50, "Groceries"),
    ]);
    const rows = screen.getAllByRole("row");
    // Default sort is desc date, so rows[1] = Mar 02 Groceries (no balance)
    const cells = within(rows[1]).getAllByRole("cell");
    // columns: date, desc, amount, balance, category
    expect(cells[3].textContent).toBe("");
  });
});

describe("TransactionTable — amount colours", () => {
  it("applies positive class to income amounts", () => {
    renderTable([txn("2024-03-01", "Salary", 3000, "Income")]);
    const cell = screen.getByText("$3,000.00").closest("td");
    expect(cell).toHaveClass("txn-table__amount--positive");
  });

  it("applies negative class to expense amounts", () => {
    renderTable([txn("2024-03-01", "Groceries", -120, "Groceries")]);
    const cell = screen.getByText("-$120.00").closest("td");
    expect(cell).toHaveClass("txn-table__amount--negative");
  });

  it("applies zero class to zero amounts", () => {
    renderTable([txn("2024-03-01", "Zero txn", 0)]);
    const cell = screen.getByText("$0.00").closest("td");
    expect(cell).toHaveClass("txn-table__amount--zero");
  });
});

describe("TransactionTable — sorting", () => {
  it("defaults to descending date order", () => {
    renderTable();
    const rows = screen.getAllByRole("row").slice(1);
    const dates = rows.map(
      (r) => within(r).getAllByRole("cell")[0].textContent,
    );
    expect(dates[0]).toMatch("20 Mar 2024");
    expect(dates[dates.length - 1]).toMatch("05 Mar 2024");
  });

  it("sorts ascending by date when Date header is clicked once", async () => {
    renderTable();
    // Default is descending; one click → ascending
    await userEvent.click(screen.getByRole("columnheader", { name: /date/i }));
    const rows = screen.getAllByRole("row").slice(1);
    const dates = rows.map(
      (r) => within(r).getAllByRole("cell")[0].textContent,
    );
    expect(dates[0]).toMatch("05 Mar 2024");
    expect(dates[dates.length - 1]).toMatch("20 Mar 2024");
  });

  it("sorts by description when Description header is clicked", async () => {
    renderTable();
    await userEvent.click(
      screen.getByRole("columnheader", { name: /description/i }),
    );
    const rows = screen.getAllByRole("row").slice(1);
    const descs = rows.map(
      (r) => within(r).getAllByRole("cell")[1].textContent,
    );
    expect(descs).toEqual([...descs].sort());
  });

  it("sorts by amount when Amount header is clicked", async () => {
    renderTable();
    await userEvent.click(
      screen.getByRole("columnheader", { name: /amount/i }),
    );
    const rows = screen.getAllByRole("row").slice(1);
    const amounts = rows.map((r) =>
      parseFloat(
        within(r)
          .getAllByRole("cell")[2]
          .textContent!.replace(/[^0-9.-]/g, ""),
      ),
    );
    expect(amounts[0]).toBeLessThanOrEqual(amounts[1]);
  });

  it("shows ascending arrow on active sort column", async () => {
    renderTable();
    const dateHeader = screen.getByRole("columnheader", { name: /date/i });
    await userEvent.click(dateHeader); // default was desc → now asc
    expect(dateHeader.textContent).toContain("▲");
  });

  it("shows descending arrow on default date column", () => {
    renderTable();
    const dateHeader = screen.getByRole("columnheader", { name: /date/i });
    expect(dateHeader.textContent).toContain("▼");
  });
});

describe("TransactionTable — search filter", () => {
  it("filters rows by description (case-insensitive)", async () => {
    renderTable();
    await userEvent.type(
      screen.getByRole("searchbox", { name: "Search transactions" }),
      "countdown",
    );
    expect(screen.getByText("Countdown Supermarket")).toBeInTheDocument();
    expect(screen.queryByText("Uber Eats")).not.toBeInTheDocument();
  });

  it("filters rows by category (case-insensitive)", async () => {
    renderTable();
    await userEvent.type(
      screen.getByRole("searchbox", { name: "Search transactions" }),
      "transport",
    );
    expect(screen.getByText("Petrol Station")).toBeInTheDocument();
    expect(screen.queryByText("Salary")).not.toBeInTheDocument();
  });

  it("shows 'No results' when no rows match", async () => {
    renderTable();
    await userEvent.type(
      screen.getByRole("searchbox", { name: "Search transactions" }),
      "xyznonexistent",
    );
    expect(screen.getByTestId("txn-table-empty")).toBeInTheDocument();
  });
});

describe("TransactionTable — date range filter", () => {
  it("excludes transactions before the from date", async () => {
    renderTable();
    const fromInput = screen.getByLabelText("From date");
    await userEvent.type(fromInput, "2024-03-12");
    // Only Mar 15 and Mar 20 should be visible
    expect(screen.getByText("Countdown Supermarket")).toBeInTheDocument();
    expect(screen.getByText("Uber Eats")).toBeInTheDocument();
    expect(screen.queryByText("Salary")).not.toBeInTheDocument();
    expect(screen.queryByText("Petrol Station")).not.toBeInTheDocument();
  });

  it("excludes transactions after the to date", async () => {
    renderTable();
    const toInput = screen.getByLabelText("To date");
    await userEvent.type(toInput, "2024-03-12");
    expect(screen.getByText("Salary")).toBeInTheDocument();
    expect(screen.getByText("Petrol Station")).toBeInTheDocument();
    expect(screen.queryByText("Countdown Supermarket")).not.toBeInTheDocument();
    expect(screen.queryByText("Uber Eats")).not.toBeInTheDocument();
  });
});

describe("TransactionTable — empty input", () => {
  it("shows 'No results' when transactions array is empty", () => {
    renderTable([]);
    expect(screen.getByTestId("txn-table-empty")).toBeInTheDocument();
  });
});
