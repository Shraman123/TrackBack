import type { ClaimedOrder, RetailerId } from "../types";
import { DEMO_NOW, daysBetween } from "../engine/time";

// Sanity checks on extracted fields, whether they came from Claude or the parser.
// Anything flagged is shown to the user to confirm before the engine runs.

const ORDER_ID_FORMATS: Partial<Record<RetailerId, RegExp>> = {
  amazon: /^\d{3}-\d{7}-\d{7}$/,
  flipkart: /^OD\d{15,21}$/,
  ajio: /^FN\d{8,12}$/,
  nykaa: /^NYK-\d{6,10}$/,
};

export interface FieldWarning {
  field: keyof ClaimedOrder | "items_total";
  message: string;
}

export function validateOrder(o: ClaimedOrder, now = DEMO_NOW): FieldWarning[] {
  const w: FieldWarning[] = [];
  if (!o.retailerId) w.push({ field: "retailerId", message: "Couldn't tell which store this is" });
  if (o.retailerId && o.orderId) {
    const re = ORDER_ID_FORMATS[o.retailerId];
    if (re && !re.test(o.orderId)) w.push({ field: "orderId", message: `Doesn't look like a ${o.retailerId} order ID` });
  }
  if (o.placedAt) {
    const age = daysBetween(o.placedAt, now);
    if (age < -0.05) w.push({ field: "placedAt", message: "Order date is in the future" });
    else if (age > 120) w.push({ field: "placedAt", message: "Order is more than 4 months old" });
  }
  if (o.amount && o.items.length) {
    const sum = o.items.reduce((s, i) => s + i.price, 0);
    // Coupons and shipping move the total a little; a big gap means a misread.
    if (Math.abs(sum - o.amount) / Math.max(sum, o.amount) > 0.35) {
      w.push({ field: "items_total", message: `Items add up to ₹${sum.toLocaleString("en-IN")} but total says ₹${o.amount.toLocaleString("en-IN")}` });
    }
  }
  return w;
}
