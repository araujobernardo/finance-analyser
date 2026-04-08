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

const apiKey = env.VITE_ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("❌ VITE_ANTHROPIC_API_KEY not found in .env");
  process.exit(1);
}

console.log("Testing Claude API connection...");

const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 32,
    messages: [{ role: "user", content: "Reply with only: OK" }],
  }),
});

if (!res.ok) {
  const text = await res.text();
  console.error(`❌ API error ${res.status}: ${text}`);
  process.exit(1);
}

const data = await res.json();
const reply = data.content?.[0]?.text ?? "(no response)";
console.log(`✓ API key valid. Response: "${reply}"`);
