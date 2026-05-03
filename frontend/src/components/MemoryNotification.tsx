"use client";

import { useEffect } from "react";

interface Props {
  content: string | null;
  onDismiss: () => void;
}

export default function MemoryNotification({ content, onDismiss }: Props) {
  useEffect(() => {
    if (!content) return;
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [content, onDismiss]);

  if (!content) return null;

  return (
    <div className="text-[10px] mt-2 text-center animate-fade-in">
      <span className="opacity-40 tracking-wider">MEMORY SAVED //</span>{" "}
      <span className="opacity-60 glow-subtle">{content}</span>
    </div>
  );
}
