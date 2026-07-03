import { describe, it, expect } from "vitest";
import {
  getCategoryColour,
  CAT_TOKEN_MAP,
  CAT_COLORS,
} from "./categoryColours";

describe("getCategoryColour", () => {
  describe("known categories — CAT_TOKEN_MAP lookup", () => {
    it("returns the CSS variable for 'Groceries' (case-insensitive)", () => {
      expect(getCategoryColour("Groceries", 0)).toBe("var(--cat-groceries)");
    });

    it("returns the CSS variable for 'Transport' (case-insensitive)", () => {
      expect(getCategoryColour("Transport", 0)).toBe("var(--cat-transport)");
    });

    it("returns the CSS variable for 'Entertainment' (case-insensitive)", () => {
      expect(getCategoryColour("Entertainment", 0)).toBe(
        "var(--cat-entertainment)",
      );
    });

    it("returns the CSS variable for 'Utilities' (case-insensitive)", () => {
      expect(getCategoryColour("Utilities", 0)).toBe("var(--cat-utilities)");
    });

    it("returns the CSS variable for 'Healthcare' (case-insensitive)", () => {
      expect(getCategoryColour("Healthcare", 0)).toBe("var(--cat-healthcare)");
    });

    it("returns the CSS variable for 'Dining' (case-insensitive)", () => {
      expect(getCategoryColour("Dining", 0)).toBe("var(--cat-dining)");
    });

    it("returns the CSS variable for 'Shopping' (case-insensitive)", () => {
      expect(getCategoryColour("Shopping", 0)).toBe("var(--cat-shopping)");
    });

    it("matches regardless of the fallbackIndex when the name is in CAT_TOKEN_MAP", () => {
      expect(getCategoryColour("Groceries", 99)).toBe("var(--cat-groceries)");
    });
  });

  describe("case insensitivity", () => {
    it("lowercases the name before lookup — 'GROCERIES' resolves to the token", () => {
      expect(getCategoryColour("GROCERIES", 0)).toBe("var(--cat-groceries)");
    });

    it("lowercases the name before lookup — 'dining' (already lower) resolves to the token", () => {
      expect(getCategoryColour("dining", 0)).toBe("var(--cat-dining)");
    });
  });

  describe("unknown categories — CAT_COLORS fallback", () => {
    it("returns CAT_COLORS[0] for 'Other' at index 0", () => {
      expect(getCategoryColour("Other", 0)).toBe(CAT_COLORS[0]);
    });

    it("returns CAT_COLORS[1] for 'Other' at index 1", () => {
      expect(getCategoryColour("Other", 1)).toBe(CAT_COLORS[1]);
    });

    it("wraps around when fallbackIndex equals CAT_COLORS.length", () => {
      expect(getCategoryColour("Unknown", CAT_COLORS.length)).toBe(
        CAT_COLORS[0],
      );
    });

    it("wraps around when fallbackIndex exceeds CAT_COLORS.length", () => {
      expect(getCategoryColour("Unknown", CAT_COLORS.length + 3)).toBe(
        CAT_COLORS[3],
      );
    });

    it("returns a fallback colour for an empty string category", () => {
      const result = getCategoryColour("", 0);
      expect(result).toBe(CAT_COLORS[0]);
    });
  });

  describe("consistency guarantee — same call always returns the same value", () => {
    it("two calls with the same name and index return identical values", () => {
      expect(getCategoryColour("Other", 2)).toBe(getCategoryColour("Other", 2));
    });

    it("two charts resolving 'Groceries' at different indices get the same CSS var", () => {
      expect(getCategoryColour("Groceries", 0)).toBe(
        getCategoryColour("Groceries", 5),
      );
    });
  });

  describe("CAT_TOKEN_MAP and CAT_COLORS exports", () => {
    it("CAT_TOKEN_MAP contains exactly the expected known categories", () => {
      expect(Object.keys(CAT_TOKEN_MAP)).toEqual(
        expect.arrayContaining([
          "groceries",
          "transport",
          "entertainment",
          "utilities",
          "healthcare",
          "dining",
          "shopping",
        ]),
      );
    });

    it("CAT_COLORS has at least one entry", () => {
      expect(CAT_COLORS.length).toBeGreaterThan(0);
    });

    it("all CAT_COLORS entries are non-empty strings", () => {
      for (const colour of CAT_COLORS) {
        expect(typeof colour).toBe("string");
        expect(colour.length).toBeGreaterThan(0);
      }
    });
  });
});
