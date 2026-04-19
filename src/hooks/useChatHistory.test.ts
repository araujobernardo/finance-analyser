import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChatHistory } from "./useChatHistory";
import * as chatStorage from "../services/chatStorage";

vi.mock("../services/chatStorage");

const mockLoad = vi.mocked(chatStorage.loadChatHistory);
const mockSave = vi.mocked(chatStorage.saveChatHistory);

beforeEach(() => {
  vi.clearAllMocks();
  mockLoad.mockReturnValue([]);
});

describe("useChatHistory", () => {
  describe("initial load", () => {
    it("starts with empty display messages when no history", () => {
      mockLoad.mockReturnValue([]);
      const { result } = renderHook(() => useChatHistory());
      expect(result.current.displayMessages).toHaveLength(0);
    });

    it("loads persisted messages on mount", () => {
      mockLoad.mockReturnValue([
        { role: "user", content: "Hello", timestamp: "2026-01-01T00:00:00Z" },
        {
          role: "assistant",
          content: "Hi there",
          timestamp: "2026-01-01T00:00:01Z",
        },
      ]);
      const { result } = renderHook(() => useChatHistory());
      expect(result.current.displayMessages).toHaveLength(2);
      expect(result.current.displayMessages[0]).toMatchObject({
        role: "user",
        text: "Hello",
      });
      expect(result.current.displayMessages[1]).toMatchObject({
        role: "bot",
        text: "Hi there",
      });
    });

    it("populates apiHistory from persisted messages", () => {
      mockLoad.mockReturnValue([
        { role: "user", content: "Hello", timestamp: "2026-01-01T00:00:00Z" },
      ]);
      const { result } = renderHook(() => useChatHistory());
      expect(result.current.apiHistory).toHaveLength(1);
      expect(result.current.apiHistory[0]).toEqual({
        role: "user",
        content: "Hello",
      });
    });
  });

  describe("appendUserMessage", () => {
    it("adds a user message to displayMessages", () => {
      const { result } = renderHook(() => useChatHistory());
      act(() => result.current.appendUserMessage("Test message"));
      expect(result.current.displayMessages).toHaveLength(1);
      expect(result.current.displayMessages[0]).toMatchObject({
        role: "user",
        text: "Test message",
      });
    });

    it("persists immediately after appendUserMessage", () => {
      const { result } = renderHook(() => useChatHistory());
      act(() => result.current.appendUserMessage("Test message"));
      expect(mockSave).toHaveBeenCalledWith(
        "global",
        expect.arrayContaining([
          expect.objectContaining({ role: "user", content: "Test message" }),
        ]),
      );
    });

    it("adds user message to apiHistory", () => {
      const { result } = renderHook(() => useChatHistory());
      act(() => result.current.appendUserMessage("Test message"));
      expect(result.current.apiHistory).toHaveLength(1);
      expect(result.current.apiHistory[0]).toMatchObject({
        role: "user",
        content: "Test message",
      });
    });
  });

  describe("setStreamingMessage and markStreamingDone", () => {
    it("shows streaming bubble during streaming", () => {
      const { result } = renderHook(() => useChatHistory());
      act(() => result.current.setStreamingMessage("partial response"));
      expect(result.current.displayMessages).toHaveLength(1);
      expect(result.current.displayMessages[0]).toMatchObject({
        role: "bot",
        text: "partial response",
        isStreaming: true,
      });
    });

    it("does not persist during streaming", () => {
      const { result } = renderHook(() => useChatHistory());
      act(() => result.current.setStreamingMessage("partial response"));
      expect(mockSave).not.toHaveBeenCalled();
    });

    it("persists after markStreamingDone", () => {
      const { result } = renderHook(() => useChatHistory());
      act(() => result.current.setStreamingMessage("completed response"));
      act(() => result.current.markStreamingDone());
      expect(mockSave).toHaveBeenCalledWith(
        "global",
        expect.arrayContaining([
          expect.objectContaining({
            role: "assistant",
            content: "completed response",
          }),
        ]),
      );
    });

    it("removes streaming bubble after markStreamingDone", () => {
      const { result } = renderHook(() => useChatHistory());
      act(() => result.current.setStreamingMessage("completed response"));
      act(() => result.current.markStreamingDone());
      const streaming = result.current.displayMessages.find(
        (m) => m.isStreaming,
      );
      expect(streaming).toBeUndefined();
    });
  });

  describe("setError", () => {
    it("shows error in UI", () => {
      const { result } = renderHook(() => useChatHistory());
      act(() => result.current.setError("Network failure"));
      expect(result.current.displayMessages).toHaveLength(1);
      expect(result.current.displayMessages[0].text).toContain(
        "Error: Network failure",
      );
    });

    it("does NOT persist error messages", () => {
      const { result } = renderHook(() => useChatHistory());
      act(() => result.current.setError("Network failure"));
      // save should not be called for errors
      expect(mockSave).not.toHaveBeenCalled();
    });
  });

  describe("100-message trim", () => {
    it("passes all messages to saveChatHistory which trims to 100", () => {
      // saveChatHistory internally trims; we just verify it is called
      const { result } = renderHook(() => useChatHistory());
      act(() => result.current.appendUserMessage("message"));
      expect(mockSave).toHaveBeenCalledWith("global", expect.any(Array));
    });
  });
});
