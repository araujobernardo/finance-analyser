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
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : undefined;
}

// Move to Done
const { transitions } = await jiraFetch("/rest/api/3/issue/FA-14/transitions", { method: "GET" });
const transition = transitions.find(t => t.name.toLowerCase() === "done");
if (!transition) throw new Error("Done transition not found. Available: " + transitions.map(t => t.name).join(", "));
await jiraFetch("/rest/api/3/issue/FA-14/transitions", {
  method: "POST",
  body: JSON.stringify({ transition: { id: transition.id } }),
});
console.log("FA-14 moved to: Done");

// Final comment
await jiraFetch("/rest/api/3/issue/FA-14/comment", {
  method: "POST",
  body: JSON.stringify({
    body: {
      type: "doc", version: 1,
      content: [{ type: "paragraph", content: [{ type: "text", text: "PR #2 merged and squashed to main. Story complete." }] }],
    },
  }),
});
console.log("Final comment added to FA-14");
