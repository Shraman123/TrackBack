import { retailerFromName } from "../data/retailers";
import { STORE_COUPONS } from "../data/seed";
import type { ClaimedOrder, OrderItem, OrderStatus, RetailerId } from "../types";

// Deterministic parser for pasted order-confirmation emails. It runs when no LLM
// key is configured, and it's the baseline the LLM extractor is scored against.

const CATEGORY_KEYWORDS: [RegExp, string][] = [
  [/gift ?card|voucher/i, "gift_card"],
  [/gold|silver coin|\bcoin\b/i, "gold_coin"],
  [/\bflight|airfare/i, "flight_fare"],
  [/hotel|resort|stay/i, "hotel"],
  [/mobile|smartphone|\bphone\b|iphone|galaxy/i, "mobile"],
  [/tv\b|television|laptop|headphone|earbud|airdopes|speaker|camera|tablet|monitor|watch/i, "electronics"],
  [/lipstick|foundation|serum|cream|shampoo|perfume|kajal|mascara/i, "beauty"],
  [/kurta|shirt|jeans|dress|saree|shoe|sneaker|overcoat|jacket|t-shirt|top\b/i, "fashion"],
  [/cooker|bedsheet|mattress|pillow|curtain|cookware|mixer|kettle/i, "home"],
  [/fresh|vegetable|fruit|milk/i, "grocery_fresh"],
];

export function guessCategory(name: string): string {
  for (const [re, cat] of CATEGORY_KEYWORDS) if (re.test(name)) return cat;
  return "default";
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

export function parseIndianDate(s: string): string | null {
  const m = s.match(/(\d{1,2})[\s-]+([A-Za-z]{3,9})[\s,-]+(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})\s*([ap]\.?m\.?)?)?/i);
  if (!m) return null;
  const mon = MONTHS[m[2].toLowerCase().slice(0, m[2].toLowerCase().startsWith("sept") ? 4 : 3)];
  if (mon === undefined) return null;
  let hh = m[4] ? parseInt(m[4], 10) : 12;
  const mm = m[5] ? parseInt(m[5], 10) : 0;
  const ap = m[6]?.toLowerCase().replace(/\./g, "");
  if (ap === "pm" && hh < 12) hh += 12;
  if (ap === "am" && hh === 12) hh = 0;
  const pad = (n: number) => String(n).padStart(2, "0");
  return new Date(`${m[3]}-${pad(mon + 1)}-${pad(parseInt(m[1], 10))}T${pad(hh)}:${pad(mm)}:00+05:30`).toISOString();
}

const money = (s: string) => parseFloat(s.replace(/[₹,\s]|Rs\.?/gi, ""));

export function classifyCoupon(retailerId: RetailerId | null, code: string | null) {
  if (!code) return null;
  const list = retailerId ? STORE_COUPONS[retailerId] ?? [] : [];
  return list.includes(code.toUpperCase()) ? ("retailer" as const) : ("third_party" as const);
}

export function parseOrderText(text: string): ClaimedOrder {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const retailer = retailerFromName(text.slice(0, 200)) ?? retailerFromName(text);
  const retailerId = retailer?.id ?? null;

  const idMatch =
    // The ID must contain a digit, or "Order Confirmation" would match.
    text.match(/order\s*(?:id|no\.?|number|#)?\s*[:#]?\s*#?\s*([A-Z0-9-]*\d[A-Z0-9-]{5,})/i) ??
    text.match(/#\s*([0-9]{3}-[0-9]{7}-[0-9]{7})/);
  const orderId = idMatch ? idMatch[1] : null;

  const dateLine = lines.find((l) => /(placed|ordered|order date|date)\b/i.test(l) && /\d{4}/.test(l));
  const placedAt = dateLine ? parseIndianDate(dateLine) : null;

  const totalLine =
    lines.find((l) => /(order total|grand total|^total\b(?! paid))/i.test(l)) ??
    lines.find((l) => /total/i.test(l));
  const amount = totalLine ? money(totalLine.match(/(₹|Rs\.?)\s?[\d,]+(\.\d+)?/i)?.[0] ?? "") || null : null;

  const items: OrderItem[] = lines
    .filter((l) => /(₹|Rs\.?)\s?[\d,]+(\.\d+)?\s*$/i.test(l) && !/total|paid|subtotal|shipping|discount/i.test(l))
    .map((l) => {
      const priceStr = l.match(/(₹|Rs\.?)\s?[\d,]+(\.\d+)?\s*$/i)![0];
      const name = l.replace(priceStr, "").replace(/^\d+\.\s*/, "").trim();
      return { name, category: guessCategory(name), price: money(priceStr) };
    });

  const couponCode = text.match(/coupon(?: applied| code)?\s*[:\-]?\s*([A-Z0-9]{4,})/i)?.[1]?.toUpperCase() ?? null;

  const statusWord = text.match(/status\s*[:\-]?\s*(\w+)/i)?.[1]?.toLowerCase() ?? "";
  const status: OrderStatus = (
    ["placed", "shipped", "delivered", "cancelled", "returned", "exchanged"] as const
  ).find((s) => statusWord.startsWith(s.slice(0, 5))) ?? "placed";

  return {
    retailerId,
    orderId,
    placedAt,
    amount,
    items,
    status,
    couponCode,
    couponSource: classifyCoupon(retailerId, couponCode),
    hasInvoice: false,
  };
}
