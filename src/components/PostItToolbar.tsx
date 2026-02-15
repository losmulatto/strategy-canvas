"use client";

import { useState } from "react";
import { StickyNote, Plus, Trash2, Palette } from "lucide-react";

export interface PostIt {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
}

const COLORS = [
  { name: "Keltainen", bg: "bg-yellow-200", hex: "#fef08a" },
  { name: "Vihreä", bg: "bg-green-200", hex: "#bbf7d0" },
  { name: "Sininen", bg: "bg-blue-200", hex: "#bfdbfe" },
  { name: "Punainen", bg: "bg-red-200", hex: "#fecaca" },
  { name: "Violetti", bg: "bg-purple-200", hex: "#e9d5ff" },
  { name: "Oranssi", bg: "bg-orange-200", hex: "#fed7aa" },
];

interface PostItToolbarProps {
  postIts: PostIt[];
  onAdd: (color: string) => void;
  onUpdate: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
}

export function PostItToolbar({ postIts, onAdd, onUpdate, onDelete, onMove }: PostItToolbarProps) {
  const [selectedColor, setSelectedColor] = useState(COLORS[0].hex);
  const [showColorPicker, setShowColorPicker] = useState(false);

  return (
    <div className="absolute left-4 top-4 z-50 flex flex-col gap-2">
      {/* Add Post-it Button */}
      <div className="flex items-center gap-2 rounded-lg bg-zinc-800 p-2 shadow-lg">
        <button
          onClick={() => onAdd(selectedColor)}
          className="flex items-center gap-2 rounded-md bg-yellow-500 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-yellow-400"
        >
          <Plus className="h-4 w-4" />
          <StickyNote className="h-4 w-4" />
          Lisää Post-it
        </button>

        {/* Color Picker */}
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="flex h-8 w-8 items-center justify-center rounded-md border-2 border-zinc-600 hover:border-zinc-400"
            style={{ backgroundColor: selectedColor }}
          >
            <Palette className="h-4 w-4 text-zinc-700" />
          </button>

          {showColorPicker && (
            <div className="absolute left-0 top-10 flex gap-1 rounded-lg bg-zinc-700 p-2 shadow-xl">
              {COLORS.map((color) => (
                <button
                  key={color.hex}
                  onClick={() => {
                    setSelectedColor(color.hex);
                    setShowColorPicker(false);
                  }}
                  className={`h-6 w-6 rounded-md border-2 ${
                    selectedColor === color.hex ? "border-white" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Post-it Count */}
      {postIts.length > 0 && (
        <div className="rounded-lg bg-zinc-800/80 px-3 py-1 text-xs text-zinc-400">
          {postIts.length} post-it{postIts.length !== 1 && "ia"}
        </div>
      )}
    </div>
  );
}

// Draggable Post-it Component
interface DraggablePostItProps {
  postIt: PostIt;
  onUpdate: (text: string) => void;
  onDelete: () => void;
  onMove: (x: number, y: number) => void;
}

export function DraggablePostIt({ postIt, onUpdate, onDelete, onMove }: DraggablePostItProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - postIt.x,
      y: e.clientY - postIt.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    onMove(e.clientX - dragOffset.x, e.clientY - dragOffset.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      className="group absolute flex flex-col shadow-lg transition-shadow hover:shadow-xl"
      style={{
        left: postIt.x,
        top: postIt.y,
        width: 200,
        minHeight: 150,
        backgroundColor: postIt.color,
        cursor: isDragging ? "grabbing" : "grab",
        zIndex: isDragging ? 100 : 10,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Delete Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
      >
        <Trash2 className="h-3 w-3" />
      </button>

      {/* Content */}
      <div className="flex-1 p-3">
        {isEditing ? (
          <textarea
            autoFocus
            value={postIt.text}
            onChange={(e) => onUpdate(e.target.value)}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setIsEditing(false);
            }}
            className="h-full w-full resize-none bg-transparent text-sm text-zinc-800 outline-none"
            placeholder="Kirjoita tähän..."
          />
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="h-full min-h-[100px] cursor-text text-sm text-zinc-800"
          >
            {postIt.text || (
              <span className="text-zinc-500 italic">Klikkaa kirjoittaaksesi...</span>
            )}
          </div>
        )}
      </div>

      {/* Drag Handle Visual */}
      <div className="flex justify-center pb-1">
        <div className="h-1 w-8 rounded-full bg-zinc-400/50" />
      </div>
    </div>
  );
}
