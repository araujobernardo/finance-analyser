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
const PROJECT   = env.VITE_JIRA_PROJECT_KEY;
const AUTH = "Basic " + Buffer.from(`${EMAIL}:${API_TOKEN}`).toString("base64");
const HEADERS = { Authorization: AUTH, "Content-Type": "application/json", Accept: "application/json" };

async function post(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, { method: "POST", headers: HEADERS, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

async function get(path) {
  const res = await fetch(`${BASE_URL}${path}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

const { issues } = await post("/rest/api/3/search/jql", {
  jql: `project = ${PROJECT} AND issuetype = Story AND status = Backlog ORDER BY key ASC`,
  fields: ["summary", "status", "issuelinks", "story_points", "customfield_10016"],
  maxResults: 50,
});

console.log(`Found ${issues.length} Backlog stories:\n`);

for (const issue of issues) {
  const blockedBy = (issue.fields.issuelinks || [])
    .filter(l => l.type.name === "Blocks" && l.inwardIssue)
    .map(l => ({ key: l.inwardIssue.key, status: l.inwardIssue.fields?.status?.name }));

  // Also check "is blocked by" link type
  const isBlockedBy = (issue.fields.issuelinks || [])
    .filter(l => l.type.inward === "is blocked by" && l.inwardIssue)
    .map(l => ({ key: l.inwardIssue.key, status: l.inwardIssue.fields?.status?.name }));

  const allBlockers = [...blockedBy, ...isBlockedBy];
  const points = issue.fields.customfield_10016 ?? "?";

  console.log(`${issue.key}: ${issue.fields.summary} (${points} pts)`);
  if (allBlockers.length > 0) {
    console.log(`  BLOCKED BY: ${allBlockers.map(b => `${b.key} [${b.status}]`).join(", ")}`);
  }
}

// Now fetch full issue detail for the first story to check blockers properly
console.log("\n--- Checking blockers for FA-17 ---");
const detail = await get("/rest/api/3/issue/FA-17?fields=issuelinks,status,summary,customfield_10016");
console.log("Links:", JSON.stringify(detail.fields.issuelinks, null, 2));
