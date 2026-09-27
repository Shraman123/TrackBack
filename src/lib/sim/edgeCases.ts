import type { EvalContext } from "../engine/evaluate";
import { addHours, DEMO_NOW } from "../engine/time";
import type { Claim, ClaimedOrder, RetailerId, Verdict } from "../types";

// Hand-written boundary cases. Each one pins down a product decision that a
// reviewer (or a future change) could reasonably get wrong.

const now = DEMO_NOW;
const user = { id: "edge_u", name: "Edge", city: "—", tenureDays: 400, lifetimeClaims: 2, approvedClaims: 2, flagged: false };

function build(
  retailerId: RetailerId,
  orderAgeH: number,
  clickGapH: number | null, // hours before order (negative = after)
  patch: Partial<ClaimedOrder> = {},
  userPatch: Partial<typeof user> = {},
): { claim: Claim; ctx: EvalContext } {
  const placedAt = addHours(now, -orderAgeH);
  const order: ClaimedOrder = {
    retailerId,
    orderId: "EDGE-0001",
    placedAt,
    amount: 1999,
    items: [{ name: "Running Shoes", category: "fashion", price: 1999 }],
    status: "delivered",
    couponCode: null,
    couponSource: null,
    hasInvoice: false,
    ...patch,
  };
  const clicks =
    clickGapH === null
      ? []
      : [{ id: "edge_c", userId: user.id, retailerId, at: addHours(placedAt, -clickGapH), surface: "app" as const }];
  return {
    claim: { id: "edge", userId: user.id, submittedAt: now, order, source: "seed" },
    ctx: { user: { ...user, ...userPatch }, clicks, transactions: [], now },
  };
}

export interface EdgeCase {
  id: string;
  why: string;
  expected: Verdict;
  make: () => { claim: Claim; ctx: EvalContext };
}

export const EDGE_CASES: EdgeCase[] = [
  { id: "E01", why: "Order 23.9 h after the visit is inside Amazon's 24 h window", expected: "AUTO_FILE", make: () => build("amazon", 100, 23.9) },
  { id: "E02", why: "Order 24.1 h after the visit is outside it", expected: "NOT_ELIGIBLE", make: () => build("amazon", 100, 24.1) },
  { id: "E03", why: "User opened the app 10 min after buying (common) — not attributable", expected: "NOT_ELIGIBLE", make: () => build("amazon", 100, -1 / 6) },
  {
    id: "E04",
    why: "Flipkart credits one item; an excluded gift card first in the cart must not eat that slot",
    expected: "AUTO_FILE",
    make: () => build("flipkart", 100, 1, {
      items: [{ name: "Gift Card", category: "gift_card", price: 1000 }, { name: "Running Shoes", category: "fashion", price: 1999 }],
      amount: 2999,
    }),
  },
  { id: "E05", why: "Claim on the last day of the window is accepted", expected: "AUTO_FILE", make: () => build("amazon", 10 * 24 - 1, 2) },
  { id: "E06", why: "Exchange at Myntra doesn't void cashback", expected: "AUTO_FILE", make: () => build("myntra", 100, 2, { status: "exchanged" }) },
  { id: "E07", why: "Exchange at Amazon does", expected: "NOT_ELIGIBLE", make: () => build("amazon", 100, 2, { status: "exchanged" }) },
  { id: "E08", why: "Myntra's own coupon is fine", expected: "AUTO_FILE", make: () => build("myntra", 100, 2, { couponCode: "MYNTRA300", couponSource: "retailer" }) },
  { id: "E09", why: "Outside coupon at a store that allows any coupon", expected: "AUTO_FILE", make: () => build("amazon", 100, 2, { couponCode: "SITEWIDE10", couponSource: "third_party" }) },
  {
    id: "E10",
    why: "₹4,999 order with no invoice goes through",
    expected: "AUTO_FILE",
    make: () => build("amazon", 100, 2, { amount: 4999, items: [{ name: "Speaker", category: "electronics", price: 4999 }] }),
  },
  {
    id: "E11",
    why: "₹5,000 order with no invoice asks for it",
    expected: "NEEDS_INFO",
    make: () => build("amazon", 100, 2, { amount: 5000, items: [{ name: "Speaker", category: "electronics", price: 5000 }] }),
  },
  {
    id: "E12",
    why: "High value but no visit: say no now, don't waste a reviewer's time",
    expected: "NOT_ELIGIBLE",
    make: () => build("tatacliq", 100, null, { amount: 89990, items: [{ name: "OLED TV", category: "electronics", price: 89990 }], hasInvoice: true }),
  },
  {
    id: "E13",
    why: "Too early but an outside coupon already voids it: don't make the user wait 3 days for a no",
    expected: "NOT_ELIGIBLE",
    make: () => build("myntra", 10, 1, { couponCode: "DEALSHUB20", couponSource: "third_party" }),
  },
  {
    id: "E14",
    why: "Cashback capped at ₹1,500 on Amazon still needs a human (over ₹1,000)",
    expected: "HUMAN_REVIEW",
    make: () => build("amazon", 100, 2, { amount: 70000, items: [{ name: "Designer Lehenga", category: "fashion", price: 70000 }], hasInvoice: true }),
  },
  {
    id: "E15",
    why: "Flagged account never auto-files, even for ₹30",
    expected: "HUMAN_REVIEW",
    make: () => build("amazon", 100, 2, { amount: 999, items: [{ name: "Kajal Pack", category: "beauty", price: 599 }] }, { flagged: true }),
  },
  {
    id: "E16",
    why: "Nykaa visit 72 h before the order, window is 24 h: outside",
    expected: "NOT_ELIGIBLE",
    make: () => build("nykaa", 100, 72, { items: [{ name: "Serum", category: "beauty", price: 899 }], amount: 899 }),
  },
];

