import type { PfaAccountAliases } from "../types/pfa";

// ── ASB account name extraction ──────────────────────────────────────────────

export function parseAccountName(
  text: string,
  aliases: PfaAccountAliases,
): { short: string; display: string } {
  const lines = text.split(/\r?\n/);
  const line = (lines[1] ?? "").replace(/,+$/, "").trim();
  if (line.includes("Account") && line.includes("Branch")) {
    const nick = line.match(/\(([^)]+)\)/)?.[1]?.trim() ?? null;
    const num = line.match(/Account\s+([\w-]+)/)?.[1]?.trim() ?? null;
    const short = num ?? nick ?? line.slice(0, 20);
    const baseDisplay =
      nick && num
        ? `${nick} ···${num.slice(-6)}`
        : (nick ?? num ?? line.slice(0, 30));
    return { short, display: aliases[short] ?? baseDisplay };
  }
  return { short: "Main", display: aliases["Main"] ?? "Main Account" };
}
