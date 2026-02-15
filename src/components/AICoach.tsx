"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  Bot,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Send,
  Sparkles,
  Swords,
  FileText,
  Trash2,
  X,
} from "lucide-react";
import {
  analyzeCanvas,
  type AIMode,
  type AIResponse,
  type CanvasElement,
} from "@/lib/ai";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Interaction {
  id: string;
  mode: AIMode;
  prompt: string;
  response: string;
  timestamp: number;
}

interface AICoachProps {
  /** Canvas elements to send as context — pass from parent/store */
  elements?: CanvasElement[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_HISTORY = 5;

const MODE_META: Record<AIMode, { label: string; icon: typeof Bot }> = {
  summarize: { label: "Tiivista", icon: FileText },
  brainstorm: { label: "Ideoi", icon: Sparkles },
  challenge: { label: "Haasta", icon: Swords },
  custom: { label: "Kysy", icon: Bot },
};

// ---------------------------------------------------------------------------
// Simple markdown renderer (no external dep)
// ---------------------------------------------------------------------------

function renderMarkdown(text: string): string {
  return text
    // Headers
    .replace(/^### (.+)$/gm, '<h4 class="font-semibold text-sm mt-3 mb-1">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="font-semibold text-base mt-4 mb-1">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="font-bold text-lg mt-4 mb-2">$1</h2>')
    // Bold / Italic
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    // Line breaks
    .replace(/\n{2,}/g, '<div class="h-2"></div>')
    .replace(/\n/g, "<br />");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AICoach({ elements = [] }: AICoachProps) {
  // Panel state
  const [isOpen, setIsOpen] = useState(false);

  // Interaction state
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [history, setHistory] = useState<Interaction[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const abortRef = useRef<AbortController | null>(null);
  const responseAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll when streaming
  useEffect(() => {
    if (responseAreaRef.current && (streamingText || history.length)) {
      responseAreaRef.current.scrollTop = responseAreaRef.current.scrollHeight;
    }
  }, [streamingText, history.length]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // ------------------------------------------------------------------
  // Core: send a request
  // ------------------------------------------------------------------

  const sendRequest = useCallback(
    async (mode: AIMode, userPrompt?: string) => {
      const finalPrompt =
        userPrompt?.trim() || prompt.trim() || MODE_META[mode].label;

      if (isLoading) return;

      setIsLoading(true);
      setStreamingText("");
      setError(null);

      const controller = new AbortController();
      abortRef.current = controller;

      let fullText = "";

      try {
        for await (const chunk of analyzeCanvas(
          elements,
          finalPrompt,
          mode,
          controller.signal,
        )) {
          fullText += chunk;
          setStreamingText(fullText);
        }

        // Save to history (keep last MAX_HISTORY)
        const interaction: Interaction = {
          id: crypto.randomUUID(),
          mode,
          prompt: finalPrompt,
          response: fullText,
          timestamp: Date.now(),
        };

        setHistory((prev) => [interaction, ...prev].slice(0, MAX_HISTORY));
        setStreamingText("");
        setPrompt("");
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // User cancelled — no error to show
          setStreamingText("");
        } else {
          setError(
            err instanceof Error ? err.message : "Tuntematon virhe",
          );
        }
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [elements, isLoading, prompt],
  );

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (prompt.trim()) {
        sendRequest("custom");
      }
    },
    [prompt, sendRequest],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (prompt.trim()) {
          sendRequest("custom");
        }
      }
    },
    [prompt, sendRequest],
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    setStreamingText("");
    setError(null);
  }, []);

  // ------------------------------------------------------------------
  // Render: collapsed toggle
  // ------------------------------------------------------------------

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex items-center gap-1
                   rounded-l-lg bg-indigo-600 px-2 py-3 text-white shadow-lg
                   transition-all hover:bg-indigo-700 hover:pr-4"
        aria-label="Avaa AI Coach"
      >
        <ChevronLeft className="h-4 w-4" />
        <Bot className="h-5 w-5" />
      </button>
    );
  }

  // ------------------------------------------------------------------
  // Render: open panel
  // ------------------------------------------------------------------

  return (
    <div
      className="fixed right-0 top-0 z-50 flex h-full w-96 flex-col
                 border-l border-zinc-200 bg-white shadow-2xl dark:border-zinc-700
                 dark:bg-zinc-900"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-indigo-600" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            AI Coach
          </h2>
        </div>
        <div className="flex items-center gap-1">
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100
                         hover:text-zinc-600 dark:hover:bg-zinc-800"
              title="Tyhjenna historia"
              aria-label="Tyhjenna historia"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100
                       hover:text-zinc-600 dark:hover:bg-zinc-800"
            aria-label="Sulje AI Coach"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Quick-action buttons */}
      <div className="flex gap-2 border-b border-zinc-200 px-4 py-2 dark:border-zinc-700">
        {(["summarize", "brainstorm", "challenge"] as const).map((mode) => {
          const meta = MODE_META[mode];
          const Icon = meta.icon;
          return (
            <button
              key={mode}
              onClick={() => sendRequest(mode)}
              disabled={isLoading}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md
                         border border-zinc-200 px-2 py-1.5 text-xs font-medium
                         text-zinc-700 transition-colors
                         hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700
                         disabled:cursor-not-allowed disabled:opacity-50
                         dark:border-zinc-600 dark:text-zinc-300
                         dark:hover:bg-indigo-950 dark:hover:border-indigo-600"
            >
              <Icon className="h-3.5 w-3.5" />
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* Response / history area */}
      <div
        ref={responseAreaRef}
        className="flex-1 overflow-y-auto px-4 py-3 text-sm leading-relaxed
                   text-zinc-700 dark:text-zinc-300"
      >
        {/* Error */}
        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-md bg-red-50 p-3 text-red-700 dark:bg-red-950 dark:text-red-300">
            <X className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-medium">Virhe</p>
              <p className="text-xs">{error}</p>
            </div>
          </div>
        )}

        {/* Streaming response */}
        {isLoading && streamingText && (
          <div className="mb-4 rounded-md bg-indigo-50 p-3 dark:bg-indigo-950">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
              <span className="text-xs font-medium text-indigo-600">
                Kirjoittaa...
              </span>
              <button
                onClick={handleCancel}
                className="ml-auto text-xs text-indigo-400 hover:text-indigo-600"
              >
                Peruuta
              </button>
            </div>
            <div
              className="prose-sm"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(streamingText),
              }}
            />
          </div>
        )}

        {/* Loading without text yet */}
        {isLoading && !streamingText && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-indigo-50 p-3 dark:bg-indigo-950">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
            <span className="text-xs text-indigo-600">
              AI analysoi kanvasta...
            </span>
            <button
              onClick={handleCancel}
              className="ml-auto text-xs text-indigo-400 hover:text-indigo-600"
            >
              Peruuta
            </button>
          </div>
        )}

        {/* History */}
        {history.map((item) => {
          const meta = MODE_META[item.mode];
          const Icon = meta.icon;
          return (
            <div
              key={item.id}
              className="mb-3 rounded-md border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800"
            >
              <div className="mb-2 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <Icon className="h-3 w-3" />
                <span className="font-medium">{meta.label}</span>
                <span className="text-zinc-300 dark:text-zinc-600">|</span>
                <span className="truncate max-w-[180px]">{item.prompt}</span>
                <span className="ml-auto text-zinc-400 tabular-nums">
                  {new Date(item.timestamp).toLocaleTimeString("fi-FI", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div
                className="prose-sm"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(item.response),
                }}
              />
            </div>
          );
        })}

        {/* Empty state */}
        {!isLoading && history.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400">
            <Bot className="mb-3 h-10 w-10 opacity-30" />
            <p className="text-sm font-medium">AI Coach</p>
            <p className="mt-1 text-xs">
              Paina Tiivista, Ideoi tai Haasta
              <br />
              tai kirjoita oma kysymys.
            </p>
          </div>
        )}
      </div>

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-700"
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Kysy jotain kanvaksesta..."
            rows={2}
            className="flex-1 resize-none rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2
                       text-sm text-zinc-900 placeholder:text-zinc-400
                       focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400
                       dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100
                       dark:placeholder:text-zinc-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-md bg-indigo-600
                       text-white transition-colors
                       hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Laheta"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-zinc-400">
          Enter lahettaa. Shift+Enter uusi rivi.
        </p>
      </form>
    </div>
  );
}
