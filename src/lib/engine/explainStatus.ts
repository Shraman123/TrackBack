import { RETAILERS } from "../data/retailers";
import type { CancelCode, Transaction } from "../types";
import { addDays, daysBetween, fmtDate, ms } from "./time";

// Turns a wallet entry into "why is it in this state, and what happens next".
// Reviews show the pain isn't only the delay, it's that dates move and
// cancellations arrive with no reason. Every status gets a reason and a next step.

export interface StatusExplanation {
  headline: string;
  why: string;
  next: string;
  /** Timeline stages with a done flag and date, for the UI. */
  stages: { label: string; date: string; done: boolean; note?: string }[];
  dateMoved: boolean;
  appealable: boolean;
  tone: "good" | "wait" | "bad";
}

const CANCEL_COPY: Record<CancelCode, { why: string; next: string; appealable: boolean }> = {
  RETURNED: {
    why: "The store reported this order as returned. Cashback is only paid on orders you keep.",
    next: "If you didn't return it, appeal with the delivery confirmation and we'll re-raise it with the store.",
    appealable: true,
  },
  ORDER_CANCELLED: {
    why: "The store reported the order as cancelled, so there was no sale to pay cashback on.",
    next: "If the order was delivered, appeal with the delivery confirmation.",
    appealable: true,
  },
  OTHER_AFFILIATE: {
    why: "The store credited this sale to another site or app you visited after us (for example a coupon or deals site). Stores pay only the last site you came from.",
    next: "Next time, go straight from us to checkout without opening other coupon sites in between.",
    appealable: false,
  },
  CART_BEFORE_CLICK: {
    why: "The items were already in your cart before you came through us, so the store didn't count the visit.",
    next: "Next time, empty the cart, come through us, then add items. This one can't be appealed.",
    appealable: false,
  },
  EXCLUDED_CATEGORY: {
    why: "The store doesn't pay cashback on this product category.",
    next: "Check the store's cashback rates page for excluded categories before buying.",
    appealable: false,
  },
  COUPON_VOID: {
    why: "A coupon not issued by the store was used, and this store cancels cashback when that happens.",
    next: "Use only the store's own coupons, or the ones shown in our app.",
    appealable: false,
  },
  EXCHANGED: {
    why: "The item was exchanged, and this store treats an exchange as a return.",
    next: "Nothing to do for this order; exchanges at this store always cancel cashback.",
    appealable: false,
  },
  NETWORK_REJECTED_NO_REASON: {
    why: "The store rejected this without giving a reason. That's on us to chase, not on you.",
    next: "We've asked the store's affiliate team for a reason. You'll hear back by the date below, or the cashback is re-opened.",
    appealable: true,
  },
};

export function explainTransaction(t: Transaction, now: string): StatusExplanation {
  const r = RETAILERS[t.retailerId];
  const returnCloses = addDays(t.placedAt, r.returnWindowDays);
  const dateMoved = ms(t.currentConfirmBy) > ms(t.originalConfirmBy);
  const stages = [
    { label: "Order tracked", date: fmtDate(t.placedAt), done: true },
    {
      label: `${r.name} return window closes`,
      date: fmtDate(returnCloses),
      done: ms(now) >= ms(returnCloses),
    },
    {
      label: `${r.name} sends final report`,
      date: fmtDate(t.currentConfirmBy),
      done: t.status === "confirmed" || t.status === "paid" || t.status === "cancelled",
      note: dateMoved ? `moved from ${fmtDate(t.originalConfirmBy)}` : undefined,
    },
    {
      label: t.status === "cancelled" ? "Cancelled" : "Ready to withdraw",
      date: t.status === "pending" ? "—" : fmtDate(t.currentConfirmBy),
      done: t.status !== "pending",
    },
  ];

  if (t.status === "cancelled") {
    const copy = CANCEL_COPY[t.cancelCode ?? "NETWORK_REJECTED_NO_REASON"];
    return {
      headline: "Cancelled — here's exactly why",
      why: copy.why,
      next: copy.next,
      stages,
      dateMoved,
      appealable: copy.appealable,
      tone: "bad",
    };
  }
  if (t.status === "confirmed" || t.status === "paid") {
    return {
      headline: t.status === "paid" ? "Paid out" : "Confirmed — ready to withdraw",
      why: `${r.name} confirmed the sale after the return window closed.`,
      next: t.status === "paid" ? "Nothing to do." : "Withdraw to bank or UPI once your balance crosses the minimum.",
      stages,
      dateMoved,
      appealable: false,
      tone: "good",
    };
  }

  // pending
  const overdue = ms(now) > ms(t.currentConfirmBy);
  const silentDays = t.lastNetworkReportAt ? Math.floor(daysBetween(t.lastNetworkReportAt, now)) : null;
  let why: string;
  if (ms(now) < ms(returnCloses)) {
    why = `You can still return this order until ${fmtDate(returnCloses)}. ${r.name} only confirms cashback after that, then takes about ${r.validationLagDays} days to send its final sales report.`;
  } else if (dateMoved) {
    why = `The return window has closed, but ${r.name} hasn't sent its final report for this order${silentDays !== null ? ` (last update ${silentDays} days ago)` : ""}. That's why the date moved from ${fmtDate(t.originalConfirmBy)}. Nothing is wrong with your order.`;
  } else {
    why = `The return window has closed. ${r.name} is validating the sale; its final report usually lands within ${r.validationLagDays} days.`;
  }
  const next = overdue
    ? `This is past the expected date, so we've escalated it to ${r.name}'s affiliate team. If there's no answer in 7 days, we'll escalate it to a human on our side automatically.`
    : dateMoved
      ? `Expected by ${fmtDate(t.currentConfirmBy)}. If the date moves again, you'll get a message with the reason, never a silent change.`
      : `Expected by ${fmtDate(t.currentConfirmBy)}. No action needed.`;
  return {
    headline: overdue ? "Pending — overdue, escalated" : dateMoved ? "Pending — date moved, here's why" : "Pending — on track",
    why,
    next,
    stages,
    dateMoved,
    appealable: false,
    tone: "wait",
  };
}
