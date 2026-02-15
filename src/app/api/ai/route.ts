import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Types (mirror of client types — kept lean to avoid import issues)
// ---------------------------------------------------------------------------

type AIMode = "summarize" | "brainstorm" | "challenge" | "custom";

interface CanvasElement {
  id: string;
  type: string;
  text?: string;
  [key: string]: unknown;
}

interface AIRequestBody {
  elements: CanvasElement[];
  prompt: string;
  mode: AIMode;
}

// ---------------------------------------------------------------------------
// System prompts per mode
// ---------------------------------------------------------------------------

const SYSTEM_PROMPTS: Record<AIMode, string> = {
  summarize: [
    "Olet strategiaworkshop-fasilitaattori.",
    "Tiivista workshopin ydinkohdat suomeksi.",
    "Kayta selkeaa rakennetta: otsikot, luettelomerkit, lyhyet kappaleet.",
    "Keskity strategisiin paatoksiin, avainloydoksiin ja toimenpiteisiin.",
    "Vastaa suomeksi.",
  ].join(" "),

  brainstorm: [
    "Olet luova strategiakonsultti.",
    "Ideoi 5 uutta nakokulmaa perustuen workshopin sisaltoon.",
    "Jokaiselle idealle: otsikko, lyhyt kuvaus, ja miksi se on arvokas.",
    "Ole rohkea — haasta totuttuja ajattelumalleja.",
    "Vastaa suomeksi.",
  ].join(" "),

  challenge: [
    "Olet kriittinen strategia-analyytikko.",
    "Haasta oletukset ja kysy kriittisia kysymyksia.",
    "Tunnista sokeita pisteita, riskeja ja puuttuvia nakokulmia.",
    "Ole rakentavan kriittinen — tarjoa myos vaihtoehtoisia polkuja.",
    "Vastaa suomeksi.",
  ].join(" "),

  custom: [
    "Olet strategiaworkshop-avustaja.",
    "Vastaa kayttajan kysymykseen perustuen workshopin sisaltoon.",
    "Vastaa selkeasti ja konkreettisesti suomeksi.",
  ].join(" "),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function elementsToContext(elements: CanvasElement[]): string {
  if (!elements || elements.length === 0) {
    return "Workshop-kanvas on tyhja. Kayttaja ei ole viela lisannyt sisaltoa.";
  }

  const textParts = elements
    .filter((el) => el.text && el.text.trim().length > 0)
    .map((el) => `[${el.type}] ${el.text}`);

  if (textParts.length === 0) {
    return "Workshop-kanvas sisaltaa elementteja, mutta niissa ei ole tekstia.";
  }

  return [
    "Workshop-kanvaksen sisalto:",
    "",
    ...textParts,
  ].join("\n");
}

function validateRequestBody(body: unknown): AIRequestBody {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be a JSON object");
  }

  const { elements, prompt, mode } = body as Record<string, unknown>;

  if (!Array.isArray(elements)) {
    throw new Error("'elements' must be an array");
  }

  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    throw new Error("'prompt' must be a non-empty string");
  }

  const validModes: AIMode[] = ["summarize", "brainstorm", "challenge", "custom"];
  if (!validModes.includes(mode as AIMode)) {
    throw new Error(`'mode' must be one of: ${validModes.join(", ")}`);
  }

  return { elements: elements as CanvasElement[], prompt, mode: mode as AIMode };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // 1. Validate API key exists
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // 2. Parse and validate body
  let body: AIRequestBody;
  try {
    const raw = await request.json();
    body = validateRequestBody(raw);
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Invalid request" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { elements, prompt, mode } = body;

  // 3. Build the prompt
  const systemPrompt = SYSTEM_PROMPTS[mode];
  const canvasContext = elementsToContext(elements);

  const userMessage = [
    canvasContext,
    "",
    "---",
    "",
    `Kayttajan pyynto: ${prompt}`,
  ].join("\n");

  // 4. Create Anthropic client and stream
  const client = new Anthropic({ apiKey });

  try {
    const stream = client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    // 5. Convert SDK stream to web ReadableStream
    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          controller.close();
        } catch (streamError) {
          controller.error(streamError);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Anthropic API error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}
