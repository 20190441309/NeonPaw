"use client";
import { PetState } from "@/lib/types";

interface Props {
  state: PetState;
}

function Bar({ label, value }: { label: string; value: number }) {
  const filled = Math.round(value / 10);
  const empty = 10 - filled;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 uppercase opacity-70">{label}</span>
      <span className="status-bar-fill">{"█".repeat(filled)}</span>
      <span className="status-bar-empty">{"░".repeat(empty)}</span>
      <span className="w-8 text-right opacity-50">{value}</span>
    </div>
  );
}

export default function PetStatusPanel({ state }: Props) {
  return (
    <div className="grid grid-cols-2 gap-1 mt-3">
      <Bar label="Energy" value={state.energy} />
      <Bar label="Mood" value={state.mood} />
      <Bar label="Affinity" value={state.affinity} />
      <Bar label="Hunger" value={state.hunger} />
      <Bar label="Stability" value={state.stability} />
    </div>
  );
}
