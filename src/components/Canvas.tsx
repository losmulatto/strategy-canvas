"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import "@excalidraw/excalidraw/index.css";

import { saveCanvas, loadCanvas } from "@/lib/storage";
import { useCanvasStore } from "@/store/canvasStore";

// ---------------------------------------------------------------------------
// Excalidraw API type (minimal shape we use - avoids importing branded types)
// ---------------------------------------------------------------------------

interface ExcalidrawAPI {
  getSceneElements: () => readonly unknown[];
  getAppState: () => Record<string, unknown>;
  getFiles: () => Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Library items: reusable shapes for strategy workshops
// ---------------------------------------------------------------------------

interface LibraryItem {
  id: string;
  status: "published" | "unpublished";
  created: number;
  elements: readonly Record<string, unknown>[];
}

function getDefaultLibraryItems(): LibraryItem[] {
  const now = Date.now();

  const postIt: LibraryItem = {
    id: "strategy-postit",
    status: "published",
    created: now,
    elements: [
      {
        id: "postit-rect",
        type: "rectangle",
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        angle: 0,
        strokeColor: "#e8a838",
        backgroundColor: "#fff3bf",
        fillStyle: "solid",
        strokeWidth: 2,
        strokeStyle: "solid",
        roughness: 1,
        opacity: 100,
        groupIds: [],
        frameId: null,
        index: "a0",
        roundness: { type: 3 },
        seed: 1,
        version: 1,
        versionNonce: 1,
        isDeleted: false,
        boundElements: null,
        updated: now,
        link: null,
        locked: false,
      },
    ],
  };

  const milestone: LibraryItem = {
    id: "strategy-milestone",
    status: "published",
    created: now,
    elements: [
      {
        id: "milestone-diamond",
        type: "diamond",
        x: 0,
        y: 0,
        width: 120,
        height: 120,
        angle: 0,
        strokeColor: "#1e1e1e",
        backgroundColor: "#a5d8ff",
        fillStyle: "solid",
        strokeWidth: 2,
        strokeStyle: "solid",
        roughness: 1,
        opacity: 100,
        groupIds: [],
        frameId: null,
        index: "a0",
        roundness: { type: 2 },
        seed: 2,
        version: 1,
        versionNonce: 2,
        isDeleted: false,
        boundElements: null,
        updated: now,
        link: null,
        locked: false,
      },
    ],
  };

  const arrow: LibraryItem = {
    id: "strategy-arrow",
    status: "published",
    created: now,
    elements: [
      {
        id: "arrow-element",
        type: "arrow",
        x: 0,
        y: 0,
        width: 200,
        height: 0,
        angle: 0,
        strokeColor: "#1e1e1e",
        backgroundColor: "transparent",
        fillStyle: "solid",
        strokeWidth: 2,
        strokeStyle: "solid",
        roughness: 1,
        opacity: 100,
        groupIds: [],
        frameId: null,
        index: "a0",
        roundness: { type: 2 },
        seed: 3,
        version: 1,
        versionNonce: 3,
        isDeleted: false,
        boundElements: null,
        updated: now,
        link: null,
        locked: false,
        points: [
          [0, 0],
          [200, 0],
        ],
        lastCommittedPoint: null,
        startBinding: null,
        endBinding: null,
        startArrowhead: null,
        endArrowhead: "arrow",
      },
    ],
  };

  return [postIt, milestone, arrow];
}

// ---------------------------------------------------------------------------
// Debounce helper
// ---------------------------------------------------------------------------

function debounce<T extends (...args: never[]) => void>(
  fn: T,
  ms: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ---------------------------------------------------------------------------
// Module-level ref for external access (getCurrentContent)
// ---------------------------------------------------------------------------

let _apiRef: ExcalidrawAPI | null = null;

/**
 * Get the current canvas content for AI consumption or export.
 * Returns null if the canvas is not mounted.
 */
export function getCurrentContent(): {
  elements: readonly unknown[];
  appState: Record<string, unknown>;
  files: Record<string, unknown>;
} | null {
  if (!_apiRef) return null;
  return {
    elements: _apiRef.getSceneElements(),
    appState: _apiRef.getAppState(),
    files: _apiRef.getFiles(),
  };
}

// ---------------------------------------------------------------------------
// Canvas component
// ---------------------------------------------------------------------------

// Dynamic import of Excalidraw to avoid SSR issues (it uses window/document)
let ExcalidrawModule: typeof import("@excalidraw/excalidraw") | null = null;

export default function Canvas() {
  const apiRef = useRef<ExcalidrawAPI | null>(null);
  const { setElements, setAppState, markClean } = useCanvasStore();
  const [loaded, setLoaded] = useState(false);

  // ---- dynamic import ----
  useEffect(() => {
    import("@excalidraw/excalidraw").then((mod) => {
      ExcalidrawModule = mod;
      setLoaded(true);
    });
  }, []);

  // ---- persist on change (debounced 500ms) ----
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleChange = useCallback(
    debounce(
      (
        elements: readonly unknown[],
        appState: Record<string, unknown>,
        files: Record<string, unknown>,
      ) => {
        setElements(elements);
        setAppState(appState);
        saveCanvas(elements, appState, files);
        markClean();
      },
      500,
    ),
    [],
  );

  // ---- capture API ref ----
  const handleExcalidrawAPI = useCallback(
    (api: ExcalidrawAPI) => {
      apiRef.current = api;
      _apiRef = api;
    },
    [],
  );

  // ---- load initial data from localStorage ----
  const getInitialData = useCallback(async () => {
    const saved = loadCanvas();
    if (saved) {
      return {
        elements: saved.elements,
        appState: {
          ...saved.appState,
        },
        files: saved.files,
        libraryItems: getDefaultLibraryItems(),
        scrollToContent: true,
      };
    }
    return {
      elements: [],
      appState: {
        viewBackgroundColor: "#ffffff",
      },
      libraryItems: getDefaultLibraryItems(),
    };
  }, []);

  // ---- cleanup module ref on unmount ----
  useEffect(() => {
    return () => {
      _apiRef = null;
    };
  }, []);

  if (!loaded || !ExcalidrawModule) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
          fontSize: 16,
        }}
      >
        Loading canvas...
      </div>
    );
  }

  const {
    Excalidraw,
    MainMenu,
    WelcomeScreen,
  } = ExcalidrawModule;

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Excalidraw
        initialData={getInitialData as any}
        excalidrawAPI={handleExcalidrawAPI as any}
        onChange={handleChange as any}
        UIOptions={{
          canvasActions: {
            saveToActiveFile: false,
            loadScene: false,
          },
        }}
      >
        <WelcomeScreen>
          <WelcomeScreen.Hints.ToolbarHint />
          <WelcomeScreen.Center>
            <WelcomeScreen.Center.Logo>
              Strategy Canvas
            </WelcomeScreen.Center.Logo>
            <WelcomeScreen.Center.Heading>
              Plan. Map. Execute.
            </WelcomeScreen.Center.Heading>
          </WelcomeScreen.Center>
        </WelcomeScreen>

        <MainMenu>
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
          <MainMenu.DefaultItems.ToggleTheme />
          <MainMenu.DefaultItems.Help />
        </MainMenu>
      </Excalidraw>
    </div>
  );
}
