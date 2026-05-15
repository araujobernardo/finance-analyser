import { useNetWorth } from "../context/NetWorthContext";
import { AssetList } from "../components/net-worth/AssetList";
import { LiabilityList } from "../components/net-worth/LiabilityList";
import "../components/net-worth/NetWorthPage.css";

const NZD = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
});

export default function NetWorthPage() {
  const { assets, liabilities, isLoading } = useNetWorth();

  const totalAssets = assets.reduce((sum, a) => sum + parseFloat(a.value), 0);
  const totalLiabilities = liabilities.reduce(
    (sum, l) => sum + parseFloat(l.value),
    0,
  );
  const netWorth = totalAssets - totalLiabilities;
  const netWorthPositive = netWorth >= 0;

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

      {/* Two-column grid */}
      <div className="nw-columns">
        <AssetList />
        <LiabilityList />
      </div>
    </div>
  );
}
