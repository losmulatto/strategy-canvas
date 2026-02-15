"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { format, parseISO } from "date-fns";
import {
  GripVertical,
  Trash2,
  Check,
  Clock,
  ArrowRight,
  Pencil,
} from "lucide-react";
import type { Milestone, MilestoneStatus } from "@/store/roadmapStore";

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const STATUS_META: Record<
  MilestoneStatus,
  { label: string; bg: string; border: string; icon: React.ReactNode }
> = {
  done: {
    label: "Done",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-400 dark:border-emerald-600",
    icon: <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />,
  },
  "in-progress": {
    label: "In Progress",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-400 dark:border-amber-600",
    icon: <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />,
  },
  future: {
    label: "Future",
    bg: "bg-zinc-50 dark:bg-zinc-800/60",
    border: "border-zinc-300 dark:border-zinc-600",
    icon: <ArrowRight className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />,
  },
};

const STATUS_OPTIONS: MilestoneStatus[] = ["done", "in-progress", "future"];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MilestoneCardProps {
  milestone: Milestone;
  onUpdate: (id: string, patch: Partial<Omit<Milestone, "id">>) => void;
  onDelete: (id: string) => void;
  /** Fired when the user starts dragging (mousedown on the grip). */
  onDragStart?: (e: React.MouseEvent | React.TouchEvent) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MilestoneCard({
  milestone,
  onUpdate,
  onDelete,
  onDragStart,
}: MilestoneCardProps) {
  const { id, title, description, date, status } = milestone;
  const meta = STATUS_META[status];

  // Inline editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftDesc, setDraftDesc] = useState(description);
  const titleRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  // Status dropdown
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  // Focus input when entering edit mode
  useEffect(() => {
    if (editingTitle) titleRef.current?.focus();
  }, [editingTitle]);
  useEffect(() => {
    if (editingDesc) descRef.current?.focus();
  }, [editingDesc]);

  // Commit helpers
  const commitTitle = () => {
    const trimmed = draftTitle.trim();
    if (trimmed && trimmed !== title) onUpdate(id, { title: trimmed });
    else setDraftTitle(title);
    setEditingTitle(false);
  };

  const commitDesc = () => {
    const trimmed = draftDesc.trim();
    if (trimmed !== description) onUpdate(id, { description: trimmed });
    else setDraftDesc(description);
    setEditingDesc(false);
  };

  const handleTitleKey = (e: KeyboardEvent) => {
    if (e.key === "Enter") commitTitle();
    if (e.key === "Escape") {
      setDraftTitle(title);
      setEditingTitle(false);
    }
  };

  const handleDescKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setDraftDesc(description);
      setEditingDesc(false);
    }
  };

  return (
    <div
      className={`group relative flex w-56 flex-col gap-2 rounded-xl border-2 ${meta.border} ${meta.bg} p-3 shadow-sm transition-shadow hover:shadow-md`}
    >
      {/* ---- drag handle ---- */}
      <div
        className="absolute -left-3 top-1/2 -translate-y-1/2 cursor-grab rounded-md bg-white p-0.5 opacity-0 shadow transition-opacity group-hover:opacity-100 dark:bg-zinc-700 active:cursor-grabbing"
        onMouseDown={onDragStart}
        onTouchStart={onDragStart}
        role="button"
        aria-label="Drag to reorder"
        tabIndex={0}
      >
        <GripVertical className="h-4 w-4 text-zinc-400" />
      </div>

      {/* ---- header row: status + delete ---- */}
      <div className="flex items-center justify-between">
        {/* status dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowStatusMenu((v) => !v)}
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          >
            {meta.icon}
            <span>{meta.label}</span>
          </button>

          {showStatusMenu && (
            <div className="absolute left-0 top-full z-20 mt-1 w-32 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    onUpdate(id, { status: s });
                    setShowStatusMenu(false);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700 ${
                    s === status ? "font-semibold" : ""
                  }`}
                >
                  {STATUS_META[s].icon}
                  {STATUS_META[s].label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* delete */}
        <button
          type="button"
          onClick={() => onDelete(id)}
          className="rounded-md p-1 text-zinc-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-950/40"
          aria-label="Delete milestone"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ---- title ---- */}
      {editingTitle ? (
        <input
          ref={titleRef}
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={handleTitleKey}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-zinc-600 dark:bg-zinc-900"
          maxLength={80}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditingTitle(true)}
          className="group/title flex items-center gap-1 text-left"
        >
          <h3 className="text-sm font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
            {title}
          </h3>
          <Pencil className="h-3 w-3 flex-shrink-0 text-zinc-400 opacity-0 transition-opacity group-hover/title:opacity-100" />
        </button>
      )}

      {/* ---- description ---- */}
      {editingDesc ? (
        <textarea
          ref={descRef}
          value={draftDesc}
          onChange={(e) => setDraftDesc(e.target.value)}
          onBlur={commitDesc}
          onKeyDown={handleDescKey}
          rows={2}
          className="resize-none rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-zinc-600 dark:bg-zinc-900"
          maxLength={280}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditingDesc(true)}
          className="text-left text-xs leading-relaxed text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          {description || "Add description..."}
        </button>
      )}

      {/* ---- date ---- */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => onUpdate(id, { date: e.target.value })}
          className="w-full rounded-md border border-zinc-200 bg-white/80 px-2 py-1 text-xs text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
        />
      </div>

      {/* ---- pretty date label ---- */}
      <span className="text-[10px] font-medium tracking-wide text-zinc-400">
        {format(parseISO(date), "d MMM yyyy")}
      </span>
    </div>
  );
}
