/**
 * LocalStorage persistence for the strategy canvas.
 *
 * We avoid importing Excalidraw's branded types directly because
 * many are not re-exported from the barrel. Instead we use a
 * serialization-friendly shape and cast at the boundary.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Serializable subset of AppState that we persist. */
export interface PersistedAppState {
  viewBackgroundColor: string;
  zoom: { value: number };
  scrollX: number;
  scrollY: number;
  theme: "light" | "dark";
}

/**
 * Shape of canvas data in localStorage.
 * Uses `any` for elements/files because Excalidraw's exact types
 * are branded internals - we round-trip them as opaque JSON.
 */
export interface CanvasData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  elements: readonly any[];
  appState: PersistedAppState;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  files: Record<string, any>;
  savedAt: number; // epoch ms
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "strategy-canvas-data";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Pick only the AppState fields we want to persist. */
function pickAppState(full: Record<string, unknown>): PersistedAppState {
  return {
    viewBackgroundColor: (full.viewBackgroundColor as string) ?? "#ffffff",
    zoom: (full.zoom as { value: number }) ?? { value: 1 },
    scrollX: (full.scrollX as number) ?? 0,
    scrollY: (full.scrollY as number) ?? 0,
    theme: full.theme === "dark" ? "dark" : "light",
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Persist canvas state to localStorage.
 * Only keeps the fields needed to fully restore the scene.
 *
 * @param elements - Excalidraw elements array (opaque)
 * @param appState - Full Excalidraw AppState (we extract what we need)
 * @param files    - Excalidraw BinaryFiles map
 */
export function saveCanvas(
  elements: readonly unknown[],
  appState: Record<string, unknown>,
  files: Record<string, unknown> = {},
): void {
  const data: CanvasData = {
    elements,
    appState: pickAppState(appState),
    files,
    savedAt: Date.now(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    // localStorage full or unavailable - fail silently in production
    console.warn("[strategy-canvas] Failed to save:", err);
  }
}

/**
 * Load previously saved canvas state.
 * Returns null when nothing is stored or data is corrupt.
 */
export function loadCanvas(): CanvasData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: CanvasData = JSON.parse(raw);

    // Basic shape validation
    if (!Array.isArray(parsed.elements) || !parsed.appState) {
      console.warn("[strategy-canvas] Corrupt save data - ignoring");
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Remove saved canvas data entirely.
 */
export function clearCanvas(): void {
  localStorage.removeItem(STORAGE_KEY);
}
