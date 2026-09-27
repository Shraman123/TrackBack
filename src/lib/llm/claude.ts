import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { ClaimedOrder, Decision } from "../types";
import type { Lang } from "../engine/messages";
import {
  EXTRACT_SYSTEM,
  ExtractedOrder,
  guardRewrite,
  LANG_NAME,
  REWRITE_SYSTEM,
  RewriteOut,
  toClaimedOrder,
  type ExtractInput,
  type RewriteResult,
} from "./shared";

// Anthropic provider. Used when ANTHROPIC_API_KEY is set and GROQ_API_KEY isn't.

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-5";

let client: Anthropic | null = null;
function getClient() {
  client ??= new Anthropic();
  return client;
}

export async function extractOrderWithClaude(input: ExtractInput): Promise<ClaimedOrder | null> {
  const content: Anthropic.ContentBlockParam[] =
    input.kind === "text"
      ? [{ type: "text", text: `Order document:\n\n${input.text}` }]
      : [
          { type: "image", source: { type: "base64", media_type: input.mediaType, data: input.base64 } },
          { type: "text", text: "Extract this order." },
        ];

  const response = await getClient().messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 4000,
    system: EXTRACT_SYSTEM,
    output_config: { effort: "low", format: zodOutputFormat(ExtractedOrder) },
    messages: [{ role: "user", content }],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) return null;
  return toClaimedOrder(response.parsed_output);
}

export async function rewriteWithClaude(
  d: Decision,
  draft: { title: string; body: string },
  lang: Lang,
): Promise<RewriteResult> {
  const response = await getClient().messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 2000,
    system: REWRITE_SYSTEM.replace("{LANG}", LANG_NAME[lang]),
    output_config: { effort: "low", format: zodOutputFormat(RewriteOut) },
    messages: [
      {
        role: "user",
        content: `Decision: ${d.verdict} (${d.reason})\n\nDraft title: ${draft.title}\nDraft body: ${draft.body}`,
      },
    ],
  });
  const out = response.stop_reason === "refusal" ? null : response.parsed_output;
  return guardRewrite(draft, out);
}
