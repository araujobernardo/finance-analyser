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

const comment = `## QA Review — Detect and reject duplicate uploads

✅ APPROVED

---

**Story:** Detect and reject duplicate uploads (FA-16)
**PR:** #4

---

**Acceptance Criteria Check**

- [x] App detects if the uploaded file covers a month already in storage — PASS — useFileUpload checks getStoredMonths() after parsing; if monthKey exists, sets pending state instead of saving
- [x] A clear warning modal is shown with Cancel and Replace options — PASS — DuplicateWarningModal renders with role="dialog", month name, and both buttons
- [x] If the user chooses Replace, the old month's data is overwritten — PASS — confirmReplace() calls saveTransactions() with pending transactions (overwrites existing key)
- [x] If the user cancels, no data is changed — PASS — cancelReplace() clears pending and selectedFile without calling saveTransactions()

---

**Manual Testing**

1. Happy path — new month upload: PASS — filename shown in green, no modal
2. Duplicate detected — modal appears: PASS — modal shown with correct month name and both buttons
3. Cancel — data unchanged: PASS — modal closes, filename clears, existing data intact
4. Replace — data overwritten: PASS — modal closes, new data accepted
5. Keyboard — Cancel focused by default: PASS — Cancel button has autoFocus on modal open

---

**Tests Written**

- src/hooks/useFileUpload.test.ts — 9 tests
  - handleFile: saves on new month, sets isDuplicate on duplicate, does not save on duplicate detection, collects parse errors, skips save when no valid transactions
  - confirmReplace: saves pending transactions and clears isDuplicate
  - cancelReplace: clears state without saving
  - Month name formatting: formats duplicateMonth as human-readable string

- src/components/DuplicateWarningModal.test.tsx — 6 tests
  - Renders month name, Cancel and Replace buttons
  - onCancel called on Cancel click
  - onReplace called on Replace click
  - role="dialog" and aria-modal="true" present
  - Cancel button has autoFocus

Total: 15 new tests. Full suite: 74 tests passing.

---

**Issues Found**

No bugs. One minor observation (non-blocking):

1. The duplicate detection uses the date of the first parsed transaction to derive the month key (line 45 of useFileUpload.ts). If a CSV contains transactions spanning two months, only the first transaction's month is checked. This is acceptable behaviour for this story's scope — the requirements state "same month uploaded twice" as the target case.

---

**Recommendation**

I recommend APPROVAL. All 4 acceptance criteria pass. All 5 manual tests passed by the user. 15 automated tests written and passing. No bugs found. Final merge decision belongs to the user.`;

const res = await fetch(`${BASE_URL}/rest/api/3/issue/FA-16/comment`, {
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
console.log("QA review comment posted to FA-16");
