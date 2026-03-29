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

const comment = `## QA Review — Persist transaction data in localStorage

✅ APPROVED

---

**Story:** Persist transaction data in localStorage (FA-15)
**PR:** #3

---

**Acceptance Criteria Check**

- [x] Transactions saved to localStorage on upload — PASS — saveTransactions(monthKey, transactions) writes to localStorage with prefixed key
- [x] Data loaded from localStorage on app start — PASS — loadAllTransactions() iterates months index and returns Record<string, Transaction[]>
- [x] Multiple months stored and retrievable independently — PASS — each month keyed as "finance_analyser_YYYY-MM"; months index maintained separately
- [x] Storage quota errors caught and returned, never thrown — PASS — DOMException QuotaExceededError caught and returned as { type: "quota_exceeded" }
- [x] Other storage failures caught and returned — PASS — all other errors caught and returned as { type: "unavailable" } or { type: "parse_error" }
- [x] Dates serialised as ISO strings and restored as Date objects — PASS — serialiseTransaction uses toISOString(); deserialiseTransaction uses new Date(s.date)

---

**Tests Written**

- src/services/storage.test.ts — 22 tests, all passing
  - monthKeyFromDate (3): YYYY-MM format, single-digit month padding, December
  - saveTransactions (6): success result, round-trip persistence, month index updated, overwrite, no duplicate index entry, quota exceeded error, unavailable error
  - loadTransactions (4): empty result when no data, date restored as Date object, all fields correct, parse_error on corrupt data
  - loadAllTransactions (3): empty map, all months returned, corrupt month errors reported without omitting valid months
  - getStoredMonths (2): empty array, chronological order
  - removeMonth (3): data removed, index updated, other months unaffected

---

**Issues Found**

No bugs. One minor observation (non-blocking):

1. updateMonthsIndex only writes to the index when adding a new month (the "already exists" guard skips the write). On overwrite (same month saved again), the index is correctly left unchanged. This is the right behaviour — noted only for clarity.

---

**Recommendation**

I recommend APPROVAL. All 6 acceptance criteria pass. 22 automated tests written and passing. No bugs found. Final merge decision belongs to the user.`;

const res = await fetch(`${BASE_URL}/rest/api/3/issue/FA-15/comment`, {
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
console.log("QA review comment posted to FA-15");
