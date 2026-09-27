import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { retailerFromName } from "../data/retailers";
import { classifyCoupon } from "../extract/parseText";
import type { ClaimedOrder, Decision } from "../types";
import type { Lang } from "../engine/messages";

// Claude does two jobs here and never a third:
//   1. read an order screenshot / email into structured fields
//   2. rewrite the rules engine's message in a warmer voice (EN or Hinglish)
// It never decides whether a claim is valid or how much cashback is owed.
// Both outputs are checked before use, with a deterministic fallback.

export const MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-5";

export function llmEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
function getClient() {
  client ??= new Anthropic();
  return client;
}

const CATEGORIES = [
  "default", "electronics", "mobile", "fashion", "beauty", "home", "hotel",
  "gift_card", "gold_coin", "grocery_fresh", "flight_fare",
] as const;

const ExtractedOrder = z.object({
  store: z.string().nullable().describe("Store name as shown, e.g. Amazon, Flipkart, Myntra"),
  order_id: z.string().nullable(),
  placed_at: z
    .string()
    .nullable()
    .describe("Order date-time in ISO 8601 with +05:30 offset; use 12:00 if only the date is shown"),
  order_total: z.number().nullable().describe("Final order total in rupees"),
  items: z.array(
    z.object({
      name: z.string(),
      category: z.enum(CATEGORIES),
      price: z.number(),
    }),
  ),
  status: z.enum(["placed", "shipped", "delivered", "cancelled", "returned", "exchanged"]),
  coupon_code: z.string().nullable(),
  is_invoice: z.boolean().describe("True if the document is a tax invoice, not just a confirmation"),
});

const EXTRACT_SYSTEM = `You read Indian e-commerce order confirmations, invoices and app screenshots and return the order's fields.
Copy values exactly as shown; don't infer an order ID or a price that isn't visible — use null.
Map each item to the closest category. Use "mobile" for phones, "electronics" for other gadgets, "gift_card" for gift cards or vouchers.
Status is "placed" unless the document shows shipped, delivered, cancelled, returned or exchanged.`;

export type ExtractInput =
  | { kind: "text"; text: string }
  | { kind: "image"; base64: string; mediaType: "image/png" | "image/jpeg" | "image/webp" };

export async function extractOrderWithClaude(input: ExtractInput): Promise<ClaimedOrder | null> {
  const content: Anthropic.ContentBlockParam[] =
    input.kind === "text"
      ? [{ type: "text", text: `Order document:\n\n${input.text}` }]
      : [
          { type: "image", source: { type: "base64", media_type: input.mediaType, data: input.base64 } },
          { type: "text", text: "Extract this order." },
        ];

  const response = await getClient().messages.parse({
    model: MODEL,
    max_tokens: 4000,
    system: EXTRACT_SYSTEM,
    output_config: { effort: "low", format: zodOutputFormat(ExtractedOrder) },
    messages: [{ role: "user", content }],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) return null;

  const o = response.parsed_output;
  const retailerId = retailerFromName(o.store)?.id ?? null;
  const coupon = o.coupon_code?.toUpperCase() ?? null;
  return {
    retailerId,
    orderId: o.order_id,
    placedAt: o.placed_at ? new Date(o.placed_at).toISOString() : null,
    amount: o.order_total,
    items: o.items,
    status: o.status,
    couponCode: coupon,
    couponSource: classifyCoupon(retailerId, coupon),
    hasInvoice: o.is_invoice,
  };
}

// ---- message rewrite ----------------------------------------------------------

const REWRITE_SYSTEM = `You write short in-app messages for a cashback app's claim screen.
You'll get a decision and an approved draft. Rewrite the draft so it reads warm, direct and human: 2-4 sentences, no apologies stacked on apologies, no emojis, no promises.
Hard rules: keep every amount, date, order ID and store name exactly as in the draft; add no new numbers, dates, amounts or commitments; don't change the outcome.
Language: {LANG}.`;

const LANG_NAME: Record<Lang, string> = {
  en: "English (Indian English is fine)",
  hi: "Hinglish — Hindi in Latin script, the way people text; keep store names and amounts as-is",
};

/** Every number-ish token (₹ amounts, dates, IDs) in a string. */
export function numericTokens(s: string): string[] {
  return (s.match(/₹?\d[\d,.\-:]*/g) ?? []).map((t) => t.replace(/[.,:-]+$/, ""));
}

export interface RewriteResult {
  title: string;
  body: string;
  source: "claude" | "template";
  blocked?: string; // why the guardrail rejected Claude's text
}

export async function rewriteWithClaude(
  d: Decision,
  draft: { title: string; body: string },
  lang: Lang,
): Promise<RewriteResult> {
  const response = await getClient().messages.parse({
    model: MODEL,
    max_tokens: 2000,
    system: REWRITE_SYSTEM.replace("{LANG}", LANG_NAME[lang]),
    output_config: {
      effort: "low",
      format: zodOutputFormat(z.object({ title: z.string(), body: z.string() })),
    },
    messages: [
      {
        role: "user",
        content: `Decision: ${d.verdict} (${d.reason})\n\nDraft title: ${draft.title}\nDraft body: ${draft.body}`,
      },
    ],
  });
  const out = response.parsed_output;
  if (response.stop_reason === "refusal" || !out) {
    return { ...draft, source: "template", blocked: "no usable output" };
  }
  // Guardrail: the rewrite may not introduce a number the engine didn't produce.
  const allowed = new Set(numericTokens(draft.title + " " + draft.body));
  const invented = numericTokens(out.title + " " + out.body).filter((t) => !allowed.has(t));
  if (invented.length) {
    return { ...draft, source: "template", blocked: `introduced ${invented.join(", ")}` };
  }
  return { title: out.title, body: out.body, source: "claude" };
}
