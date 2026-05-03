"use client";
import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  statusLabel: string;
  onClick?: () => void;
}

export default function TerminalShell({ children, statusLabel, onClick }: Props) {
  return (
    <div
      className="scanline terminal-flicker min-h-screen flex items-center justify-center p-4"
      onClick={onClick}
    >
      <div className="w-full max-w-[720px] border border-[var(--terminal-border)] rounded-sm glow select-none">
        <div className="flex justify-between items-center px-4 py-2 border-b border-[var(--terminal-border)] text-xs">
          <span>NEON PAW // TERMINAL PET OS</span>
          <span className="uppercase">{statusLabel}</span>
        </div>
        <div className="p-4">{children}</div>
        <div className="px-4 py-2 border-t border-[var(--terminal-border)] text-xs text-center opacity-60">
          TAP SCREEN TO ACTIVATE MICROPHONE
        </div>
      </div>
    </div>
  );
}
