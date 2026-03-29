import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter(line => line.includes("="))
    .map(line => { const i = line.indexOf("="); return [line.slice(0, i).trim(), line.slice(i + 1).trim()]; })
);

const BASE_URL  = env.VITE_JIRA_BASE_URL;
const EMAIL     = env.VITE_JIRA_EMAIL;
const API_TOKEN = env.VITE_JIRA_API_TOKEN;

const AUTH = "Basic " + Buffer.from(`${EMAIL}:${API_TOKEN}`).toString("base64");

const res = await fetch(`${BASE_URL}/rest/api/3/myself`, {
  headers: { Authorization: AUTH, Accept: "application/json" },
});

if (res.ok) {
  const { displayName } = await res.json();
  console.log(`Connection successful - logged in as: ${displayName}`);
} else {
  const text = await res.text();
  console.log(`Connection failed: ${res.status} ${res.statusText} - ${text}`);
}
