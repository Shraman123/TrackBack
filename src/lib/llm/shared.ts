import { z } from "zod";
import { retailerFromName } from "../data/retailers";
import { classifyCoupon } from "../extract/parseText";
import type { ClaimedOrder } from "../types";
import type { Lang } from "../engine/messages";

// Provider-independent pieces of the AI layer. The model does two jobs and never a third:
//   1. read an order screenshot / email into structured fields
//   2. rewrite the rules engine's message in a warmer voice (EN or Hinglish)
// It never decides whether a claim is valid or how much cashback is owed.
// Both outputs are checked before use, with a deterministic fallback.

export const CATEGORIES = [
  "default", "electronics", "mobile", "fashion", "beauty", "home", "hotel",
  "gift_card", "gold_coin", "grocery_fresh", "flight_fare",
] as const;

export const ExtractedOrder = z.object({
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
      price: z.number().nullable().describe("Item price if shown, else null"),
    }),
  ),
  status: z.enum(["placed", "shipped", "delivered", "cancelled", "returned", "exchanged"]),
  coupon_code: z.string().nullable(),
  is_invoice: z.boolean().describe("True if the document is a tax invoice, not just a confirmation"),
});
export type ExtractedOrder = z.infer<typeof ExtractedOrder>;

export const EXTRACT_SYSTEM = `You read Indian e-commerce order confirmations, invoices and app screenshots and return the order's fields.
Copy values exactly as shown; don't infer an order ID or a price that isn't visible — use null.
Map each item to the closest category. Use "mobile" for phones, "electronics" for other gadgets, "gift_card" for gift cards or vouchers.
Status is "placed" unless the document shows shipped, delivered, cancelled, returned or exchanged.`;

/** JSON shape spelled out for providers without schema-constrained decoding. */
export const EXTRACT_JSON_SHAPE = `Reply with one JSON object and nothing else:
{"store": string|null, "order_id": string|null, "placed_at": ISO-8601 string with +05:30 offset|null,
 "order_total": number|null, "items": [{"name": string, "category": one of ${CATEGORIES.map((c) => `"${c}"`).join(", ")}, "price": number|null}],
 "status": "placed"|"shipped"|"delivered"|"cancelled"|"returned"|"exchanged", "coupon_code": string|null, "is_invoice": boolean}
Current year is 2026 if the year isn't shown.`;

export type ExtractInput =
  | { kind: "text"; text: string }
  | { kind: "image"; base64: string; mediaType: "image/png" | "image/jpeg" | "image/webp" };

export function toClaimedOrder(o: ExtractedOrder): ClaimedOrder {
  const retailerId = retailerFromName(o.store)?.id ?? null;
  const coupon = o.coupon_code?.toUpperCase() ?? null;
  const placed = o.placed_at ? new Date(o.placed_at) : null;
  // SMS and notifications often show a total but not per-item prices (or the reverse).
  const known = o.items.reduce((sum, i) => sum + (i.price ?? 0), 0);
  const unpriced = o.items.filter((i) => i.price === null).length;
  const total = o.order_total ?? (unpriced === 0 && known > 0 ? known : null);
  const fill = unpriced && total !== null ? Math.max(0, (total - known) / unpriced) : 0;
  const items = o.items.map((i) => ({ ...i, price: i.price ?? Math.round(fill) }));
  return {
    retailerId,
    orderId: o.order_id,
    placedAt: placed && !Number.isNaN(placed.getTime()) ? placed.toISOString() : null,
    amount: total,
    items,
    status: o.status,
    couponCode: coupon,
    couponSource: classifyCoupon(retailerId, coupon),
    hasInvoice: o.is_invoice,
  };
}

// ---- message rewrite ----------------------------------------------------------

export const REWRITE_SYSTEM = `You write short in-app messages for a cashback app's claim screen.
You'll get a decision and an approved draft. Rewrite the draft so it reads warm, direct and human: 2-4 sentences, no apologies stacked on apologies, no emojis, no promises.
Hard rules: keep every amount, date, order ID and store name exactly as in the draft; add no new numbers, dates, amounts or commitments; don't change the outcome.
Language: {LANG}.`;

export const LANG_NAME: Record<Lang, string> = {
  en: "English (Indian English is fine)",
  hi: "Hinglish — Hindi in Latin script, the way people text; keep store names and amounts as-is",
};

export const RewriteOut = z.object({ title: z.string(), body: z.string() });

/** Every number-ish token (₹ amounts, dates, IDs) in a string. */
export function numericTokens(s: string): string[] {
  return (s.match(/₹?\d[\d,.\-:]*/g) ?? []).map((t) => t.replace(/[.,:-]+$/, ""));
}

export interface RewriteResult {
  title: string;
  body: string;
  source: "llm" | "template";
  blocked?: string; // why the guardrail rejected the model's text
}

/** Guardrail: the rewrite may not introduce a number the engine didn't produce. */
export function guardRewrite(
  draft: { title: string; body: string },
  out: { title: string; body: string } | null,
): RewriteResult {
  if (!out) return { ...draft, source: "template", blocked: "no usable output" };
  const allowed = new Set(numericTokens(draft.title + " " + draft.body));
  const invented = numericTokens(out.title + " " + out.body).filter((t) => !allowed.has(t));
  if (invented.length) return { ...draft, source: "template", blocked: `introduced ${invented.join(", ")}` };
  return { title: out.title, body: out.body, source: "llm" };
}

/** Pull the first JSON object out of a model reply (strips code fences and <think> blocks). */
export function parseJsonReply(text: string): unknown {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/```(?:json)?/g, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}
