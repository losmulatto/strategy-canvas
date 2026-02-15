"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  StickyNote,
  Plus,
  Trash2,
  Palette,
  Download,
  Timer,
  Vote,
  Layers,
  Play,
  Pause,
  RotateCcw,
  Check,
  X,
  Copy,
  Sparkles,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface PostIt {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
  votes: number;
  groupId?: string;
  createdAt: number;
}

interface Group {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

// ============================================================================
// Constants
// ============================================================================

const COLORS = [
  { name: "Keltainen", hex: "#fef08a", dark: "#ca8a04" },
  { name: "Vihreä", hex: "#bbf7d0", dark: "#16a34a" },
  { name: "Sininen", hex: "#bfdbfe", dark: "#2563eb" },
  { name: "Punainen", hex: "#fecaca", dark: "#dc2626" },
  { name: "Violetti", hex: "#e9d5ff", dark: "#9333ea" },
  { name: "Oranssi", hex: "#fed7aa", dark: "#ea580c" },
];

const TIMER_PRESETS = [
  { label: "3 min", seconds: 180 },
  { label: "5 min", seconds: 300 },
  { label: "7 min", seconds: 420 },
  { label: "10 min", seconds: 600 },
];

const STORAGE_KEY = "strategy-canvas-postits-v2";

// ============================================================================
// Main Component
// ============================================================================

export default function PostItCanvas() {
  // State
  const [postIts, setPostIts] = useState<PostIt[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedColor, setSelectedColor] = useState(COLORS[0].hex);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [filterColor, setFilterColor] = useState<string | null>(null);
  const [votingMode, setVotingMode] = useState(false);
  const [votesRemaining, setVotesRemaining] = useState(3);
  const [maxVotes, setMaxVotes] = useState(3);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [dragState, setDragState] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupStart, setGroupStart] = useState<{ x: number; y: number } | null>(null);
  const [groupEnd, setGroupEnd] = useState<{ x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  // ---- Load/Save ----
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setPostIts(data.postIts || []);
        setGroups(data.groups || []);
      } catch (e) {
        console.error("Failed to load:", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ postIts, groups }));
  }, [postIts, groups]);

  // ---- Timer ----
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((s) => {
          if (s <= 1) {
            setTimerRunning(false);
            // Play sound
            try {
              const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleR0dXI/NxMeMW0BGXJ/M2r97MhIcbquqp4tPPVF1ppKvs3k4Hy1spcbLonlCLkN4pcjBmGZCOlOCoqOqgVEuN2GLpqemiEc1TICkpqKMUjNBbo2ko5p8TDxee5Sjm4VXQFl2jaKah2JHUXCEnpuUfWJQXG+GmJaRf2xZXXCDk5OKfHFhZHJ/jpKJfHhjbnmFjYyHfXhqcnuEio6JgHpwdHiCh4qIgX12eHqBhYeGgX55e3t+goSEgYB8e3t9gIKDgYB+fHx9f4GCgYB+fX1+f4CBgH9+fn5/f4CAgH9/fn5/f4B/f39/f39/f4B/f39/f39/f39/f39/f39/fw==");
              audio.play();
            } catch {}
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  // ---- Actions ----
  const addPostIt = useCallback((count: number = 1) => {
    const newPostIts: PostIt[] = [];
    for (let i = 0; i < count; i++) {
      newPostIts.push({
        id: `postit-${Date.now()}-${i}`,
        text: "",
        color: selectedColor,
        x: 150 + (i % 5) * 200 + Math.random() * 50,
        y: 150 + Math.floor(i / 5) * 180 + Math.random() * 50,
        votes: 0,
        createdAt: Date.now(),
      });
    }
    setPostIts((prev) => [...prev, ...newPostIts]);
  }, [selectedColor]);

  const updatePostIt = useCallback((id: string, updates: Partial<PostIt>) => {
    setPostIts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  const deletePostIt = useCallback((id: string) => {
    setPostIts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const voteForPostIt = useCallback((id: string) => {
    if (!votingMode || votesRemaining <= 0) return;
    setPostIts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, votes: p.votes + 1 } : p))
    );
    setVotesRemaining((v) => v - 1);
  }, [votingMode, votesRemaining]);

  const resetVoting = useCallback(() => {
    setPostIts((prev) => prev.map((p) => ({ ...p, votes: 0 })));
    setVotesRemaining(maxVotes);
  }, [maxVotes]);

  const startVoting = useCallback(() => {
    setVotingMode(true);
    setVotesRemaining(maxVotes);
  }, [maxVotes]);

  const clearAll = () => {
    if (confirm("Haluatko poistaa kaikki post-itit ja ryhmät?")) {
      setPostIts([]);
      setGroups([]);
    }
  };

  const exportPostIts = () => {
    // Group by color, then by votes
    const grouped = postIts
      .filter((p) => p.text.trim())
      .sort((a, b) => b.votes - a.votes);

    const byColor: Record<string, PostIt[]> = {};
    grouped.forEach((p) => {
      const colorName = COLORS.find((c) => c.hex === p.color)?.name || "Muu";
      if (!byColor[colorName]) byColor[colorName] = [];
      byColor[colorName].push(p);
    });

    let text = "# Post-it Yhteenveto\n\n";

    // Top voted
    const topVoted = grouped.filter((p) => p.votes > 0).slice(0, 5);
    if (topVoted.length > 0) {
      text += "## 🏆 Eniten ääniä\n";
      topVoted.forEach((p) => {
        text += `- [${p.votes} ääntä] ${p.text}\n`;
      });
      text += "\n";
    }

    // By color
    Object.entries(byColor).forEach(([color, items]) => {
      text += `## ${color}\n`;
      items.forEach((p) => {
        const voteStr = p.votes > 0 ? ` (${p.votes}✓)` : "";
        text += `- ${p.text}${voteStr}\n`;
      });
      text += "\n";
    });

    navigator.clipboard.writeText(text);
    alert("Yhteenveto kopioitu leikepöydälle!");
  };

  // ---- Drag handling ----
  const handleMouseDown = (id: string, e: React.MouseEvent) => {
    if (votingMode) {
      voteForPostIt(id);
      return;
    }
    const postIt = postIts.find((p) => p.id === id);
    if (!postIt) return;
    setDragState({
      id,
      offsetX: e.clientX - postIt.x,
      offsetY: e.clientY - postIt.y,
    });
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isCreatingGroup && groupStart) {
        setGroupEnd({ x: e.clientX, y: e.clientY });
        return;
      }
      if (!dragState) return;
      setPostIts((prev) =>
        prev.map((p) =>
          p.id === dragState.id
            ? {
                ...p,
                x: Math.max(0, e.clientX - dragState.offsetX),
                y: Math.max(0, e.clientY - dragState.offsetY),
              }
            : p
        )
      );
    },
    [dragState, isCreatingGroup, groupStart]
  );

  const handleMouseUp = () => {
    setDragState(null);
    if (isCreatingGroup && groupStart && groupEnd) {
      const minX = Math.min(groupStart.x, groupEnd.x);
      const minY = Math.min(groupStart.y, groupEnd.y);
      const width = Math.abs(groupEnd.x - groupStart.x);
      const height = Math.abs(groupEnd.y - groupStart.y);

      if (width > 100 && height > 100) {
        const newGroup: Group = {
          id: `group-${Date.now()}`,
          name: "Uusi ryhmä",
          x: minX,
          y: minY,
          width,
          height,
          color: COLORS[groups.length % COLORS.length].hex,
        };
        setGroups((prev) => [...prev, newGroup]);
      }
      setGroupStart(null);
      setGroupEnd(null);
      setIsCreatingGroup(false);
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (isCreatingGroup && e.target === canvasRef.current) {
      setGroupStart({ x: e.clientX, y: e.clientY });
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Filter post-its
  const visiblePostIts = filterColor
    ? postIts.filter((p) => p.color === filterColor)
    : postIts;

  return (
    <div
      ref={canvasRef}
      className="relative h-full w-full overflow-hidden bg-zinc-100"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseDown={handleCanvasMouseDown}
      style={{ cursor: isCreatingGroup ? "crosshair" : "default" }}
    >
      {/* Grid Background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #e5e5e5 1px, transparent 1px),
            linear-gradient(to bottom, #e5e5e5 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Groups (rendered behind post-its) */}
      {groups.map((group) => (
        <GroupArea
          key={group.id}
          group={group}
          onUpdate={(updates) =>
            setGroups((prev) =>
              prev.map((g) => (g.id === group.id ? { ...g, ...updates } : g))
            )
          }
          onDelete={() => setGroups((prev) => prev.filter((g) => g.id !== group.id))}
        />
      ))}

      {/* Group creation preview */}
      {isCreatingGroup && groupStart && groupEnd && (
        <div
          className="absolute border-2 border-dashed border-blue-500 bg-blue-100/30 pointer-events-none"
          style={{
            left: Math.min(groupStart.x, groupEnd.x),
            top: Math.min(groupStart.y, groupEnd.y),
            width: Math.abs(groupEnd.x - groupStart.x),
            height: Math.abs(groupEnd.y - groupStart.y),
          }}
        />
      )}

      {/* Toolbar */}
      <div className="absolute left-4 top-4 z-50 flex flex-col gap-2">
        {/* Main toolbar */}
        <div className="flex items-center gap-2 rounded-lg bg-zinc-800 p-2 shadow-lg">
          {/* Add Buttons */}
          <button
            onClick={() => addPostIt(1)}
            className="flex items-center gap-2 rounded-md bg-yellow-500 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-yellow-400 transition"
            title="Lisää 1 post-it"
          >
            <Plus className="h-4 w-4" />
            <StickyNote className="h-4 w-4" />
          </button>

          <button
            onClick={() => addPostIt(5)}
            className="flex items-center gap-1 rounded-md bg-yellow-600 px-2 py-2 text-sm font-medium text-white hover:bg-yellow-500 transition"
            title="Lisää 5 post-itia (Sticky Stack)"
          >
            <Layers className="h-4 w-4" />
            <span className="text-xs">×5</span>
          </button>

          {/* Color Picker */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="flex h-8 w-8 items-center justify-center rounded-md border-2 border-zinc-600 hover:border-zinc-400 transition"
              style={{ backgroundColor: selectedColor }}
              title="Valitse väri"
            >
              <Palette className="h-4 w-4 text-zinc-700" />
            </button>
            {showColorPicker && (
              <div className="absolute left-0 top-10 flex gap-1 rounded-lg bg-zinc-700 p-2 shadow-xl z-50">
                {COLORS.map((color) => (
                  <button
                    key={color.hex}
                    onClick={() => {
                      setSelectedColor(color.hex);
                      setShowColorPicker(false);
                    }}
                    className={`h-6 w-6 rounded-md border-2 transition ${
                      selectedColor === color.hex ? "border-white scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-zinc-600" />

          {/* Voting */}
          {!votingMode ? (
            <button
              onClick={startVoting}
              className="flex items-center gap-1 rounded-md px-2 py-2 text-zinc-400 hover:bg-zinc-700 hover:text-white transition"
              title="Aloita äänestys"
            >
              <Vote className="h-4 w-4" />
              <span className="text-xs">Vote</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 rounded-md bg-green-600 px-2 py-1">
              <Vote className="h-4 w-4 text-white" />
              <span className="text-xs text-white font-bold">{votesRemaining}/{maxVotes}</span>
              <button
                onClick={() => setVotingMode(false)}
                className="ml-1 rounded bg-green-700 p-0.5 hover:bg-green-800"
                title="Lopeta äänestys"
              >
                <Check className="h-3 w-3 text-white" />
              </button>
              <button
                onClick={resetVoting}
                className="rounded bg-green-700 p-0.5 hover:bg-green-800"
                title="Nollaa äänet"
              >
                <RotateCcw className="h-3 w-3 text-white" />
              </button>
            </div>
          )}

          {/* Group creation */}
          <button
            onClick={() => setIsCreatingGroup(!isCreatingGroup)}
            className={`flex items-center gap-1 rounded-md px-2 py-2 transition ${
              isCreatingGroup
                ? "bg-blue-600 text-white"
                : "text-zinc-400 hover:bg-zinc-700 hover:text-white"
            }`}
            title="Luo ryhmä (vedä alue)"
          >
            <Layers className="h-4 w-4" />
          </button>

          <div className="h-6 w-px bg-zinc-600" />

          {/* Timer */}
          <div className="relative">
            <button
              onClick={() => setShowTimerMenu(!showTimerMenu)}
              className={`flex items-center gap-1 rounded-md px-2 py-2 transition ${
                timerRunning ? "bg-red-600 text-white" : "text-zinc-400 hover:bg-zinc-700 hover:text-white"
              }`}
              title="Ajastin"
            >
              <Timer className="h-4 w-4" />
              {timerSeconds > 0 && (
                <span className="text-xs font-mono">{formatTime(timerSeconds)}</span>
              )}
            </button>
            {showTimerMenu && (
              <div className="absolute left-0 top-10 rounded-lg bg-zinc-700 p-2 shadow-xl z-50">
                <div className="flex gap-1 mb-2">
                  {TIMER_PRESETS.map((preset) => (
                    <button
                      key={preset.seconds}
                      onClick={() => {
                        setTimerSeconds(preset.seconds);
                        setShowTimerMenu(false);
                      }}
                      className="rounded bg-zinc-600 px-2 py-1 text-xs text-white hover:bg-zinc-500"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setTimerRunning(!timerRunning)}
                    disabled={timerSeconds === 0}
                    className="flex-1 flex items-center justify-center gap-1 rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-500 disabled:opacity-50"
                  >
                    {timerRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  </button>
                  <button
                    onClick={() => {
                      setTimerRunning(false);
                      setTimerSeconds(0);
                    }}
                    className="rounded bg-zinc-600 px-2 py-1 text-xs text-white hover:bg-zinc-500"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-zinc-600" />

          {/* Export & Clear */}
          <button
            onClick={exportPostIts}
            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-700 hover:text-white transition"
            title="Kopioi yhteenveto"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            onClick={clearAll}
            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-red-600 hover:text-white transition"
            title="Tyhjennä kaikki"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Filter by color */}
        <div className="flex items-center gap-1 rounded-lg bg-zinc-800/90 px-2 py-1 shadow">
          <span className="text-xs text-zinc-500 mr-1">Suodata:</span>
          <button
            onClick={() => setFilterColor(null)}
            className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
              filterColor === null ? "border-white bg-zinc-600" : "border-zinc-600"
            }`}
            title="Näytä kaikki"
          >
            <span className="text-xs text-white">✓</span>
          </button>
          {COLORS.map((color) => (
            <button
              key={color.hex}
              onClick={() => setFilterColor(filterColor === color.hex ? null : color.hex)}
              className={`h-5 w-5 rounded-full border-2 ${
                filterColor === color.hex ? "border-white scale-110" : "border-transparent"
              }`}
              style={{ backgroundColor: color.hex }}
              title={color.name}
            />
          ))}
        </div>

        {/* Stats */}
        <div className="rounded-lg bg-zinc-800/90 px-3 py-1.5 text-xs text-zinc-300 shadow">
          {postIts.length} post-it{postIts.length !== 1 && "ia"}
          {postIts.filter((p) => p.text.trim()).length > 0 && (
            <span className="ml-2 text-zinc-500">
              ({postIts.filter((p) => p.text.trim()).length} kirjoitettu)
            </span>
          )}
          {postIts.some((p) => p.votes > 0) && (
            <span className="ml-2 text-green-400">
              {postIts.reduce((sum, p) => sum + p.votes, 0)} ääntä
            </span>
          )}
        </div>

        {/* Voting mode indicator */}
        {votingMode && (
          <div className="rounded-lg bg-green-600 px-3 py-2 text-sm text-white shadow animate-pulse">
            🗳️ Äänestys käynnissä — klikkaa post-iteja!
          </div>
        )}
      </div>

      {/* Timer display (large, when running) */}
      {timerRunning && (
        <div className="absolute right-4 top-4 z-50 rounded-xl bg-red-600 px-6 py-3 shadow-lg">
          <div className="text-3xl font-mono font-bold text-white">
            {formatTime(timerSeconds)}
          </div>
        </div>
      )}

      {/* Instructions */}
      {postIts.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <StickyNote className="mx-auto h-16 w-16 text-zinc-300" />
            <p className="mt-4 text-lg font-medium text-zinc-500">
              Klikkaa "+" aloittaaksesi
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              tai "×5" lisätäksesi pinon kerralla
            </p>
          </div>
        </div>
      )}

      {/* Post-its */}
      {visiblePostIts.map((postIt) => (
        <PostItCard
          key={postIt.id}
          postIt={postIt}
          isDragging={dragState?.id === postIt.id}
          votingMode={votingMode}
          onMouseDown={(e) => handleMouseDown(postIt.id, e)}
          onUpdate={(updates) => updatePostIt(postIt.id, updates)}
          onDelete={() => deletePostIt(postIt.id)}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Group Area Component
// ============================================================================

function GroupArea({
  group,
  onUpdate,
  onDelete,
}: {
  group: Group;
  onUpdate: (updates: Partial<Group>) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div
      className="absolute rounded-lg border-2 border-dashed"
      style={{
        left: group.x,
        top: group.y,
        width: group.width,
        height: group.height,
        borderColor: COLORS.find((c) => c.hex === group.color)?.dark || "#888",
        backgroundColor: `${group.color}40`,
      }}
    >
      {/* Group header */}
      <div
        className="absolute -top-7 left-2 flex items-center gap-1 rounded-t-md px-2 py-1"
        style={{ backgroundColor: group.color }}
      >
        {isEditing ? (
          <input
            autoFocus
            value={group.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => e.key === "Enter" && setIsEditing(false)}
            className="bg-transparent text-sm font-medium text-zinc-800 outline-none w-32"
          />
        ) : (
          <span
            onClick={() => setIsEditing(true)}
            className="text-sm font-medium text-zinc-800 cursor-text"
          >
            {group.name}
          </span>
        )}
        <button
          onClick={onDelete}
          className="ml-1 rounded p-0.5 hover:bg-black/10"
        >
          <X className="h-3 w-3 text-zinc-600" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Post-it Card Component
// ============================================================================

function PostItCard({
  postIt,
  isDragging,
  votingMode,
  onMouseDown,
  onUpdate,
  onDelete,
}: {
  postIt: PostIt;
  isDragging: boolean;
  votingMode: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onUpdate: (updates: Partial<PostIt>) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div
      className={`group absolute flex flex-col transition-all ${
        isDragging ? "scale-105 shadow-2xl z-50" : "shadow-lg hover:shadow-xl z-10"
      } ${votingMode ? "cursor-pointer hover:scale-105" : ""}`}
      style={{
        left: postIt.x,
        top: postIt.y,
        width: 160,
        minHeight: 120,
        backgroundColor: postIt.color,
        cursor: votingMode ? "pointer" : isDragging ? "grabbing" : "grab",
        transform: `rotate(${(postIt.id.charCodeAt(postIt.id.length - 1) % 5) - 2}deg)`,
      }}
      onMouseDown={(e) => {
        if (!isEditing) onMouseDown(e);
      }}
    >
      {/* Tape effect */}
      <div
        className="absolute -top-2 left-1/2 h-4 w-10 -translate-x-1/2 rounded-sm bg-zinc-300/70"
        style={{ transform: "translateX(-50%) rotate(-1deg)" }}
      />

      {/* Vote badge */}
      {postIt.votes > 0 && (
        <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white shadow">
          {postIt.votes}
        </div>
      )}

      {/* Delete Button */}
      {!votingMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-all hover:bg-red-600 group-hover:opacity-100"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}

      {/* Content */}
      <div className="flex-1 p-3 pt-4">
        {isEditing ? (
          <textarea
            autoFocus
            value={postIt.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setIsEditing(false);
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="h-full min-h-[60px] w-full resize-none bg-transparent text-sm text-zinc-800 outline-none placeholder-zinc-500"
            placeholder="Kirjoita..."
            style={{ fontFamily: "'Caveat', cursive, sans-serif", fontSize: "16px" }}
          />
        ) : (
          <div
            onClick={(e) => {
              if (!votingMode) {
                e.stopPropagation();
                setIsEditing(true);
              }
            }}
            onMouseDown={(e) => !votingMode && e.stopPropagation()}
            className="h-full min-h-[60px] text-sm text-zinc-800"
            style={{ fontFamily: "'Caveat', cursive, sans-serif", fontSize: "16px" }}
          >
            {postIt.text || (
              <span className="text-zinc-500 italic text-xs">
                {votingMode ? "Klikkaa äänestääksesi" : "Klikkaa kirjoittaaksesi..."}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
