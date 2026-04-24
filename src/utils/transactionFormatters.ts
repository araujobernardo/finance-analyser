import type { PfaCategory } from "../types/pfa";

export const fmt = (n: number) =>
  `$${Math.abs(n).toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtMonth = (m: string) => {
  if (!m) return "";
  const [y, mo] = m.split("-");
  return new Date(+y, +mo - 1, 1).toLocaleString("en-NZ", {
    month: "long",
    year: "numeric",
  });
};

export const getCatColor = (name: string | null, cats: PfaCategory[]) =>
  cats.find((c) => c.name === name)?.color ?? "#64748b";
