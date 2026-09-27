import { describe, expect, it } from "vitest";
import { demoContext, sampleClaim } from "../data/context";
import { SAMPLES, TRANSACTIONS } from "../data/seed";
import { parseOrderText } from "../extract/parseText";
import { evaluateClaim } from "./evaluate";
import { explainTransaction } from "./explainStatus";
import { templateMessage } from "./messages";
import { DEMO_NOW } from "./time";

describe("demo samples", () => {
  for (const s of SAMPLES) {
    it(`${s.id} -> ${s.expect}`, () => {
      const claim = sampleClaim(s);
      const d = evaluateClaim(claim, demoContext(s.userId));
      expect(d.verdict).toBe(s.expect);
      // every decision renders in both languages with no unfilled slots
      for (const lang of ["en", "hi"] as const) {
        const m = templateMessage(d, lang);
        expect(m.body).not.toMatch(/undefined/);
        expect(m.title.length).toBeGreaterThan(0);
      }
    });
  }

  it("adding the invoice turns the phone claim into an auto-file", () => {
    const s = SAMPLES.find((x) => x.id === "s_amazon_phone")!;
    const d = evaluateClaim(sampleClaim(s, { hasInvoice: true }), demoContext(s.userId));
    expect(d.verdict).toBe("AUTO_FILE");
    expect(d.expectedCashback).toBe(504);
  });

  it("flipkart only credits the first item of a cart", () => {
    const s = SAMPLES.find((x) => x.id === "s_flipkart_cart")!;
    const d = evaluateClaim(sampleClaim(s), demoContext(s.userId));
    expect(d.checks.find((c) => c.id === "multi_item")!.status).toBe("warn");
    expect(d.expectedCashback).toBe(Math.round(2149 * 0.04)); // cooker = "home" rate
    expect(d.expectedCashback).toBeGreaterThan(0);
  });
});

describe("parser", () => {
  it("extracts the amazon sample", () => {
    const o = parseOrderText(SAMPLES[0].email);
    expect(o.retailerId).toBe("amazon");
    expect(o.orderId).toBe("408-7719342-5520311");
    expect(o.amount).toBe(3499);
    expect(o.items).toHaveLength(1);
    expect(o.items[0].category).toBe("electronics");
    expect(o.status).toBe("delivered");
  });

  it("classifies coupons against the store feed", () => {
    const o = parseOrderText(SAMPLES.find((s) => s.id === "s_myntra_coupon")!.email);
    expect(o.couponCode).toBe("DEALSHUB20");
    expect(o.couponSource).toBe("third_party");
  });
});

describe("status explainer", () => {
  it("explains every wallet entry and never leaves a cancellation without a reason", () => {
    for (const t of TRANSACTIONS) {
      const e = explainTransaction(t, DEMO_NOW);
      expect(e.why.length).toBeGreaterThan(20);
      expect(e.next.length).toBeGreaterThan(10);
    }
  });

  it("flags a moved date", () => {
    const e = explainTransaction(TRANSACTIONS.find((t) => t.id === "t1")!, DEMO_NOW);
    expect(e.dateMoved).toBe(true);
    expect(e.why).toMatch(/moved/);
  });
});

describe("messages", () => {
  it("tells the user which cart items won't earn cashback", () => {
    const s = SAMPLES.find((x) => x.id === "s_flipkart_cart")!;
    const d = evaluateClaim(sampleClaim(s), demoContext(s.userId));
    expect(templateMessage(d, "en").body).toMatch(/Cotton Bedsheet Double, Men's Running Shoes won't earn/);
    expect(templateMessage(d, "hi").body).toMatch(/sirf pehle item/);
  });
});
