"use client";

import { useState } from "react";
import { MemoryEntry, MemoryCategory } from "@/lib/types";

const CATEGORY_LABELS: Record<MemoryCategory, string> = {
  name: "NAME",
  preference: "PREF",
  goal: "GOAL",
  habit: "HABIT",
  project: "PROJ",
  custom: "NOTE",
};

interface Props {
  memories: MemoryEntry[];
  backendAvailable: boolean;
  onRemove?: (idOrIndex: number) => void;
  onUpdate?: (id: number, patch: { content?: string; category?: MemoryCategory }) => void;
  onClearAll?: () => void;
  onExport?: () => void;
  onImport?: (file: File) => void;
  importResult?: { imported: number; skipped: number } | null;
}

export default function MemoryPanel({ memories, backendAvailable, onRemove, onUpdate, onClearAll, onExport, onImport, importResult }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [showHow, setShowHow] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [filterCategory, setFilterCategory] = useState<MemoryCategory | "all">("all");

  if (memories.length === 0) return null;

  const filtered = filterCategory === "all"
    ? memories
    : memories.filter((m) => m.category === filterCategory);

  const categories = [...new Set(memories.map((m) => m.category).filter(Boolean))] as MemoryCategory[];

  const startEdit = (m: MemoryEntry) => {
    setEditingId(m.id ?? null);
    setEditContent(m.content);
  };

  const saveEdit = () => {
    if (editingId != null && onUpdate && editContent.trim()) {
      onUpdate(editingId, { content: editContent.trim() });
    }
    setEditingId(null);
    setEditContent("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  return (
    <div className="mt-3 text-[10px] border border-[var(--terminal-border)]/50 rounded-sm bg-[var(--terminal-accent)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-1.5 opacity-40 hover:opacity-70 transition-opacity tracking-wider"
      >
        <span>MEMORY BANK</span>
        <span className="text-[8px] flex items-center gap-2">
          <span className={backendAvailable ? "text-emerald-400/50" : "text-yellow-400/50"}>
            {backendAvailable ? "SERVER" : "LOCAL"}
          </span>
          <span>{memories.length} ENTRIES {open ? "▼" : "▶"}</span>
        </span>
      </button>
      {open && (
        <div className="px-3 pb-2 space-y-1 border-t border-[var(--terminal-border)]/30 max-h-48 overflow-y-auto terminal-scroll">
          {/* How memory works */}
          <button
            type="button"
            onClick={() => setShowHow((v) => !v)}
            className="w-full text-left opacity-30 hover:opacity-50 transition-opacity text-[8px] tracking-wider pt-1.5 pb-0.5"
          >
            {showHow ? "▼" : "▶"} HOW MEMORY WORKS
          </button>
          {showHow && (
            <div className="opacity-30 text-[8px] leading-relaxed pb-1 space-y-0.5 pl-2 border-l border-[var(--terminal-border)]/20">
              <p>- NEON PAW saves only stable facts or preferences.</p>
              <p>- Temporary emotions and casual chat are not saved.</p>
              <p>- {backendAvailable ? "Memories are stored on the server (SQLite)." : "Memories are stored in localStorage (browser only)."}</p>
              <p>- You can edit, pin, delete, or categorize memories.</p>
            </div>
          )}

          {/* Category filter */}
          {categories.length > 1 && (
            <div className="flex items-center gap-1 pt-1 flex-wrap">
              <button
                type="button"
                onClick={() => setFilterCategory("all")}
                className={`px-1.5 py-0.5 text-[8px] border rounded transition-colors cursor-pointer ${
                  filterCategory === "all"
                    ? "border-[var(--terminal-text)]/50 text-[var(--terminal-text)]"
                    : "border-[var(--terminal-border)]/30 text-[var(--terminal-text)]/30 hover:text-[var(--terminal-text)]/50"
                }`}
              >
                ALL
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilterCategory(cat)}
                  className={`px-1.5 py-0.5 text-[8px] border rounded transition-colors cursor-pointer ${
                    filterCategory === cat
                      ? "border-[var(--terminal-text)]/50 text-[var(--terminal-text)]"
                      : "border-[var(--terminal-border)]/30 text-[var(--terminal-text)]/30 hover:text-[var(--terminal-text)]/50"
                  }`}
                >
                  {CATEGORY_LABELS[cat] || cat.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          {/* Memory entries */}
          {filtered.map((m) => (
            <div key={m.id ?? m.content} className="flex items-start justify-between gap-2 leading-relaxed group">
              {editingId === m.id ? (
                <div className="flex-1 flex items-center gap-1">
                  <input
                    type="text"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit();
                      if (e.key === "Escape") cancelEdit();
                    }}
                    className="flex-1 bg-transparent border border-[var(--terminal-text)]/30 px-1 py-0 text-[10px] text-[var(--terminal-text)] outline-none"
                    autoFocus
                  />
                  <button type="button" onClick={saveEdit} className="text-emerald-400/60 hover:text-emerald-400 text-[8px]">OK</button>
                  <button type="button" onClick={cancelEdit} className="opacity-40 hover:opacity-70 text-[8px]">ESC</button>
                </div>
              ) : (
                <>
                  <span className="flex-1 break-all">
                    {m.category && m.category !== "custom" && (
                      <span className="opacity-30 mr-1">[{CATEGORY_LABELS[m.category] || m.category}]</span>
                    )}
                    {m.pinned && <span className="opacity-40 mr-1">PIN</span>}
                    <span className="opacity-50">{m.content}</span>
                  </span>
                  <span className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-40 transition-opacity">
                    {onUpdate && m.id && (
                      <button type="button" onClick={() => startEdit(m)} className="hover:!opacity-70 text-[8px]">EDIT</button>
                    )}
                    {onRemove && (
                      <button
                        type="button"
                        onClick={() => onRemove(m.id ?? memories.indexOf(m))}
                        className="hover:!opacity-70 text-[8px]"
                      >
                        DEL
                      </button>
                    )}
                  </span>
                </>
              )}
            </div>
          ))}

          {/* Privacy notice */}
          <div className="opacity-25 text-[8px] leading-relaxed pt-1 border-t border-[var(--terminal-border)]/15">
            {backendAvailable
              ? "STORED ON SERVER (SQLite). DATA PERSISTS ACROSS BROWSERS."
              : "LOCAL BROWSER STORAGE ONLY. NOT STORED ON ANY SERVER."}
          </div>

          {/* Export / Import */}
          {(onExport || onImport) && (
            <div className="flex items-center gap-3 pt-1 border-t border-[var(--terminal-border)]/20">
              {onExport && (
                <button
                  type="button"
                  onClick={onExport}
                  className="opacity-30 hover:opacity-60 transition-opacity text-[8px] tracking-wider"
                >
                  EXPORT
                </button>
              )}
              {onImport && (
                <label className="opacity-30 hover:opacity-60 transition-opacity text-[8px] tracking-wider cursor-pointer">
                  IMPORT
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && onImport) onImport(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
              {importResult && (
                <span className="opacity-40 text-[8px]">
                  +{importResult.imported} OK {importResult.skipped > 0 && `· ${importResult.skipped} SKIP`}
                </span>
              )}
            </div>
          )}

          {/* Clear all */}
          {onClearAll && (
            <div className="pt-1 border-t border-[var(--terminal-border)]/20">
              {!confirmClear ? (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="opacity-30 hover:opacity-60 transition-opacity text-[8px] tracking-wider"
                >
                  CLEAR ALL
                </button>
              ) : (
                <div className="space-y-1">
                  <div className="opacity-40 text-[8px]">
                    This clears {backendAvailable ? "server" : "local"} memories. Continue?
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => { onClearAll(); setConfirmClear(false); }}
                      className="text-red-400/60 hover:text-red-400 transition-colors text-[8px]"
                    >
                      YES, CLEAR
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClear(false)}
                      className="opacity-40 hover:opacity-70 transition-opacity text-[8px]"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
