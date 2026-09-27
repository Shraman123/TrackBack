import { RETAILER_LIST, RETAILERS } from "../data/retailers";
import { POLICY, type EvalContext } from "../engine/evaluate";
import { addDays, addHours, DEMO_NOW } from "../engine/time";
import type { Claim, Click, OrderItem, ReasonCode, Retailer, User, Verdict } from "../types";

// Builds synthetic claims with a planted ground truth. Each scenario starts from a
// clean, valid claim and breaks exactly one thing, then (optionally) adds noise
// that must NOT change the outcome. Used for the eval suite, the impact model,
// and to fill the ops queue.

export const REASON_VERDICT: Record<ReasonCode, Verdict> = {
  OK: "AUTO_FILE",
  TOO_EARLY: "WAIT",
  MISSING_FIELDS: "NEEDS_INFO",
  INVOICE_REQUIRED: "NEEDS_INFO",
  HIGH_VALUE: "HUMAN_REVIEW",
  RISK_SIGNAL: "HUMAN_REVIEW",
  DUPLICATE_TRACKED: "ALREADY_TRACKED",
  CLAIM_WINDOW_EXPIRED: "NOT_ELIGIBLE",
  NO_CLICK: "NOT_ELIGIBLE",
  CLICK_AFTER_ORDER: "NOT_ELIGIBLE",
  CLICK_OUTSIDE_WINDOW: "NOT_ELIGIBLE",
  ORDER_CANCELLED: "NOT_ELIGIBLE",
  ORDER_RETURNED: "NOT_ELIGIBLE",
  EXCHANGE_VOIDS: "NOT_ELIGIBLE",
  ALL_ITEMS_EXCLUDED: "NOT_ELIGIBLE",
  THIRD_PARTY_COUPON: "NOT_ELIGIBLE",
};

export const ALL_REASONS = Object.keys(REASON_VERDICT) as ReasonCode[];

/**
 * Assumed mix of incoming missing-cashback claims. Not CashKaro data — a stated
 * assumption the impact page exposes, informed by which complaints dominate reviews.
 */
export const ASSUMED_MIX: Record<ReasonCode, number> = {
  OK: 38, TOO_EARLY: 12, MISSING_FIELDS: 4, INVOICE_REQUIRED: 6, HIGH_VALUE: 3, RISK_SIGNAL: 3,
  DUPLICATE_TRACKED: 4, CLAIM_WINDOW_EXPIRED: 5, NO_CLICK: 7, CLICK_AFTER_ORDER: 2,
  CLICK_OUTSIDE_WINDOW: 5, ORDER_CANCELLED: 2, ORDER_RETURNED: 2, EXCHANGE_VOIDS: 1,
  ALL_ITEMS_EXCLUDED: 2, THIRD_PARTY_COUPON: 4,
};

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;
const pick = <T,>(r: Rng, xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
const between = (r: Rng, lo: number, hi: number) => lo + r() * (hi - lo);

const CATALOG: Record<string, [string, number, number][]> = {
  fashion: [["Cotton Kurta", 799, 2499], ["Slim Fit Jeans", 999, 2999], ["Running Shoes", 1299, 3999], ["Printed Dress", 899, 2799]],
  beauty: [["Matte Lipstick", 299, 899], ["Vitamin C Serum", 399, 1199], ["Kajal Pack", 199, 499]],
  electronics: [["Wireless Earbuds", 999, 3999], ["Bluetooth Speaker", 1499, 4999], ["Smart Watch", 1999, 4499]],
  home: [["Pressure Cooker", 1299, 2999], ["Bedsheet Set", 599, 1999], ["Mixer Grinder", 1999, 3999]],
  default: [["Backpack", 699, 1999], ["Water Bottle Set", 299, 899], ["Yoga Mat", 499, 1499]],
  hotel: [["Hotel stay, 2 nights", 3999, 8999]],
  gift_card: [["Gift Card", 500, 5000]],
  gold_coin: [["22K Gold Coin 1g", 6500, 7500]],
  flight_fare: [["Flight DEL-BLR", 4500, 9000]],
  mobile: [["5G Smartphone", 12999, 24999]],
};

function item(r: Rng, category: string): OrderItem {
  const [name, lo, hi] = pick(r, CATALOG[category] ?? CATALOG.default);
  return { name, category, price: Math.round(between(r, lo, hi) / 10) * 10 - 1 };
}

function eligibleCategories(ret: Retailer) {
  return Object.keys(ret.rates).filter((c) => c !== "default" || Object.keys(ret.rates).length === 1).filter(
    (c) => !ret.excludedCategories.includes(c) && c !== "mobile",
  );
}

function orderIdFor(r: Rng, ret: Retailer) {
  const n = (k: number) => Array.from({ length: k }, () => Math.floor(r() * 10)).join("");
  switch (ret.id) {
    case "amazon": return `${n(3)}-${n(7)}-${n(7)}`;
    case "flipkart": return `OD${n(18)}`;
    case "ajio": return `FN${n(10)}`;
    case "nykaa": return `NYK-${n(8)}`;
    default: return n(12);
  }
}

export interface Scenario {
  claim: Claim;
  ctx: EvalContext;
  label: ReasonCode;
  expected: Verdict;
  noise: string[];
}

export function makeScenario(r: Rng, label: ReasonCode, idx: number, withNoise: boolean): Scenario {
  const noise: string[] = [];
  const now = DEMO_NOW;

  // Retailer choice depends on the rule under test.
  let pool = RETAILER_LIST;
  if (label === "THIRD_PARTY_COUPON") pool = pool.filter((x) => x.couponPolicy === "retailer_only");
  if (label === "EXCHANGE_VOIDS") pool = pool.filter((x) => x.exchangeVoidsCashback);
  if (label === "HIGH_VALUE") pool = pool.filter((x) => (x.capPerOrder ?? Infinity) > POLICY.humanReviewAboveCashback);
  const ret = pick(r, pool);

  const user: User = {
    id: `sim_u${idx}`,
    name: `User ${idx}`,
    city: "—",
    tenureDays: Math.round(between(r, 60, 1500)),
    lifetimeClaims: Math.floor(between(r, 0, 6)),
    approvedClaims: 0,
    flagged: false,
  };
  user.approvedClaims = Math.round(user.lifetimeClaims * between(r, 0.5, 1));

  // Clean baseline: 1-2 eligible items, small order, valid click, mid-window age.
  const cats = eligibleCategories(ret);
  const items: OrderItem[] = [item(r, pick(r, cats))];
  if (ret.multiItemTracking && r() < 0.4) items.push(item(r, pick(r, cats)));
  const ageHours = between(r, ret.trackingLagHours + 2, ret.claimWindowDays * 24 - 12);
  const placedAt = addHours(now, -ageHours);
  const gapHours = between(r, 0.05, ret.attributionWindowHours * 0.9);
  const clicks: Click[] = [
    { id: `sim_c${idx}`, userId: user.id, retailerId: ret.id, at: addHours(placedAt, -gapHours), surface: r() < 0.7 ? "app" : "web" },
  ];
  const claim: Claim = {
    id: `sim_${idx}`,
    userId: user.id,
    submittedAt: now,
    source: "seed",
    order: {
      retailerId: ret.id,
      orderId: orderIdFor(r, ret),
      placedAt,
      amount: items.reduce((s, i) => s + i.price, 0),
      items,
      status: r() < 0.8 ? "delivered" : "shipped",
      couponCode: null,
      couponSource: null,
      hasInvoice: r() < 0.3,
    },
  };
  const o = claim.order;
  const transactions: EvalContext["transactions"] = [];

  // Keep the baseline under the invoice threshold unless an invoice is present.
  if (o.amount! >= POLICY.invoiceRequiredAboveOrder) o.hasInvoice = true;

  switch (label) {
    case "OK":
      break;
    case "TOO_EARLY": {
      const h = between(r, 1, ret.trackingLagHours - 1);
      o.placedAt = addHours(now, -h);
      clicks[0].at = addHours(o.placedAt, -gapHours);
      break;
    }
    case "MISSING_FIELDS": {
      const f = pick(r, ["orderId", "placedAt", "amount", "retailerId"] as const);
      (o as unknown as Record<string, unknown>)[f] = null;
      break;
    }
    case "INVOICE_REQUIRED": {
      o.items = [item(r, pick(r, cats))];
      o.items[0].price = Math.round(between(r, POLICY.invoiceRequiredAboveOrder, 12000));
      o.amount = o.items[0].price;
      o.hasInvoice = false;
      // keep cashback low enough that the invoice rule is the one that fires
      break;
    }
    case "HIGH_VALUE": {
      const cat = cats.includes("electronics") ? "electronics" : cats[0];
      const rate = ret.rates[cat] ?? ret.rates.default;
      const price = Math.ceil((POLICY.humanReviewAboveCashback * between(r, 1.1, 1.8)) / rate);
      o.items = [{ name: "Premium order", category: cat, price }];
      o.amount = price;
      o.hasInvoice = true;
      break;
    }
    case "RISK_SIGNAL": {
      const kind = pick(r, ["flagged", "low_ratio", "new_user"] as const);
      if (kind === "flagged") user.flagged = true;
      if (kind === "low_ratio") { user.lifetimeClaims = 12; user.approvedClaims = 2; }
      if (kind === "new_user") {
        user.tenureDays = 3;
        const cat = cats[0];
        const rate = ret.rates[cat] ?? ret.rates.default;
        const price = Math.ceil((POLICY.newUserCashbackLimit * 1.4) / rate);
        o.items = [{ name: "First big order", category: cat, price }];
        o.amount = price;
        o.hasInvoice = true;
        if (price * rate > POLICY.humanReviewAboveCashback) o.items[0].price = Math.floor(POLICY.humanReviewAboveCashback / rate);
        o.amount = o.items[0].price;
      }
      noise.push(`risk:${kind}`);
      break;
    }
    case "DUPLICATE_TRACKED":
      transactions.push({
        id: `sim_t${idx}`, userId: user.id, retailerId: ret.id, orderId: o.orderId!, orderAmount: o.amount!,
        cashback: 50, placedAt: o.placedAt!, status: "pending", originalConfirmBy: addDays(now, 30),
        currentConfirmBy: addDays(now, 30), lastNetworkReportAt: now,
      });
      break;
    case "CLAIM_WINDOW_EXPIRED": {
      o.placedAt = addDays(now, -(ret.claimWindowDays + between(r, 1, 30)));
      clicks[0].at = addHours(o.placedAt, -gapHours);
      break;
    }
    case "NO_CLICK":
      clicks.length = 0;
      break;
    case "CLICK_AFTER_ORDER":
      clicks[0].at = addHours(o.placedAt!, between(r, 0.1, POLICY.clickAfterOrderGraceHours - 0.5));
      break;
    case "CLICK_OUTSIDE_WINDOW":
      clicks[0].at = addHours(o.placedAt!, -between(r, ret.attributionWindowHours + 1, ret.attributionWindowHours * 4));
      break;
    case "ORDER_CANCELLED":
      o.status = "cancelled";
      break;
    case "ORDER_RETURNED":
      o.status = "returned";
      break;
    case "EXCHANGE_VOIDS":
      o.status = "exchanged";
      break;
    case "ALL_ITEMS_EXCLUDED": {
      const ex = pick(r, ret.excludedCategories);
      o.items = [item(r, ex)];
      o.amount = o.items[0].price;
      o.hasInvoice = true;
      break;
    }
    case "THIRD_PARTY_COUPON":
      o.couponCode = pick(r, ["DEALSHUB20", "SAVEMORE15", "GRABIT10", "COUPONX"]);
      o.couponSource = "third_party";
      break;
  }

  if (withNoise) {
    // Each of these must leave the verdict unchanged.
    if (r() < 0.5) {
      const other = pick(r, RETAILER_LIST.filter((x) => x.id !== ret.id));
      clicks.push({ id: `sim_n${idx}a`, userId: user.id, retailerId: other.id, at: addHours(now, -between(r, 1, 200)), surface: "app" });
      noise.push("click at another store");
    }
    if (r() < 0.4 && label !== "NO_CLICK" && label !== "CLICK_AFTER_ORDER" && o.placedAt) {
      const earliest = clicks.filter((c) => c.retailerId === ret.id).reduce((m, c) => Math.min(m, +new Date(c.at)), Infinity);
      if (Number.isFinite(earliest)) {
        clicks.push({ id: `sim_n${idx}b`, userId: user.id, retailerId: ret.id, at: addDays(new Date(earliest).toISOString(), -between(r, 5, 40)), surface: "web" });
        noise.push("older visit to same store");
      }
    }
    if (r() < 0.3 && ret.couponPolicy === "any" && label !== "THIRD_PARTY_COUPON") {
      o.couponCode = "SITEWIDE10";
      o.couponSource = "third_party";
      noise.push("outside coupon at a store that allows it");
    }
    if (r() < 0.2 && !ret.exchangeVoidsCashback && ["OK", "TOO_EARLY", "INVOICE_REQUIRED"].includes(label)) {
      o.status = "exchanged";
      noise.push("exchange at a store that allows it");
    }
    if (r() < 0.25 && ["OK", "TOO_EARLY", "NO_CLICK", "CLAIM_WINDOW_EXPIRED"].includes(label) && ret.excludedCategories.length && o.items.length) {
      const ex = item(r, pick(r, ret.excludedCategories));
      ex.price = Math.min(ex.price, 499);
      o.items.push(ex);
      o.amount = o.items.reduce((s, i) => s + i.price, 0);
      if (o.amount >= POLICY.invoiceRequiredAboveOrder) o.hasInvoice = true;
      noise.push("one excluded item among eligible ones");
    }
  }

  return {
    claim,
    ctx: { user, clicks, transactions, now },
    label,
    expected: REASON_VERDICT[label],
    noise,
  };
}

/** Balanced suite: `perReason` scenarios for every reason code. */
export function evalSuite(perReason = 25, seed = 7): Scenario[] {
  const r = mulberry32(seed);
  let i = 0;
  return ALL_REASONS.flatMap((label) =>
    Array.from({ length: perReason }, () => makeScenario(r, label, i++, r() < 0.6)),
  );
}

/** Realistic stream following ASSUMED_MIX. */
export function claimStream(n: number, seed = 11, mix = ASSUMED_MIX): Scenario[] {
  const r = mulberry32(seed);
  const total = Object.values(mix).reduce((a, b) => a + b, 0);
  const out: Scenario[] = [];
  for (let i = 0; i < n; i++) {
    let x = r() * total;
    let label: ReasonCode = "OK";
    for (const [k, w] of Object.entries(mix) as [ReasonCode, number][]) {
      if ((x -= w) <= 0) { label = k; break; }
    }
    out.push(makeScenario(r, label, i, r() < 0.5));
  }
  return out;
}

export { RETAILERS };
