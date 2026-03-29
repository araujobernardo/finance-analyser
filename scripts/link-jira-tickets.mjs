/**
 * One-shot script: links the dependencies between the stories created in
 * the second run (FA-13 – FA-32). Run with: node scripts/link-jira-tickets.mjs
 */

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
const HEADERS = {
  Authorization: AUTH,
  "Content-Type": "application/json",
  Accept: "application/json",
};

async function linkIssues(inwardKey, outwardKey) {
  const res = await fetch(`${BASE_URL}/rest/api/3/issueLink`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      type: { name: "Blocks" },
      inwardIssue: { key: inwardKey },
      outwardIssue: { key: outwardKey },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Link ${inwardKey}→${outwardKey} failed: ${res.status} ${res.statusText}: ${text}`);
  }
}

// Keys from the second run (FA-13 – FA-32), mapped to story refs
const keys = {
  s1_1: "FA-13",
  s1_2: "FA-14",
  s1_4: "FA-15",
  s1_3: "FA-16",
  s2_1: "FA-17",
  s2_2: "FA-18",
  s2_3: "FA-19",
  s3_0: "FA-20",
  s3_1: "FA-21",
  s3_2: "FA-22",
  s3_3: "FA-23",
  s3_4: "FA-24",
  s3_5: "FA-25",
  s3_6: "FA-26",
  s4_1: "FA-27",
  s4_2: "FA-28",
  s5_1: "FA-29",
  s5_2: "FA-30",
  s6_1: "FA-31",
  s6_2: "FA-32",
};

const deps = [
  // s1_2 depends on s1_1
  ["s1_1", "s1_2"],
  // s1_4 depends on s1_2
  ["s1_2", "s1_4"],
  // s1_3 depends on s1_2 and s1_4
  ["s1_2", "s1_3"],
  ["s1_4", "s1_3"],
  // s2_1 depends on s1_4
  ["s1_4", "s2_1"],
  // s2_2 depends on s2_1
  ["s2_1", "s2_2"],
  // s2_3 depends on s2_2
  ["s2_2", "s2_3"],
  // s3_1 depends on s1_4
  ["s1_4", "s3_1"],
  // s3_2 depends on s3_1
  ["s3_1", "s3_2"],
  // s3_3 depends on s3_2
  ["s3_2", "s3_3"],
  // s3_4 depends on s3_3
  ["s3_3", "s3_4"],
  // s3_5 depends on s3_3
  ["s3_3", "s3_5"],
  // s3_6 depends on s3_1
  ["s3_1", "s3_6"],
  // s4_1 depends on s1_4
  ["s1_4", "s4_1"],
  // s4_2 depends on s4_1
  ["s4_1", "s4_2"],
  // s5_2 depends on s5_1 and s3_3
  ["s5_1", "s5_2"],
  ["s3_3", "s5_2"],
  // s6_2 depends on s6_1 and s1_4
  ["s6_1", "s6_2"],
  ["s1_4", "s6_2"],
];

console.log("=== Linking Dependencies ===\n");

for (const [blockerRef, blockedRef] of deps) {
  const blockerKey = keys[blockerRef];
  const blockedKey = keys[blockedRef];
  await linkIssues(blockerKey, blockedKey);
  console.log(`Linked: ${blockerKey} blocks ${blockedKey}`);
}

console.log("\n=== Done — all dependencies linked ===");
