// Category colour tokens — maps lowercase category names to --cat-* CSS variables.
// Falls back to the CAT_COLORS array for categories not in this map.
export const CAT_TOKEN_MAP: Record<string, string> = {
  groceries: "var(--cat-groceries)",
  transport: "var(--cat-transport)",
  entertainment: "var(--cat-entertainment)",
  utilities: "var(--cat-utilities)",
  healthcare: "var(--cat-healthcare)",
  dining: "var(--cat-dining)",
  shopping: "var(--cat-shopping)",
};

// Fallback palette for categories not covered by --cat-* tokens.
export const CAT_COLORS: string[] = [
  "#6C8EBF",
  "#82B366",
  "#D79B00",
  "#AE4132",
  "#9673A6",
  "#006EAF",
  "#23850B",
  "#BD7000",
  "#6E0023",
  "#603E8A",
  "#0E7A8A",
];

/**
 * Returns the colour for a given category name.
 * Checks CAT_TOKEN_MAP first (by lowercase name), then falls back to
 * CAT_COLORS using the provided fallbackIndex.
 */
export function getCategoryColour(name: string, fallbackIndex: number): string {
  return (
    CAT_TOKEN_MAP[name.toLowerCase()] ??
    CAT_COLORS[fallbackIndex % CAT_COLORS.length]
  );
}
