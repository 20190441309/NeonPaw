"use client";

import { ChatMessage } from "@/lib/types";

interface Props {
  messages: ChatMessage[];
}

export default function ChatTranscript({ messages }: Props) {
  if (messages.length === 0) return null;

  return (
    <div className="mt-3 max-h-40 overflow-y-auto text-xs space-y-1">
      {messages.map((msg, i) => (
        <div key={i} className={msg.role === "user" ? "opacity-70" : "glow"}>
          <span className="uppercase">{msg.role === "user" ? "USER" : "PAW"}: </span>
          {msg.content}
        </div>
      ))}
    </div>
  );
}
