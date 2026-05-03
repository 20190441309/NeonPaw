"use client";
import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  statusLabel: string;
  statusHint?: ReactNode;
  footerHint?: string;
  headerAction?: ReactNode;
  onClick?: () => void;
}

export default function TerminalShell({ children, statusLabel, statusHint, footerHint, headerAction, onClick }: Props) {
  return (
    <div
      className="scanline terminal-flicker min-h-screen flex items-center justify-center p-3 sm:p-4"
      onClick={onClick}
    >
      <div className="w-full max-w-[720px] border border-[var(--terminal-border)] rounded-sm glow select-none">
        {/* Header */}
        <div className="flex justify-between items-center px-3 sm:px-4 py-2 border-b border-[var(--terminal-border)] text-[10px] sm:text-xs">
          <span className="glow-subtle tracking-wider">NEON PAW // TERMINAL PET OS</span>
          <div className="flex items-center gap-2">
            {headerAction}
            <span className="uppercase tracking-widest opacity-70">{statusLabel}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4">
          {children}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-3 sm:px-4 py-2 border-t border-[var(--terminal-border)] text-[10px] sm:text-xs">
          <div className="opacity-60">{statusHint}</div>
          <div className="opacity-40 tracking-wider">{footerHint}</div>
        </div>
      </div>
    </div>
  );
}
