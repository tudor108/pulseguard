import type { ChatMessage } from "./types";

export const chatMessagesMock: ChatMessage[] = [
  {
    id: "m-system",
    role: "system",
    content:
      "Agentul PulseGuard AI este pregatit. Poti intreba despre risc de epuizare, personal sau planuri de interventie.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: "m-1",
    role: "assistant",
    content:
      "Buna dimineata - riscul de epuizare ATI urca spre 86 in urmatoarele 14 zile. Factorii principali sunt turele de noapte grupate si orele suplimentare peste pragul de 12h.",
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
