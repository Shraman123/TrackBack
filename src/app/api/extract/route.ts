import Anthropic from "@anthropic-ai/sdk";
import { parseOrderText } from "@/lib/extract/parseText";
import { validateOrder } from "@/lib/extract/validate";
import { extractOrderWithClaude, llmEnabled, type ExtractInput } from "@/lib/llm/claude";
import type { ClaimedOrder } from "@/lib/types";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
const MAX_IMAGE_BYTES = 4_000_000;

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
  let via: "claude" | "parser" = "parser";
  let note: string | undefined;

  if (llmEnabled()) {
    try {
      order = await extractOrderWithClaude(input);
      if (order) via = "claude";
      else note = "Claude returned no usable fields; used the rule-based parser.";
    } catch (err) {
      note =
        err instanceof Anthropic.RateLimitError
          ? "Claude is rate-limited right now; used the rule-based parser."
          : err instanceof Anthropic.APIError
            ? `Claude API error ${err.status}; used the rule-based parser.`
            : "Couldn't reach Claude; used the rule-based parser.";
    }
  } else {
    note = "No API key configured; used the rule-based parser.";
  }

  if (!order) {
    if (input.kind === "image") {
      return Response.json(
        { error: "Reading screenshots needs Claude, which isn't configured here. Paste the order email text instead.", note },
        { status: 422 },
      );
    }
    order = parseOrderText(input.text);
  }

  return Response.json({ order, via, note, warnings: validateOrder(order) });
}
