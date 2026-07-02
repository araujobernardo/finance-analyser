// FA-BANK-017 — Auto-sync on login if last sync was >24 hours ago

import { useEffect, useRef } from "react";
import type { ApiAkahuConnection } from "../types/api";

const HOURS_24_MS = 24 * 60 * 60 * 1000;

function isOlderThan24Hours(lastSyncedAt: string): boolean {
  const syncedAt = new Date(lastSyncedAt).getTime();
  return Date.now() - syncedAt >= HOURS_24_MS;
}

/**
 * Triggers a bank sync automatically when the connection data is first loaded,
 * if `lastSyncedAt` is null or older than 24 hours.
 *
 * Called from Sidebar (or BankContext consumers) after connection data is available.
 * Only fires once per mount to avoid repeated syncs on context re-renders.
 */
export function useAutoSync(
  connection: ApiAkahuConnection | null,
  isLoading: boolean,
  syncNow: () => Promise<void>,
): void {
  // Track whether we have already triggered the auto-sync for this session.
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    // Wait until the connection fetch has resolved.
    if (isLoading) return;
    // Already fired this session — do not sync again.
    if (hasSyncedRef.current) return;
    // No connection → no sync.
    if (connection === null) return;

    const shouldSync =
      connection.lastSyncedAt === null ||
      isOlderThan24Hours(connection.lastSyncedAt);

    if (shouldSync) {
      hasSyncedRef.current = true;
      syncNow().catch(() => {
        // syncNow already surfaces errors via toast; swallow here.
      });
    }
  }, [connection, isLoading, syncNow]);
}
