"use client";

import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import {
  addMonths,
  addQuarters,
  addYears,
  differenceInDays,
  format,
  parseISO,
  startOfMonth,
  startOfQuarter,
  eachMonthOfInterval,
  eachQuarterOfInterval,
  eachYearOfInterval,
  isWithinInterval,
} from "date-fns";
import { Plus, ZoomIn, ZoomOut, CalendarRange } from "lucide-react";
import MilestoneCard from "./MilestoneCard";
import {
  useRoadmapStore,
  type TimelineZoom,
  type Milestone,
} from "@/store/roadmapStore";

// ---------------------------------------------------------------------------
// Zoom config
// ---------------------------------------------------------------------------

const ZOOM_CONFIG: Record<
  TimelineZoom,
  {
    label: string;
    /** How many months the full timeline spans */
    months: number;
    /** Pixels per day — controls horizontal density */
    pxPerDay: number;
  }
> = {
  quarter: { label: "Quarter", months: 3, pxPerDay: 8 },
  year: { label: "Year", months: 12, pxPerDay: 3 },
  "3-year": { label: "3 Years", months: 36, pxPerDay: 1.2 },
};

const ZOOM_LEVELS: TimelineZoom[] = ["quarter", "year", "3-year"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute the reference start date (first of current month or earliest milestone month) */
function computeOrigin(milestones: Milestone[]): Date {
  const now = startOfMonth(new Date());
  if (milestones.length === 0) return now;
  const earliest = parseISO(milestones[0].date);
  return earliest < now ? startOfMonth(earliest) : now;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Roadmap() {
  const {
    milestones,
    zoom,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    reorderMilestones,
    setZoom,
  } = useRoadmapStore();

  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Hydration guard (zustand persist produces mismatch on SSR) ----------
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // --- Derived timeline geometry -------------------------------------------
  const config = ZOOM_CONFIG[zoom];

  const origin = useMemo(() => computeOrigin(milestones), [milestones]);
  const endDate = addMonths(origin, config.months);
  const totalDays = differenceInDays(endDate, origin);
  const totalWidth = totalDays * config.pxPerDay;

  // --- Tick marks ----------------------------------------------------------
  const ticks = useMemo(() => {
    if (zoom === "quarter") {
      return eachMonthOfInterval({ start: origin, end: endDate }).map((d) => ({
        date: d,
        label: format(d, "MMM yyyy"),
        offset: differenceInDays(d, origin) * config.pxPerDay,
      }));
    }
    if (zoom === "year") {
      return eachQuarterOfInterval({ start: origin, end: endDate }).map(
        (d) => ({
          date: d,
          label: format(d, "QQQ yyyy"),
          offset: differenceInDays(d, origin) * config.pxPerDay,
        }),
      );
    }
    // 3-year
    return eachYearOfInterval({ start: origin, end: endDate }).map((d) => ({
      date: d,
      label: format(d, "yyyy"),
      offset: differenceInDays(d, origin) * config.pxPerDay,
    }));
  }, [origin, endDate, zoom, config.pxPerDay]);

  // --- Place milestones on the axis ----------------------------------------
  const positioned = useMemo(
    () =>
      milestones.map((ms) => {
        const d = parseISO(ms.date);
        const dayOffset = differenceInDays(d, origin);
        const px = Math.max(0, Math.min(dayOffset * config.pxPerDay, totalWidth - 240));
        return { ...ms, px };
      }),
    [milestones, origin, config.pxPerDay, totalWidth],
  );

  // --- Stagger cards so they don't overlap ---------------------------------
  const staggered = useMemo(() => {
    const CARD_WIDTH = 240;
    const rows: number[][] = []; // each row tracks occupied x-ranges

    return positioned.map((ms) => {
      let row = 0;
      for (let r = 0; r < rows.length; r++) {
        const overlaps = rows[r].some(
          (occupiedX) =>
            ms.px < occupiedX + CARD_WIDTH && ms.px + CARD_WIDTH > occupiedX,
        );
        if (!overlaps) {
          row = r;
          break;
        }
        row = r + 1;
      }
      if (!rows[row]) rows[row] = [];
      rows[row].push(ms.px);
      return { ...ms, row };
    });
  }, [positioned]);

  // --- Drag state ----------------------------------------------------------
  const [dragging, setDragging] = useState<string | null>(null);

  // --- Add milestone -------------------------------------------------------
  const handleAdd = useCallback(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    addMilestone({
      title: "New Milestone",
      description: "",
      date: today,
      status: "future",
    });
  }, [addMilestone]);

  // --- Zoom handlers -------------------------------------------------------
  const zoomIn = useCallback(() => {
    const idx = ZOOM_LEVELS.indexOf(zoom);
    if (idx > 0) setZoom(ZOOM_LEVELS[idx - 1]);
  }, [zoom, setZoom]);

  const zoomOut = useCallback(() => {
    const idx = ZOOM_LEVELS.indexOf(zoom);
    if (idx < ZOOM_LEVELS.length - 1) setZoom(ZOOM_LEVELS[idx + 1]);
  }, [zoom, setZoom]);

  // --- SSR guard -----------------------------------------------------------
  if (!hydrated) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-zinc-400">
        Loading roadmap...
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      {/* ---- Toolbar ---- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-5 w-5 text-zinc-500" />
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Roadmap
          </h2>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800">
            {milestones.length} milestone{milestones.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
            <button
              type="button"
              onClick={zoomIn}
              disabled={zoom === "quarter"}
              className="rounded-l-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-zinc-700"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <span className="select-none border-x border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
              {config.label}
            </span>
            <button
              type="button"
              onClick={zoomOut}
              disabled={zoom === "3-year"}
              className="rounded-r-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-zinc-700"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
          </div>

          {/* Add */}
          <button
            type="button"
            onClick={handleAdd}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Milestone
          </button>
        </div>
      </div>

      {/* ---- Timeline scroll area ---- */}
      <div
        ref={scrollRef}
        className="relative overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
      >
        <div
          className="relative"
          style={{ width: `${Math.max(totalWidth + 120, 600)}px`, minHeight: "280px" }}
        >
          {/* ---- tick marks & grid lines ---- */}
          <div className="pointer-events-none absolute inset-0">
            {ticks.map((tick, i) => (
              <div
                key={i}
                className="absolute top-0 h-full"
                style={{ left: `${tick.offset + 60}px` }}
              >
                {/* vertical grid line */}
                <div className="h-full w-px bg-zinc-100 dark:bg-zinc-800" />
                {/* label */}
                <span className="absolute -top-0 left-1 select-none whitespace-nowrap bg-white px-1 py-1 text-[10px] font-medium text-zinc-400 dark:bg-zinc-900">
                  {tick.label}
                </span>
              </div>
            ))}
          </div>

          {/* ---- Horizontal axis line ---- */}
          <div
            className="absolute left-[60px] right-0 h-0.5 bg-zinc-200 dark:bg-zinc-700"
            style={{ top: "48px" }}
          />

          {/* ---- Today marker ---- */}
          {(() => {
            const todayOffset =
              differenceInDays(new Date(), origin) * config.pxPerDay;
            if (todayOffset < 0 || todayOffset > totalWidth) return null;
            return (
              <div
                className="absolute top-0 z-10 h-full w-0.5 bg-blue-500/60"
                style={{ left: `${todayOffset + 60}px` }}
              >
                <span className="absolute -top-0 left-1 select-none whitespace-nowrap rounded-full bg-blue-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  Today
                </span>
              </div>
            );
          })()}

          {/* ---- Milestone cards ---- */}
          <div className="relative" style={{ paddingTop: "64px" }}>
            {staggered.map((ms) => (
              <div
                key={ms.id}
                className="absolute transition-all duration-200"
                style={{
                  left: `${ms.px + 60}px`,
                  top: `${ms.row * 180 + 8}px`,
                }}
              >
                {/* connector line from axis to card */}
                <div
                  className="absolute left-28 w-px bg-zinc-300 dark:bg-zinc-600"
                  style={{
                    top: `-${ms.row * 180 + 8 - 0}px`,
                    height: `${ms.row * 180 + 8}px`,
                  }}
                />
                {/* dot on the axis */}
                <div
                  className={`absolute left-[108px] h-3 w-3 rounded-full border-2 border-white shadow dark:border-zinc-900 ${
                    ms.status === "done"
                      ? "bg-emerald-500"
                      : ms.status === "in-progress"
                        ? "bg-amber-500"
                        : "bg-zinc-400"
                  }`}
                  style={{
                    top: `-${ms.row * 180 + 8 + 6}px`,
                  }}
                />

                <MilestoneCard
                  milestone={ms}
                  onUpdate={updateMilestone}
                  onDelete={deleteMilestone}
                />
              </div>
            ))}
          </div>

          {/* ---- Empty state ---- */}
          {milestones.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <CalendarRange className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
                <p className="text-sm text-zinc-400">
                  No milestones yet. Click{" "}
                  <span className="font-medium text-blue-500">Add Milestone</span> to
                  start planning.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
