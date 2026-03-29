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

async function jiraFetch(path, options) {
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers: HEADERS });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${options.method} ${path} → ${res.status} ${res.statusText}: ${text}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : undefined;
}

// Step 1 — find the "In Review" transition id and apply it
const { transitions } = await jiraFetch("/rest/api/3/issue/FA-13/transitions", { method: "GET" });
const transition = transitions.find(t => t.name.toLowerCase() === "in review");
if (!transition) {
  console.error("Available transitions:", transitions.map(t => t.name).join(", "));
  throw new Error('Transition "In Review" not found');
}
await jiraFetch("/rest/api/3/issue/FA-13/transitions", {
  method: "POST",
  body: JSON.stringify({ transition: { id: transition.id } }),
});
console.log("FA-13 moved to: In Review");

// Step 2 — add PR comment
await jiraFetch("/rest/api/3/issue/FA-13/comment", {
  method: "POST",
  body: JSON.stringify({
    body: {
      type: "doc", version: 1,
      content: [{ type: "paragraph", content: [{ type: "text", text: "PR #1 opened: https://github.com/araujobernardo/finance-analyser/pull/1" }] }],
    },
  }),
});
console.log("Comment added to FA-13");
