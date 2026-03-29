import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, "../.env"), "utf8")
    .split("\n")
    .filter(line => line.includes("="))
    .map(line => { const i = line.indexOf("="); return [line.slice(0, i).trim(), line.slice(i + 1).trim()]; })
);

const BASE_URL = env.VITE_JIRA_BASE_URL;
const AUTH = "Basic " + Buffer.from(`${env.VITE_JIRA_EMAIL}:${env.VITE_JIRA_API_TOKEN}`).toString("base64");
const HEADERS = { Authorization: AUTH, "Content-Type": "application/json", Accept: "application/json" };

const comment = `## QA Review — Parse and validate CSV structure

✅ APPROVED

---

**Story:** Parse and validate CSV structure (FA-14)
**PR:** #2

---

**Acceptance Criteria Check**

- [x] Reads Date, Description, Amount, Balance columns — PASS — headers.indexOf() used for each; column order-independent
- [x] Case-insensitive header matching — PASS — headers mapped to lowercase before matching
- [x] Missing columns flagged with descriptive error naming the missing columns — PASS — missingHeaders joined and included in error message
- [x] Individual rows with missing/invalid values flagged with row number and raw string — PASS — every error includes row, message, and raw
- [x] Valid rows returned as typed Transaction[] — PASS — Transaction interface fully typed, no any
- [x] Invalid rows collected into ParseError[] without throwing — PASS — errors array accumulated, never thrown
- [x] Amount: negative = debit, positive = credit — PASS — sign preserved as-is from CSV value
- [x] Date format DD/MM/YYYY validated — PASS — regex + rollover guard (31/02 rejected correctly)

---

**Tests Written**

- src/utils/csvParser.test.ts — 23 tests, all passing
  - Happy path (7): single row, multiple rows, case-insensitive headers, CRLF line endings, quoted fields with commas, currency symbol stripping, mixed valid/invalid rows
  - Header validation (3): empty file, missing columns, completely wrong headers
  - Row-level errors (8): invalid date format, impossible date (31 Feb), invalid month (13), empty description, non-numeric amount, non-numeric balance, too few columns, raw string included in error
  - Edge cases (5): headers-only file, blank lines ignored, zero amount, positive credit, negative debit

---

**Issues Found**

No bugs. Two minor observations (non-blocking):

1. The header parser splits on commas without quote-awareness (line 43: lines[0].split(",")). If a NZ bank ever exports a quoted header like "Date","Description","Amount","Balance", the quotes would be included in the header name and matching would fail. Not observed in practice with NZ bank exports, but worth noting for future robustness.

2. The parseNumber helper strips the $ symbol specifically but not other currency symbols (e.g. NZD prefix). For NZ bank CSVs this is sufficient per the requirements.

Neither issue affects acceptance criteria for this story.

---

**Recommendation**

I recommend APPROVAL. All 8 acceptance criteria pass. 23 automated tests written and passing. No bugs found. Final merge decision belongs to the user.`;

const res = await fetch(`${BASE_URL}/rest/api/3/issue/FA-14/comment`, {
  method: "POST",
  headers: HEADERS,
  body: JSON.stringify({
    body: {
      type: "doc", version: 1,
      content: [{ type: "paragraph", content: [{ type: "text", text: comment }] }],
    },
  }),
});

if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
console.log("QA review comment posted to FA-14");
