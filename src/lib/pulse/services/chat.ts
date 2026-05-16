import type { ChatMessage } from "./types";

export const chatMessagesMock: ChatMessage[] = [
  {
    id: "m-system",
    role: "system",
    content: "PulseGuard AI assistant ready. Ask about burnout risk, staffing, or intervention plans.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: "m-1",
    role: "assistant",
    content: "Good morning — ICU burnout risk is trending toward 86 over the next 14 days. The main drivers are night-shift clustering and overtime above the 12h soft cap.",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
];

export function makeChatMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: `m-${Math.random().toString(36).slice(2, 9)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}