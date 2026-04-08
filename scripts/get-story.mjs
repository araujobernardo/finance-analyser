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
const HEADERS = { Authorization: AUTH, Accept: "application/json" };

const key = process.argv[2] || "FA-17";
const res = await fetch(`${BASE_URL}/rest/api/3/issue/${key}?fields=summary,description,status,customfield_10016`, { headers: HEADERS });
const issue = await res.json();

console.log(`${issue.key}: ${issue.fields.summary}`);
console.log(`Status: ${issue.fields.status.name}`);
console.log(`Points: ${issue.fields.customfield_10016 ?? "unset"}`);
console.log("\n--- Description (ADF text content) ---");

function extractText(node) {
  if (!node) return "";
  if (node.type === "text") return node.text;
  if (node.content) return node.content.map(extractText).join(node.type === "listItem" ? "" : node.type === "bulletList" ? "" : "");
  return "";
}

function printNode(node, indent = "") {
  if (node.type === "heading") {
    console.log(`\n${indent}## ${node.content.map(n => n.text).join("")}`);
  } else if (node.type === "paragraph") {
    const text = node.content?.map(n => n.text ?? "").join("") ?? "";
    if (text) console.log(`${indent}${text}`);
  } else if (node.type === "bulletList") {
    node.content.forEach(item => {
      const text = item.content?.flatMap(p => p.content?.map(n => n.text ?? "") ?? []).join("") ?? "";
      console.log(`${indent}  • ${text}`);
    });
  } else if (node.content) {
    node.content.forEach(child => printNode(child, indent));
  }
}

if (issue.fields.description) {
  issue.fields.description.content.forEach(node => printNode(node));
}
