// Map of account short-name → display alias override.
type AccountAliases = Record<string, string>;

// ── ASB account name extraction ──────────────────────────────────────────────

/**
 * Parses the account name from an ASB-format CSV export string.
 *
 * Stability invariant (US2 / #117):
 * This function is deterministic — given the same CSV text and aliases map it
 * always returns the same `short` value.  Specifically, `short` is set to the
 * account number extracted from the CSV (`num ?? nick ?? ...`), so re-importing
 * a CSV for `0549256-53` will always produce `short === "0549256-53"`, ensuring
 * the new transactions are appended to the correct existing account rather than
 * creating a duplicate.  The Phase 2 fix (#116) — changing `nick ?? num` to
 * `num ?? nick` — is what establishes this invariant.
 */
export function parseAccountName(
  text: string,
  aliases: AccountAliases,
): { short: string; display: string } {
  const lines = text.split(/\r?\n/);
  const line = (lines[1] ?? "").replace(/,+$/, "").trim();
  if (line.includes("Account") && line.includes("Branch")) {
    const nick = line.match(/\(([^)]+)\)/)?.[1]?.trim() ?? null;
    const num = line.match(/Account\s+([\w-]+)/)?.[1]?.trim() ?? null;
    const short = num ?? nick ?? line.slice(0, 20);
    const baseDisplay =
      nick && num ? `${nick} (${num})` : (nick ?? num ?? line.slice(0, 30));
    return { short, display: aliases[short] ?? baseDisplay };
  }
  return { short: "Main", display: aliases["Main"] ?? "Main Account" };
}
