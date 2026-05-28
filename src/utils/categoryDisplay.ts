// Category display mapping for the RecentTransactions widget.
// Maps lowercase category names to emoji, icon background, and dot colour.

export interface CategoryDisplay {
  emoji: string;
  iconBg: string;
  dotColor: string;
}

const CATEGORY_MAP: Record<string, CategoryDisplay> = {
  groceries: {
    emoji: "🛒",
    iconBg: "#e8f4ec",
    dotColor: "var(--cat-groceries)",
  },
  transport: {
    emoji: "🚌",
    iconBg: "#e9f2f8",
    dotColor: "var(--cat-transport)",
  },
  income: {
    emoji: "💰",
    iconBg: "#e8f5f3",
    dotColor: "var(--accent)",
  },
  dining: {
    emoji: "🍽️",
    iconBg: "#fdf3e8",
    dotColor: "var(--cat-dining)",
  },
  utilities: {
    emoji: "⚡",
    iconBg: "#fef9ec",
    dotColor: "var(--cat-utilities)",
  },
  healthcare: {
    emoji: "🏥",
    iconBg: "#fdf3f3",
    dotColor: "var(--cat-healthcare)",
  },
  entertainment: {
    emoji: "🎬",
    iconBg: "#f3f0f9",
    dotColor: "var(--cat-entertainment)",
  },
  shopping: {
    emoji: "🛍️",
    iconBg: "#e8f5f3",
    dotColor: "var(--accent-mid)",
  },
};

const FALLBACK_DISPLAY: CategoryDisplay = {
  emoji: "💳",
  iconBg: "#f4f1ed",
  dotColor: "var(--muted)",
};

export function getCategoryDisplay(category: string | null): CategoryDisplay {
  if (!category) return FALLBACK_DISPLAY;
  return CATEGORY_MAP[category.toLowerCase()] ?? FALLBACK_DISPLAY;
}

const DATE_LABEL_FMT = new Intl.DateTimeFormat("en-NZ", {
  day: "numeric",
  month: "short",
});

const AMT_FMT = new Intl.NumberFormat("en-NZ", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return DATE_LABEL_FMT.format(d);
}

export function formatTxnAmount(amount: number): string {
  const abs = `$${AMT_FMT.format(Math.abs(amount))}`;
  return amount > 0 ? `+${abs}` : `−${abs}`;
}
