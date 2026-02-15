import { create } from "zustand";
import { persist } from "zustand/middleware";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MilestoneStatus = "done" | "in-progress" | "future";

export interface Milestone {
  id: string;
  title: string;
  description: string;
  /** ISO-8601 date string (YYYY-MM-DD) */
  date: string;
  status: MilestoneStatus;
  /** Tailwind-friendly colour override (optional). Falls back to status colour. */
  color?: string;
}

export type TimelineZoom = "quarter" | "year" | "3-year";

interface RoadmapState {
  milestones: Milestone[];
  zoom: TimelineZoom;

  // Actions
  addMilestone: (m: Omit<Milestone, "id">) => void;
  updateMilestone: (id: string, patch: Partial<Omit<Milestone, "id">>) => void;
  deleteMilestone: (id: string) => void;
  reorderMilestones: (fromIndex: number, toIndex: number) => void;
  setZoom: (zoom: TimelineZoom) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `ms-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useRoadmapStore = create<RoadmapState>()(
  persist(
    (set) => ({
      milestones: [],
      zoom: "year",

      addMilestone: (m) =>
        set((state) => ({
          milestones: [
            ...state.milestones,
            { ...m, id: generateId() },
          ].sort((a, b) => a.date.localeCompare(b.date)),
        })),

      updateMilestone: (id, patch) =>
        set((state) => ({
          milestones: state.milestones
            .map((ms) => (ms.id === id ? { ...ms, ...patch } : ms))
            .sort((a, b) => a.date.localeCompare(b.date)),
        })),

      deleteMilestone: (id) =>
        set((state) => ({
          milestones: state.milestones.filter((ms) => ms.id !== id),
        })),

      reorderMilestones: (fromIndex, toIndex) =>
        set((state) => {
          const updated = [...state.milestones];
          const [moved] = updated.splice(fromIndex, 1);
          updated.splice(toIndex, 0, moved);
          return { milestones: updated };
        }),

      setZoom: (zoom) => set({ zoom }),
    }),
    {
      name: "strategy-canvas-roadmap",
    },
  ),
);
