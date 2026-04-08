/**
 * Updates story points (customfield_10016) for a list of Jira issues.
 * Run with: node scripts/update-story-points.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((line) => line.includes("="))
    .map((line) => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    })
);

const BASE_URL  = env.VITE_JIRA_BASE_URL;
const EMAIL     = env.VITE_JIRA_EMAIL;
const API_TOKEN = env.VITE_JIRA_API_TOKEN;

const AUTH = "Basic " + Buffer.from(`${EMAIL}:${API_TOKEN}`).toString("base64");
const HEADERS = {
  Authorization: AUTH,
  "Content-Type": "application/json",
  Accept: "application/json",
};

const storyPoints = {
  "FA-17": 5,
  "FA-18": 3,
  "FA-19": 3,
  "FA-20": 3,
  "FA-21": 2,
  "FA-22": 2,
  "FA-23": 3,
  "FA-24": 2,
  "FA-25": 3,
  "FA-26": 2,
  "FA-27": 3,
  "FA-28": 5,
  "FA-29": 3,
  "FA-30": 3,
  "FA-31": 2,
  "FA-32": 5,
};

for (const [key, points] of Object.entries(storyPoints)) {
  const res = await fetch(`${BASE_URL}/rest/api/3/issue/${key}`, {
    method: "PUT",
    headers: HEADERS,
    body: JSON.stringify({ fields: { customfield_10016: points } }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`✗ ${key}: ${res.status} ${res.statusText} — ${text}`);
  } else {
    console.log(`✓ ${key}: set to ${points} points`);
  }
}

console.log("\nDone.");
