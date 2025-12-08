import { describe, it, expect, beforeEach } from "vitest";
import {
  createSessionId,
  getHistory,
  appendMessage,
  resetSession,
  ChatMessage,
} from "@/lib/conversation-state";

describe("Conversation State", () => {
  let sessionId: string;

  beforeEach(() => {
    sessionId = createSessionId();
  });

  it("should create unique session IDs", () => {
    const id1 = createSessionId();
    const id2 = createSessionId();
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("should return empty history for new session", () => {
    const history = getHistory(sessionId);
    expect(history).toEqual([]);
  });

  it("should append messages to history", () => {
    const msg: ChatMessage = {
      role: "user",
      content: "Hello",
      createdAt: Date.now(),
    };
    appendMessage(sessionId, msg);

    const history = getHistory(sessionId);
    expect(history).toHaveLength(1);
    expect(history[0].content).toBe("Hello");
  });

  it("should maintain message order", () => {
    appendMessage(sessionId, { role: "user", content: "First", createdAt: 1 });
    appendMessage(sessionId, { role: "assistant", content: "Second", createdAt: 2 });
    appendMessage(sessionId, { role: "user", content: "Third", createdAt: 3 });

    const history = getHistory(sessionId);
    expect(history.map((m) => m.content)).toEqual(["First", "Second", "Third"]);
  });

  it("should trim history to max length", () => {
    for (let i = 0; i < 20; i++) {
      appendMessage(sessionId, {
        role: "user",
        content: `Message ${i}`,
        createdAt: i,
      });
    }

    const history = getHistory(sessionId);
    expect(history.length).toBeLessThanOrEqual(12);
    expect(history[history.length - 1].content).toBe("Message 19");
  });

  it("should reset session", () => {
    appendMessage(sessionId, { role: "user", content: "Hello", createdAt: 1 });
    resetSession(sessionId);

    const history = getHistory(sessionId);
    expect(history).toEqual([]);
  });

  it("should isolate sessions", () => {
    const session1 = createSessionId();
    const session2 = createSessionId();

    appendMessage(session1, { role: "user", content: "Session 1", createdAt: 1 });
    appendMessage(session2, { role: "user", content: "Session 2", createdAt: 1 });

    expect(getHistory(session1)[0].content).toBe("Session 1");
    expect(getHistory(session2)[0].content).toBe("Session 2");
  });
});
