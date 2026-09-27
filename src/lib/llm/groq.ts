import type { ClaimedOrder, Decision } from "../types";
import type { Lang } from "../engine/messages";
import {
  EXTRACT_JSON_SHAPE,
  EXTRACT_SYSTEM,
  ExtractedOrder,
  guardRewrite,
  LANG_NAME,
  parseJsonReply,
  REWRITE_SYSTEM,
  RewriteOut,
  toClaimedOrder,
  type ExtractInput,
  type RewriteResult,
} from "./shared";

// Groq provider (OpenAI-compatible chat completions). Free tier friendly:
// gpt-oss-120b for text, a Qwen vision model for screenshots.

export const GROQ_TEXT_MODEL = process.env.GROQ_TEXT_MODEL ?? "openai/gpt-oss-120b";
export const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL ?? "qwen/qwen3.8-27b";

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

export class GroqError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Part = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

async function chat(body: Record<string, unknown>): Promise<string> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.GROQ_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new GroqError(res.status, (await res.text()).slice(0, 300));
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

export async function extractOrderWithGroq(input: ExtractInput): Promise<ClaimedOrder | null> {
  const isImage = input.kind === "image";
  const user: Part[] = isImage
    ? [
        { type: "text", text: "Extract this order." },
        { type: "image_url", image_url: { url: `data:${input.mediaType};base64,${input.base64}` } },
      ]
    : [{ type: "text", text: `Order document:\n\n${input.text}` }];

  const request = {
    model: isImage ? GROQ_VISION_MODEL : GROQ_TEXT_MODEL,
    max_tokens: 2000,
    temperature: 0,
    // JSON mode on the text model; the vision model is parsed defensively instead.
    ...(isImage ? {} : { response_format: { type: "json_object" }, reasoning_effort: "low" }),
    messages: [
      { role: "system", content: `${EXTRACT_SYSTEM}

${EXTRACT_JSON_SHAPE}` },
      { role: "user", content: isImage ? user : (user[0] as { text: string }).text },
    ],
  };
  // Validate against the same schema the Claude path uses; one retry on an off-shape reply.
  for (let attempt = 0; attempt < 2; attempt++) {
    let text: string;
    try {
      text = await chat(request);
    } catch (err) {
      // Groq rejects a JSON-mode reply that fails its own validation with a 400; retry that once.
      if (attempt === 0 && err instanceof GroqError && err.status === 400) continue;
      throw err;
    }
    const parsed = ExtractedOrder.safeParse(parseJsonReply(text));
    if (parsed.success) return toClaimedOrder(parsed.data);
  }
  return null;
}

export async function rewriteWithGroq(
  d: Decision,
  draft: { title: string; body: string },
  lang: Lang,
): Promise<RewriteResult> {
  const text = await chat({
    model: GROQ_TEXT_MODEL,
    max_tokens: 1200,
    temperature: 0.3,
    response_format: { type: "json_object" },
    reasoning_effort: "low",
    messages: [
      { role: "system", content: `${REWRITE_SYSTEM.replace("{LANG}", LANG_NAME[lang])}\nReply with JSON only: {"title": string, "body": string}` },
      { role: "user", content: `Decision: ${d.verdict} (${d.reason})\n\nDraft title: ${draft.title}\nDraft body: ${draft.body}` },
    ],
  });
  const parsed = RewriteOut.safeParse(parseJsonReply(text));
  return guardRewrite(draft, parsed.success ? parsed.data : null);
}
