const RULES_KEY = "finance_analyser_category_rules";

/** Normalises a description for consistent rule matching. */
function normalise(description: string): string {
  return description.toLowerCase().trim();
}

/** Returns all stored description→category rules. Keys are normalised descriptions. */
export function loadRules(): Record<string, string> {
  try {
    const raw = localStorage.getItem(RULES_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

/**
 * Saves a rule mapping a description to a category.
 * Silently ignores empty descriptions.
 */
export function saveRule(description: string, category: string): void {
  const key = normalise(description);
  if (!key) return;
  const rules = loadRules();
  rules[key] = category;
  localStorage.setItem(RULES_KEY, JSON.stringify(rules));
}

/** Deletes the rule for the given normalised description key. */
export function deleteRule(normalisedKey: string): void {
  const rules = loadRules();
  delete rules[normalisedKey];
  localStorage.setItem(RULES_KEY, JSON.stringify(rules));
}

/**
 * Given a description, returns the stored category rule if one exists,
 * or undefined if not. Matching is case-insensitive and trims whitespace.
 */
export function getRuleForDescription(description: string): string | undefined {
  return loadRules()[normalise(description)];
}
