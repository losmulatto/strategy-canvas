import { create } from "zustand";
import type { PersistedAppState } from "@/lib/storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CanvasView = "canvas" | "roadmap";

export interface CanvasState {
  /** Current Excalidraw elements on the scene (opaque - Excalidraw internal type). */
  elements: readonly unknown[];

  /** Persisted subset of AppState we care about. */
  appState: PersistedAppState;

  /** Which view is active. */
  currentView: CanvasView;

  /** Whether the canvas has unsaved changes. */
  isDirty: boolean;
}

export interface CanvasActions {
  setElements: (elements: readonly unknown[]) => void;
  setAppState: (partial: Record<string, unknown>) => void;
  switchView: (view: CanvasView) => void;
  markClean: () => void;
}

export type CanvasStore = CanvasState & CanvasActions;

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_APP_STATE: PersistedAppState = {
  viewBackgroundColor: "#ffffff",
  zoom: { value: 1 },
  scrollX: 0,
  scrollY: 0,
  theme: "light",
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useCanvasStore = create<CanvasStore>((set) => ({
  // --- state ---
  elements: [],
  appState: DEFAULT_APP_STATE,
  currentView: "canvas",
  isDirty: false,

  // --- actions ---
  setElements: (elements) =>
    set({ elements, isDirty: true }),

  setAppState: (partial) =>
    set((state) => ({
      appState: {
        ...state.appState,
        viewBackgroundColor:
          (partial.viewBackgroundColor as string) ??
          state.appState.viewBackgroundColor,
        zoom:
          (partial.zoom as { value: number }) ?? state.appState.zoom,
        scrollX:
          (partial.scrollX as number) ?? state.appState.scrollX,
        scrollY:
          (partial.scrollY as number) ?? state.appState.scrollY,
        theme:
          partial.theme === "dark" || partial.theme === "light"
            ? partial.theme
            : state.appState.theme,
      },
      isDirty: true,
    })),

  switchView: (view) => set({ currentView: view }),

  markClean: () => set({ isDirty: false }),
}));
