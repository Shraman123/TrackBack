import type { ClaimedOrder, Decision } from "../types";
import type { Lang } from "../engine/messages";
import { CLAUDE_MODEL, extractOrderWithClaude, rewriteWithClaude } from "./claude";
import { extractOrderWithGroq, GROQ_TEXT_MODEL, GROQ_VISION_MODEL, rewriteWithGroq } from "./groq";
import type { ExtractInput, RewriteResult } from "./shared";

export type { ExtractInput, RewriteResult } from "./shared";

// Picks the AI provider from the environment. Groq first (free tier), then Anthropic.
// With neither key, the app runs on the rule-based parser and templates.

export type Provider = "groq" | "anthropic" | null;

export function provider(): Provider {
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

export const llmEnabled = () => provider() !== null;

/** Human-readable model label for the UI, per input kind. */
export function modelLabel(kind: "text" | "image" = "text"): string {
  const p = provider();
  if (p === "groq") return kind === "image" ? GROQ_VISION_MODEL : GROQ_TEXT_MODEL;
  if (p === "anthropic") return CLAUDE_MODEL;
  return "rule-based parser";
}

export function extractOrder(input: ExtractInput): Promise<ClaimedOrder | null> {
  return provider() === "groq" ? extractOrderWithGroq(input) : extractOrderWithClaude(input);
}

export function rewriteMessage(d: Decision, draft: { title: string; body: string }, lang: Lang): Promise<RewriteResult> {
  return provider() === "groq" ? rewriteWithGroq(d, draft, lang) : rewriteWithClaude(d, draft, lang);
}
