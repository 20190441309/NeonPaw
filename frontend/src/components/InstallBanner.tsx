"use client";

import { useInstallPrompt } from "@/hooks/useInstallPrompt";

export default function InstallBanner() {
  const { canInstall, install, dismiss } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-2 border-t border-[var(--terminal-border)] bg-[var(--terminal-bg)]/95 backdrop-blur-sm text-[10px]">
      <span className="opacity-60 tracking-wider">
        📦 INSTALL NEON PAW
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={install}
          className="px-2 py-0.5 border border-[var(--terminal-text)]/50 text-[var(--terminal-text)] opacity-70 hover:opacity-100 transition-opacity tracking-wider"
        >
          INSTALL
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="opacity-30 hover:opacity-60 transition-opacity"
        >
          [X]
        </button>
      </div>
    </div>
  );
}
