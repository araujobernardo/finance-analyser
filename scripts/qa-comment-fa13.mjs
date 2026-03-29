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

const comment = `## QA Review — Build CSV upload component

✅ APPROVED

---

**Story:** Build CSV upload component (FA-13)
**PR:** #1

---

**Acceptance Criteria Check**

- [x] Drag-and-drop zone accepts .csv files only — PASS — validateAndAccept() checks file.name.toLowerCase().endsWith(".csv"); input has accept=".csv"
- [x] Click-to-browse fallback works — PASS — onClick on the zone div calls inputRef.current?.click()
- [x] Selected filename displayed after valid selection — PASS — selectedFile state rendered in csv-upload__filename paragraph with aria-live="polite"
- [x] Non-CSV files rejected with clear error message — PASS — error state rendered in role="alert" paragraph with descriptive message including the filename
- [x] Keyboard accessible (Enter and Space trigger file picker) — PASS — handleKeyDown responds to Enter and Space, calls inputRef.current?.click(); zone has role="button" and tabIndex=0
- [x] UI only — raw File object stored in React state — PASS — File stored via useState<File | null>; no parsing logic present

---

**Tests Written**

- src/components/CsvUpload.test.tsx (12 tests, all passing)
  - Happy path: renders drop zone, valid CSV via input, valid CSV via drag-and-drop
  - Error path: non-CSV via input, non-CSV via drop, previous valid selection cleared on subsequent invalid selection
  - Edge cases: uppercase .CSV extension accepted, file named ".csv" accepted
  - Keyboard: role="button" and tabIndex=0 present, Enter triggers file picker, Space triggers file picker
  - Drag state: drag-over CSS class applied on dragOver, removed on dragLeave

---

**Issues Found**

No bugs. Two minor observations (non-blocking):

1. The count state and HMR paragraph in App.tsx are scaffolding leftovers — these will naturally be removed when the App Shell story (FA-20) is implemented.
2. The "Stored: filename" debug line in App.tsx (line 16) is a development convenience. It should be removed before FA-20 is implemented, but is not a concern for this story.

---

**Recommendation**

I recommend APPROVAL. All 6 acceptance criteria pass. 12 automated tests written and passing. No bugs found. Final merge decision belongs to the user.`;

const body = {
  body: {
    type: "doc",
    version: 1,
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: comment }],
      },
    ],
  },
};

const res = await fetch(`${BASE_URL}/rest/api/3/issue/FA-13/comment`, {
  method: "POST",
  headers: HEADERS,
  body: JSON.stringify(body),
});

if (!res.ok) {
  const text = await res.text();
  throw new Error(`${res.status} ${res.statusText}: ${text}`);
}

console.log("QA review comment posted to FA-13");
