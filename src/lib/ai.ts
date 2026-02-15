/**
 * AI Coach client-side service layer.
 *
 * All calls go through /api/ai — never calls Anthropic directly from the browser.
 * Supports streaming responses via ReadableStream.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AIMode = "summarize" | "brainstorm" | "challenge" | "custom";

export interface CanvasElement {
  id: string;
  type: string;
  text?: string;
  [key: string]: unknown;
}

export interface AIRequest {
  elements: CanvasElement[];
  prompt: string;
  mode: AIMode;
}

export interface AIResponse {
  content: string;
  mode: AIMode;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Streaming fetch
// ---------------------------------------------------------------------------

/**
 * Send canvas elements + prompt to the AI API route and return an async
 * iterator that yields text chunks as they arrive.
 *
 * Falls back to a single-chunk response if streaming is not available.
 */
export async function* analyzeCanvas(
  elements: CanvasElement[],
  prompt: string,
  mode: AIMode,
  signal?: AbortSignal,
): AsyncGenerator<string, void, unknown> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ elements, prompt, mode } satisfies AIRequest),
    signal,
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "Unknown error");
    throw new Error(`AI request failed (${res.status}): ${errorBody}`);
  }

  // Stream path — the API route returns Transfer-Encoding: chunked text/plain
  if (res.body) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        yield decoder.decode(value, { stream: true });
      }
    } finally {
      reader.releaseLock();
    }
    return;
  }

  // Non-streaming fallback
  const text = await res.text();
  yield text;
}

// ---------------------------------------------------------------------------
// Convenience: collect full response
// ---------------------------------------------------------------------------

export async function analyzeCanvasFull(
  elements: CanvasElement[],
  prompt: string,
  mode: AIMode,
  signal?: AbortSignal,
): Promise<AIResponse> {
  let content = "";
  for await (const chunk of analyzeCanvas(elements, prompt, mode, signal)) {
    content += chunk;
  }
  return { content, mode, timestamp: Date.now() };
}
