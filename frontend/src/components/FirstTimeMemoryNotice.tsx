"use client";

import { useEffect } from "react";

interface Props {
  onDismiss: () => void;
}

export default function FirstTimeMemoryNotice({ onDismiss }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="text-[10px] mt-2 text-center animate-fade-in">
      <span className="opacity-40 tracking-wider">MEMORY SAVED LOCALLY //</span>{" "}
      <span className="opacity-50 glow-subtle">You can delete it in MEMORY BANK</span>
    </div>
  );
}
