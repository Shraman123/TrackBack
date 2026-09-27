import Anthropic from "@anthropic-ai/sdk";
import { parseOrderText } from "@/lib/extract/parseText";
import { validateOrder } from "@/lib/extract/validate";
import { extractOrder, llmEnabled, modelLabel, type ExtractInput } from "@/lib/llm";
import { GroqError } from "@/lib/llm/groq";
import type { ClaimedOrder } from "@/lib/types";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
const MAX_IMAGE_BYTES = 4_000_000;

function describeError(err: unknown): string {
  const status =
    err instanceof GroqError ? err.status : err instanceof Anthropic.APIError ? err.status : null;
  if (status === 429) return "The AI model is rate-limited right now; used the rule-based parser.";
  if (status) return `AI provider error ${status}; used the rule-based parser.`;
  return "Couldn't reach the AI provider; used the rule-based parser.";
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { text?: string; imageBase64?: string; mediaType?: string }
    | null;
  if (!body || (!body.text && !body.imageBase64)) {
    return Response.json({ error: "Send order text or a screenshot." }, { status: 400 });
  }

  let input: ExtractInput;
  if (body.imageBase64) {
    const mediaType = IMAGE_TYPES.find((t) => t === body.mediaType);
    if (!mediaType) return Response.json({ error: "Use a PNG, JPEG or WebP screenshot." }, { status: 400 });
    if (body.imageBase64.length * 0.75 > MAX_IMAGE_BYTES) {
      return Response.json({ error: "Screenshot is too large (max 4 MB)." }, { status: 413 });
    }
    input = { kind: "image", base64: body.imageBase64, mediaType };
  } else {
    input = { kind: "text", text: body.text!.slice(0, 8000) };
  }

  let order: ClaimedOrder | null = null;
  let via: "llm" | "parser" = "parser";
  let note: string | undefined;
  const model = modelLabel(input.kind);

  if (llmEnabled()) {
    try {
      order = await extractOrder(input);
      if (order) via = "llm";
      else note = "The model returned no usable fields; used the rule-based parser.";
    } catch (err) {
      note = describeError(err);
    }
  } else {
    note = "No AI key configured; used the rule-based parser.";
  }

  if (!order) {
    if (input.kind === "image") {
      return Response.json(
        { error: "Couldn't read that screenshot. Paste the order email text instead.", note },
        { status: 422 },
      );
    }
    order = parseOrderText(input.text);
  }

  return Response.json({ order, via, model: via === "llm" ? model : "rule-based parser", note, warnings: validateOrder(order) });
}
