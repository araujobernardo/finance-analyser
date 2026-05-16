import { useState, useEffect } from "react";
import { useNetWorth } from "../context/NetWorthContext";
import { useApi } from "../lib/api";
import { AssetList } from "../components/net-worth/AssetList";
import { LiabilityList } from "../components/net-worth/LiabilityList";
import { NetWorthBreakdownChart } from "../components/net-worth/NetWorthBreakdownChart";
import { NetWorthHistoryChart } from "../components/net-worth/NetWorthHistoryChart";
import { SkeletonCard } from "../components/ui/SkeletonCard";
import type { ApiSnapshot } from "../types/api";
import "../components/net-worth/NetWorthPage.css";

const NZD = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
});

export default function NetWorthPage() {
  const { assets, liabilities, isLoading } = useNetWorth();
  const { apiFetch } = useApi();

  const [snapshots, setSnapshots] = useState<ApiSnapshot[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(true);

  const totalAssets = assets.reduce((sum, a) => sum + parseFloat(a.value), 0);
  const totalLiabilities = liabilities.reduce(
    (sum, l) => sum + parseFloat(l.value),
    0,
  );
  const netWorth = totalAssets - totalLiabilities;
  const netWorthPositive = netWorth >= 0;

  // Fetch snapshot history
  useEffect(() => {
    let cancelled = false;
    setSnapshotsLoading(true);
    apiFetch("/api/net-worth/snapshots")
      .then(async (res) => {
        if (cancelled) return;
        if (res.ok) {
          const data = (await res.json()) as ApiSnapshot[];
          if (!cancelled) setSnapshots(data);
        }
      })
      .catch(() => {
        // silently fail — history chart will show empty state
      })
      .finally(() => {
        if (!cancelled) setSnapshotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fire-and-forget daily snapshot POST once assets/liabilities have loaded
  useEffect(() => {
    if (!isLoading) {
      apiFetch("/api/net-worth/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalAssets, totalLiabilities }),
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  return (
    <div className="nw-page" data-testid="net-worth-page">
      <h1 className="nw-page__title">Net Worth</h1>

      {/* Summary bar */}
      <div className="nw-summary" data-testid="nw-summary">
        <div className="nw-summary__item">
          <span className="nw-summary__label">Total Assets</span>
          <span className="nw-summary__value" data-testid="total-assets">
            {isLoading ? "—" : NZD.format(totalAssets)}
          </span>
        </div>
        <div className="nw-summary__item">
          <span className="nw-summary__label">Total Liabilities</span>
          <span className="nw-summary__value" data-testid="total-liabilities">
            {isLoading ? "—" : NZD.format(totalLiabilities)}
          </span>
        </div>
        <div className="nw-summary__item">
          <span className="nw-summary__label">Net Worth</span>
          <span
            className={`nw-summary__value ${netWorthPositive ? "nw-summary__value--positive" : "nw-summary__value--negative"}`}
            data-testid="net-worth-value"
          >
            {isLoading ? "—" : NZD.format(netWorth)}
          </span>
        </div>
      </div>

      {/* Breakdown chart — visual composition of assets/liabilities by type */}
      {!isLoading && (
        <section className="nw-breakdown" data-testid="nw-breakdown">
          <NetWorthBreakdownChart assets={assets} liabilities={liabilities} />
        </section>
      )}

      {/* Two-column grid */}
      <div className="nw-columns">
        <AssetList />
        <LiabilityList />
      </div>

      {/* History chart */}
      <section className="nw-history-section" data-testid="nw-history-section">
        {snapshotsLoading ? (
          <SkeletonCard rows={3} />
        ) : (
          <NetWorthHistoryChart snapshots={snapshots} />
        )}
      </section>
    </div>
  );
}
