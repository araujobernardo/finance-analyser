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

const BASE_URL  = env.VITE_JIRA_BASE_URL;
const EMAIL     = env.VITE_JIRA_EMAIL;
const API_TOKEN = env.VITE_JIRA_API_TOKEN;
const AUTH = "Basic " + Buffer.from(`${EMAIL}:${API_TOKEN}`).toString("base64");
const HEADERS = { Authorization: AUTH, "Content-Type": "application/json", Accept: "application/json" };

async function jiraGet(path) {
  const res = await fetch(`${BASE_URL}${path}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}
async function jiraPost(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, { method: "POST", headers: HEADERS, body: JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

const { transitions } = await jiraGet("/rest/api/3/issue/FA-50/transitions");
const inProgress = transitions.find(t => t.name === "In Progress");
if (!inProgress) throw new Error(`No 'In Progress' transition. Available: ${transitions.map(t => t.name).join(", ")}`);

await jiraPost("/rest/api/3/issue/FA-50/transitions", { transition: { id: inProgress.id } });
console.log("FA-50 moved to In Progress ✓");

await jiraPost("/rest/api/3/issue/FA-50/comment", {
  body: {
    version: 1, type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Developer agent starting implementation." }] }]
  }
});
console.log("Comment added ✓");
