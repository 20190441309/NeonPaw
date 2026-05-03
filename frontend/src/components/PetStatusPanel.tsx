"use client";
import { PetState } from "@/lib/types";

interface Props {
  state: PetState;
}

function Bar({ label, value }: { label: string; value: number }) {
  const filled = Math.round(value / 10);
  const empty = 10 - filled;
  return (
    <div className="flex items-center gap-2 text-[10px] sm:text-xs">
      <span className="w-16 sm:w-20 uppercase opacity-50 tracking-wider">{label}</span>
      <span className="status-bar-fill">{"█".repeat(filled)}</span>
      <span className="status-bar-empty">{"░".repeat(empty)}</span>
      <span className="w-6 text-right opacity-30">{value}</span>
    </div>
  );
}

export default function PetStatusPanel({ state }: Props) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 pt-3 border-t border-[var(--terminal-border)]">
      <Bar label="Energy" value={state.energy} />
      <Bar label="Mood" value={state.mood} />
      <Bar label="Bond" value={state.affinity} />
      <Bar label="Hunger" value={state.hunger} />
      <Bar label="Stability" value={state.stability} />
    </div>
  );
}
