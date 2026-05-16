import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";
import type { ApiAsset, ApiLiability } from "../../types/api";
import { ACCOUNT_COLORS } from "../../constants/colors";

interface Props {
  assets: ApiAsset[];
  liabilities: ApiLiability[];
}

interface ChartEntry {
  name: string;
  value: number;
}

function groupByType(items: (ApiAsset | ApiLiability)[]): ChartEntry[] {
  const map = items.reduce<Record<string, number>>((acc, item) => {
    const v = parseFloat(item.value);
    acc[item.type] = (acc[item.type] ?? 0) + v;
    return acc;
  }, {});
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

const NZD = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
  maximumFractionDigits: 0,
});

export function NetWorthBreakdownChart({ assets, liabilities }: Props) {
  const assetData = groupByType(assets);
  const liabilityData = groupByType(liabilities);

  if (assets.length === 0 && liabilities.length === 0) {
    return (
      <p className="nw-breakdown__empty" data-testid="nw-breakdown-chart">
        Add assets and liabilities to see your breakdown.
      </p>
    );
  }

  return (
    <div className="nw-breakdown__charts" data-testid="nw-breakdown-chart">
      {assetData.length > 0 && (
        <div className="nw-breakdown__chart-wrap">
          <p className="nw-breakdown__chart-label">Assets by type</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={assetData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
              >
                {assetData.map((_entry, index) => (
                  <Cell
                    key={`asset-cell-${index}`}
                    fill={ACCOUNT_COLORS[index % ACCOUNT_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: ValueType | undefined) =>
                  NZD.format(Number(value ?? 0))
                }
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
      {liabilityData.length > 0 && (
        <div className="nw-breakdown__chart-wrap">
          <p className="nw-breakdown__chart-label">Liabilities by type</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={liabilityData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
              >
                {liabilityData.map((_entry, index) => (
                  <Cell
                    key={`liability-cell-${index}`}
                    fill={ACCOUNT_COLORS[index % ACCOUNT_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: ValueType | undefined) =>
                  NZD.format(Number(value ?? 0))
                }
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
