import { RETAILERS } from "../data/retailers";
import type {
  Check,
  Claim,
  Click,
  Decision,
  OrderItem,
  ReasonCode,
  Retailer,
  Transaction,
  User,
  Verdict,
} from "../types";
import { addDays, addHours, daysBetween, fmtDate, fmtHours, hoursBetween, inr, ms } from "./time";

// Thresholds are product decisions, kept in one place so the PRD can cite them.
export const POLICY = {
  invoiceRequiredAboveOrder: 5000, // ₹ order value that needs an invoice before filing
  humanReviewAboveCashback: 1000, // ₹ cashback a person must sign off on
  newUserDays: 14,
  newUserCashbackLimit: 300,
  lowApprovalMinClaims: 8,
  lowApprovalRatio: 0.3,
  clickAfterOrderGraceHours: 6,
} as const;

export interface EvalContext {
  user: User;
  clicks: Click[];
  transactions: Transaction[];
  now: string;
}

interface ItemCashback {
  item: OrderItem;
  excluded: boolean;
  counted: boolean;
  cashback: number;
}

export function itemCashback(retailer: Retailer, items: OrderItem[]): {
  lines: ItemCashback[];
  total: number;
  capped: boolean;
} {
  let firstEligibleSeen = false;
  const lines = items.map((item) => {
    const excluded = retailer.excludedCategories.includes(item.category);
    let counted = !excluded;
    if (counted && !retailer.multiItemTracking) {
      counted = !firstEligibleSeen;
      firstEligibleSeen = true;
    }
    const rate = retailer.rates[item.category] ?? retailer.rates.default;
    return { item, excluded, counted, cashback: counted ? item.price * rate : 0 };
  });
  const raw = lines.reduce((s, l) => s + l.cashback, 0);
  const capped = retailer.capPerOrder !== null && raw > retailer.capPerOrder;
  return { lines, total: Math.round(capped ? retailer.capPerOrder! : raw), capped };
}

export function evaluateClaim(claim: Claim, ctx: EvalContext): Decision {
  const { order } = claim;
  const { now, user } = ctx;
  const checks: Check[] = [];
  const facts: Record<string, string | number> = {};
  const dates: Decision["dates"] = { decidedAt: now };

  const decide = (
    verdict: Verdict,
    reason: ReasonCode,
    extra: Partial<Decision> = {},
  ): Decision => ({
    claimId: claim.id,
    verdict,
    reason,
    checks,
    expectedCashback: 0,
    approvalOdds: null,
    dates,
    facts,
    ...extra,
  });

  // 1. Required fields --------------------------------------------------------
  const missing: string[] = [];
  if (!order.retailerId) missing.push("store");
  if (!order.orderId) missing.push("order ID");
  if (!order.placedAt) missing.push("order date");
  if (!order.amount || order.amount <= 0) missing.push("order amount");
  if (order.items.length === 0) missing.push("items");
  checks.push({
    id: "fields",
    label: "Order details complete",
    status: missing.length ? "fail" : "pass",
    detail: missing.length ? `Missing: ${missing.join(", ")}` : "Store, order ID, date, amount and items present",
  });
  if (missing.length) {
    facts.missing = missing.join(", ");
    return decide("NEEDS_INFO", "MISSING_FIELDS");
  }

  const retailer = RETAILERS[order.retailerId!];
  const placedAt = order.placedAt!;
  facts.store = retailer.name;
  facts.orderId = order.orderId!;
  facts.orderDate = fmtDate(placedAt);
  facts.orderAmount = inr(order.amount!);

  // 2. Already tracked? --------------------------------------------------------
  const tracked = ctx.transactions.find(
    (t) => t.userId === user.id && t.retailerId === retailer.id && t.orderId === order.orderId,
  );
  checks.push({
    id: "duplicate",
    label: "Not already in wallet",
    status: tracked ? "fail" : "pass",
    detail: tracked
      ? `Order already tracked (${tracked.status}, ${inr(tracked.cashback)})`
      : "No existing cashback for this order ID",
  });
  if (tracked) {
    facts.trackedStatus = tracked.status;
    facts.trackedCashback = inr(tracked.cashback);
    return decide("ALREADY_TRACKED", "DUPLICATE_TRACKED", { matchedTxnId: tracked.id });
  }

  // 3. Claim window -----------------------------------------------------------
  const deadline = addDays(placedAt, retailer.claimWindowDays);
  dates.claimDeadline = deadline;
  const ageDays = daysBetween(placedAt, now);
  const windowOk = ms(now) <= ms(deadline);
  checks.push({
    id: "claim_window",
    label: `Raised within ${retailer.claimWindowDays} days of order`,
    status: windowOk ? "pass" : "fail",
    detail: `Order is ${Math.floor(ageDays)} days old; ${retailer.name} accepts claims until ${fmtDate(deadline)}`,
  });

  // 4. Click match ------------------------------------------------------------
  const userClicks = ctx.clicks
    .filter((c) => c.userId === user.id && c.retailerId === retailer.id)
    .sort((a, b) => ms(a.at) - ms(b.at));
  const before = userClicks.filter((c) => ms(c.at) <= ms(placedAt));
  const lastBefore = before[before.length - 1];
  const justAfter = userClicks.find(
    (c) => ms(c.at) > ms(placedAt) && hoursBetween(placedAt, c.at) <= POLICY.clickAfterOrderGraceHours,
  );
  let clickReason: ReasonCode | null = null;
  let clickDetail: string;
  if (lastBefore && hoursBetween(lastBefore.at, placedAt) <= retailer.attributionWindowHours) {
    const gap = hoursBetween(lastBefore.at, placedAt);
    clickDetail = `Visit via ${lastBefore.surface} ${fmtHours(gap)} before the order (window: ${retailer.attributionWindowHours} h)`;
    facts.clickGap = fmtHours(gap);
  } else if (lastBefore) {
    const gap = hoursBetween(lastBefore.at, placedAt);
    clickReason = "CLICK_OUTSIDE_WINDOW";
    clickDetail = `Last visit via us was ${fmtHours(gap)} before the order; ${retailer.name} only credits orders within ${retailer.attributionWindowHours} h`;
    facts.clickGap = fmtHours(gap);
    facts.window = `${retailer.attributionWindowHours} hours`;
  } else if (justAfter) {
    clickReason = "CLICK_AFTER_ORDER";
    clickDetail = `Visit via us came ${fmtHours(hoursBetween(placedAt, justAfter.at))} after the order was placed`;
    facts.clickGap = fmtHours(hoursBetween(placedAt, justAfter.at));
  } else {
    clickReason = "NO_CLICK";
    clickDetail = `No visit to ${retailer.name} through us found before this order`;
  }
  checks.push({
    id: "click_match",
    label: "Visit through us before the order",
    status: clickReason ? "fail" : "pass",
    detail: clickDetail,
  });

  // 5. Order status -----------------------------------------------------------
  let statusReason: ReasonCode | null = null;
  if (order.status === "cancelled") statusReason = "ORDER_CANCELLED";
  else if (order.status === "returned") statusReason = "ORDER_RETURNED";
  else if (order.status === "exchanged" && retailer.exchangeVoidsCashback) statusReason = "EXCHANGE_VOIDS";
  checks.push({
    id: "order_status",
    label: "Order not cancelled or returned",
    status: statusReason ? "fail" : "pass",
    detail: statusReason
      ? `Order is ${order.status}${statusReason === "EXCHANGE_VOIDS" ? ` (${retailer.name} treats exchanges as returns)` : ""}`
      : `Order is ${order.status}`,
  });

  // 6. Categories -------------------------------------------------------------
  const cb = itemCashback(retailer, order.items);
  const excluded = cb.lines.filter((l) => l.excluded);
  const allExcluded = excluded.length === cb.lines.length;
  checks.push({
    id: "category",
    label: "Items eligible for cashback",
    status: allExcluded ? "fail" : excluded.length ? "warn" : "pass",
    detail: excluded.length
      ? `${excluded.length} of ${cb.lines.length} item(s) in excluded categories: ${excluded.map((l) => l.item.name).join(", ")}`
      : "All items in eligible categories",
  });
  if (excluded.length) facts.excludedItems = excluded.map((l) => l.item.name).join(", ");

  // 7. Coupon -----------------------------------------------------------------
  const couponVoid = order.couponSource === "third_party" && retailer.couponPolicy === "retailer_only";
  checks.push({
    id: "coupon",
    label: "Coupon allowed",
    status: couponVoid ? "fail" : "pass",
    detail: couponVoid
      ? `Coupon ${order.couponCode ?? ""} is not from ${retailer.name}; ${retailer.name} voids cashback on outside coupons`
      : order.couponCode
        ? `Coupon ${order.couponCode} is allowed`
        : "No coupon used",
  });
  if (order.couponCode) facts.coupon = order.couponCode;

  // 8. Multi-item -------------------------------------------------------------
  const notCounted = cb.lines.filter((l) => !l.excluded && !l.counted);
  checks.push({
    id: "multi_item",
    label: "All items attributable",
    status: notCounted.length ? "warn" : "pass",
    detail: notCounted.length
      ? `${retailer.name} only credits the first item of a cart; ${notCounted.length} item(s) won't earn cashback`
      : cb.lines.length > 1
        ? "Retailer credits every item in the cart"
        : "Single item",
  });

  // Hard "no" rules, in the order a user would find most useful to hear.
  const hardFail =
    (!windowOk && "CLAIM_WINDOW_EXPIRED") ||
    clickReason ||
    statusReason ||
    (allExcluded && "ALL_ITEMS_EXCLUDED") ||
    (couponVoid && "THIRD_PARTY_COUPON") ||
    null;

  if (hardFail) {
    facts.claimDeadline = fmtDate(deadline);
    return decide("NOT_ELIGIBLE", hardFail as ReasonCode);
  }

  const expected = cb.total;
  facts.expectedCashback = inr(expected);
  if (cb.capped) facts.cap = inr(retailer.capPerOrder!);

  // 9. Too early? Checked after the rules so nobody waits 3 days for a "no". -------
  const recheckAt = addHours(placedAt, retailer.trackingLagHours);
  const tooEarly = ms(now) < ms(recheckAt);
  checks.push({
    id: "tracking_lag",
    label: `${retailer.trackingLagHours} h tracking delay has passed`,
    status: tooEarly ? "warn" : "pass",
    detail: tooEarly
      ? `${retailer.name} can take ${retailer.trackingLagHours} h to report; it may still track on its own`
      : `More than ${retailer.trackingLagHours} h since the order and still not tracked`,
  });
  if (tooEarly) {
    dates.recheckAt = recheckAt;
    facts.recheckAt = fmtDate(recheckAt);
    return decide("WAIT", "TOO_EARLY", { expectedCashback: expected });
  }

  // 10. Evidence --------------------------------------------------------------
  const needInvoice = order.amount! >= POLICY.invoiceRequiredAboveOrder && !order.hasInvoice;
  checks.push({
    id: "evidence",
    label: "Evidence sufficient",
    status: needInvoice ? "fail" : "pass",
    detail: needInvoice
      ? `Orders above ${inr(POLICY.invoiceRequiredAboveOrder)} need the invoice for ${retailer.name} to accept a claim`
      : order.hasInvoice
        ? "Invoice attached"
        : "Order details enough for this order value",
  });
  if (needInvoice) {
    facts.invoiceThreshold = inr(POLICY.invoiceRequiredAboveOrder);
    return decide("NEEDS_INFO", "INVOICE_REQUIRED", { expectedCashback: expected });
  }

  // 11. Risk ------------------------------------------------------------------
  const approvalRatio = user.lifetimeClaims ? user.approvedClaims / user.lifetimeClaims : 1;
  const riskFlags: string[] = [];
  if (user.flagged) riskFlags.push("account flagged by trust & safety");
  if (user.lifetimeClaims >= POLICY.lowApprovalMinClaims && approvalRatio < POLICY.lowApprovalRatio)
    riskFlags.push(`only ${user.approvedClaims}/${user.lifetimeClaims} past claims approved`);
  if (user.tenureDays < POLICY.newUserDays && expected > POLICY.newUserCashbackLimit)
    riskFlags.push(`new account (${user.tenureDays} days) with ${inr(expected)} claim`);
  const highValue = expected > POLICY.humanReviewAboveCashback;
  checks.push({
    id: "risk",
    label: "Safe to auto-file",
    status: highValue || riskFlags.length ? "warn" : "pass",
    detail: highValue
      ? `Cashback ${inr(expected)} is above the ${inr(POLICY.humanReviewAboveCashback)} auto-file limit`
      : riskFlags.length
        ? riskFlags.join("; ")
        : "No risk signals",
  });

  // Filing math is shared by AUTO_FILE and HUMAN_REVIEW.
  const clickGapH = hoursBetween(lastBefore!.at, placedAt);
  let odds = retailer.historicalClaimApproval;
  if (order.hasInvoice) odds += 0.12;
  if (clickGapH <= 1) odds += 0.08;
  if (notCounted.length) odds -= 0.05;
  if (excluded.length) odds -= 0.05;
  odds = Math.min(0.95, Math.max(0.05, odds));

  const returnCloses = addDays(placedAt, retailer.returnWindowDays);
  dates.networkAnswerBy = addDays(now, retailer.claimResponseDays);
  dates.expectedConfirmBy = addDays(returnCloses, retailer.validationLagDays);
  facts.networkAnswerBy = fmtDate(dates.networkAnswerBy);
  facts.expectedConfirmBy = fmtDate(dates.expectedConfirmBy);
  facts.approvalOdds = `${Math.round(odds * 100)}%`;

  const networkPayload = {
    network_program: retailer.name,
    sub_id: lastBefore!.id,
    click_time: lastBefore!.at,
    order_id: order.orderId!,
    order_time: placedAt,
    order_value: order.amount!,
    eligible_value: cb.lines.filter((l) => l.counted).reduce((s, l) => s + l.item.price, 0),
    invoice_attached: order.hasInvoice ? "yes" : "no",
  };

  const filed = {
    expectedCashback: expected,
    approvalOdds: Math.round(odds * 100) / 100,
    matchedClickId: lastBefore!.id,
    networkPayload,
  };

  if (highValue) return decide("HUMAN_REVIEW", "HIGH_VALUE", filed);
  if (riskFlags.length) {
    facts.riskFlags = riskFlags.join("; ");
    return decide("HUMAN_REVIEW", "RISK_SIGNAL", filed);
  }
  return decide("AUTO_FILE", "OK", filed);
}
