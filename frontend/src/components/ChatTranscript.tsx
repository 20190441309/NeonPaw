"use client";

import { ChatMessage } from "@/lib/types";

interface Props {
  messages: ChatMessage[];
}

export default function ChatTranscript({ messages }: Props) {
  if (messages.length === 0) return null;

  return (
    <div className="mt-4 max-h-44 overflow-y-auto terminal-scroll space-y-2.5 border-t border-[var(--terminal-border)] pt-4">
      {messages.map((msg, i) => (
        <div key={i} className="text-xs animate-fade-in">
          <div className={`flex gap-2 ${msg.role === "user" ? "opacity-50" : "glow-subtle"}`}>
            <span className="inline-block w-8 uppercase tracking-wider opacity-60 shrink-0 text-right">
              {msg.role === "user" ? "USR" : "PAW"}
            </span>
            <span className={msg.role === "assistant" ? "line-clamp-3" : ""}>
              {msg.content}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
