import { v4 as uuid } from "uuid";

export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  name?: string;
  toolCallId?: string;
  createdAt: number;
}

const sessions = new Map<string, ChatMessage[]>();
const MAX_HISTORY = 12;

export function createSessionId() {
  return uuid();
}

export function getHistory(sessionId: string): ChatMessage[] {
  return sessions.get(sessionId) ?? [];
}

export function appendMessage(sessionId: string, message: ChatMessage) {
  const history = sessions.get(sessionId) ?? [];
  const trimmed = [...history, message].slice(-MAX_HISTORY);
  sessions.set(sessionId, trimmed);
}

export function resetSession(sessionId: string) {
  sessions.delete(sessionId);
}
