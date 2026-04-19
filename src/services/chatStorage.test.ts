import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  loadChatHistory,
  saveChatHistory,
  clearChatHistory,
} from "./chatStorage";

// Use jsdom's localStorage directly (provided by the vitest environment)
beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

const STORAGE_KEY = "finance-analyser-chat";

describe("loadChatHistory", () => {
  it("returns empty array when no data exists for the given key", () => {
    expect(loadChatHistory("global")).toEqual([]);
  });

  it("returns empty array for an unknown accountId", () => {
    expect(loadChatHistory("nonexistent")).toEqual([]);
  });

  it("returns persisted messages for the given accountId", () => {
    const messages = [
      {
        role: "user" as const,
        content: "Hello",
        timestamp: "2026-01-01T00:00:00Z",
      },
      {
        role: "assistant" as const,
        content: "Hi there",
        timestamp: "2026-01-01T00:00:01Z",
      },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ global: messages }));
    expect(loadChatHistory("global")).toEqual(messages);
  });

  it("returns empty array for different accountId than stored", () => {
    const messages = [
      {
        role: "user" as const,
        content: "Hello",
        timestamp: "2026-01-01T00:00:00Z",
      },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ "other-id": messages }));
    expect(loadChatHistory("global")).toEqual([]);
  });

  it("returns empty array when localStorage contains corrupt JSON", () => {
    localStorage.setItem(STORAGE_KEY, "not valid json{{{");
    expect(loadChatHistory("global")).toEqual([]);
  });
});

describe("saveChatHistory", () => {
  it("persists messages to localStorage under the given accountId", () => {
    const messages = [
      {
        role: "user" as const,
        content: "Test",
        timestamp: "2026-01-01T00:00:00Z",
      },
    ];
    saveChatHistory("global", messages);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.global).toEqual(messages);
  });

  it("trims to the last 100 messages when more than 100 are provided", () => {
    const messages = Array.from({ length: 120 }, (_, i) => ({
      role: "user" as const,
      content: `Message ${i}`,
      timestamp: "2026-01-01T00:00:00Z",
    }));
    saveChatHistory("global", messages);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.global).toHaveLength(100);
    // Should keep the last 100 (messages 20..119)
    expect(stored.global[0].content).toBe("Message 20");
    expect(stored.global[99].content).toBe("Message 119");
  });

  it("keeps all messages when exactly 100 are provided", () => {
    const messages = Array.from({ length: 100 }, (_, i) => ({
      role: "user" as const,
      content: `Message ${i}`,
      timestamp: "2026-01-01T00:00:00Z",
    }));
    saveChatHistory("global", messages);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.global).toHaveLength(100);
  });

  it("does not overwrite messages for other accountIds", () => {
    const otherMessages = [
      {
        role: "user" as const,
        content: "Other account message",
        timestamp: "2026-01-01T00:00:00Z",
      },
    ];
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ "other-id": otherMessages }),
    );

    saveChatHistory("global", [
      {
        role: "user" as const,
        content: "Global message",
        timestamp: "2026-01-01T00:00:00Z",
      },
    ]);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored["other-id"]).toEqual(otherMessages);
    expect(stored.global).toHaveLength(1);
  });

  it("handles storage write errors silently without throwing", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
    expect(() =>
      saveChatHistory("global", [
        {
          role: "user" as const,
          content: "test",
          timestamp: "2026-01-01T00:00:00Z",
        },
      ]),
    ).not.toThrow();
  });
});

describe("clearChatHistory", () => {
  it("removes all messages for the given accountId", () => {
    const messages = [
      {
        role: "user" as const,
        content: "Hello",
        timestamp: "2026-01-01T00:00:00Z",
      },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ global: messages }));

    clearChatHistory("global");

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.global).toBeUndefined();
  });

  it("does not affect other accountIds when clearing one", () => {
    const globalMessages = [
      {
        role: "user" as const,
        content: "Global",
        timestamp: "2026-01-01T00:00:00Z",
      },
    ];
    const otherMessages = [
      {
        role: "user" as const,
        content: "Other",
        timestamp: "2026-01-01T00:00:00Z",
      },
    ];
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ global: globalMessages, "other-id": otherMessages }),
    );

    clearChatHistory("global");

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.global).toBeUndefined();
    expect(stored["other-id"]).toEqual(otherMessages);
  });

  it("is a no-op when the accountId has no stored history", () => {
    expect(() => clearChatHistory("nonexistent")).not.toThrow();
  });

  it("handles storage write errors silently without throwing", () => {
    const messages = [
      {
        role: "user" as const,
        content: "Hello",
        timestamp: "2026-01-01T00:00:00Z",
      },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ global: messages }));

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
    expect(() => clearChatHistory("global")).not.toThrow();
  });
});
