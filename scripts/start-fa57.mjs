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

const transRes = await fetch(`${BASE_URL}/rest/api/3/issue/FA-57/transitions`, { headers: HEADERS });
const transData = await transRes.json();
const transition = transData.transitions.find(t => t.name === "In Progress");
if (!transition) {
  console.error("Available:", transData.transitions.map(t => t.name));
  process.exit(1);
}

const moveRes = await fetch(`${BASE_URL}/rest/api/3/issue/FA-57/transitions`, {
  method: "POST", headers: HEADERS,
  body: JSON.stringify({ transition: { id: transition.id } })
});
console.log("Moved to In Progress:", moveRes.status);

const commentRes = await fetch(`${BASE_URL}/rest/api/3/issue/FA-57/comment`, {
  method: "POST", headers: HEADERS,
  body: JSON.stringify({
    body: {
      type: "doc", version: 1,
      content: [{ type: "paragraph", content: [{ type: "text", text: "Developer agent starting implementation." }] }]
    }
  })
});
console.log("Comment added:", commentRes.status);
