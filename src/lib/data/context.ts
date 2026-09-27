import type { Claim, ClaimedOrder } from "../types";
import type { EvalContext } from "../engine/evaluate";
import { DEMO_NOW } from "../engine/time";
import { parseOrderText } from "../extract/parseText";
import { CLICKS, SAMPLES, TRANSACTIONS, userById, type Sample } from "./seed";

export function demoContext(userId: string, extraClicks: EvalContext["clicks"] = []): EvalContext {
  return {
    user: userById(userId),
    clicks: [...CLICKS, ...extraClicks],
    transactions: TRANSACTIONS,
    now: DEMO_NOW,
  };
}

export function claimFromOrder(
  userId: string,
  order: ClaimedOrder,
  source: Claim["source"],
  id = `clm_${Math.random().toString(36).slice(2, 8)}`,
): Claim {
  return { id, userId, submittedAt: DEMO_NOW, order, source };
}

export function sampleClaim(s: Sample, overrides: Partial<ClaimedOrder> = {}): Claim {
  const order = { ...parseOrderText(s.email), hasInvoice: s.hasInvoice, ...overrides };
  return claimFromOrder(s.userId, order, "seed", `clm_${s.id}`);
}

export const sampleById = (id: string) => SAMPLES.find((s) => s.id === id);
