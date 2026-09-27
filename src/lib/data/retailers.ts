import type { Retailer, RetailerId } from "../types";

// Illustrative rules. The shape (attribution window, return window, validation lag,
// excluded categories, coupon policy) mirrors how Indian affiliate programs work;
// the specific numbers are assumptions for the prototype, not any retailer's contract.
export const RETAILERS: Record<RetailerId, Retailer> = {
  amazon: {
    id: "amazon",
    name: "Amazon",
    attributionWindowHours: 24,
    trackingLagHours: 72,
    claimWindowDays: 10,
    claimResponseDays: 10,
    returnWindowDays: 10,
    validationLagDays: 50,
    excludedCategories: ["gift_card", "gold_coin", "grocery_fresh"],
    couponPolicy: "any",
    multiItemTracking: true,
    exchangeVoidsCashback: true,
    rates: { default: 0.03, electronics: 0.012, mobile: 0.008, fashion: 0.06, beauty: 0.05 },
    capPerOrder: 1500,
    historicalClaimApproval: 0.62,
  },
  flipkart: {
    id: "flipkart",
    name: "Flipkart",
    attributionWindowHours: 24,
    trackingLagHours: 72,
    claimWindowDays: 10,
    claimResponseDays: 7,
    returnWindowDays: 10,
    validationLagDays: 40,
    excludedCategories: ["gift_card", "gold_coin"],
    couponPolicy: "any",
    multiItemTracking: false,
    exchangeVoidsCashback: true,
    rates: { default: 0.035, electronics: 0.015, mobile: 0.01, fashion: 0.07, home: 0.04 },
    capPerOrder: 1200,
    historicalClaimApproval: 0.58,
  },
  myntra: {
    id: "myntra",
    name: "Myntra",
    attributionWindowHours: 48,
    trackingLagHours: 48,
    claimWindowDays: 15,
    claimResponseDays: 7,
    returnWindowDays: 14,
    validationLagDays: 30,
    excludedCategories: ["gift_card"],
    couponPolicy: "retailer_only",
    multiItemTracking: true,
    exchangeVoidsCashback: false,
    rates: { default: 0.075, fashion: 0.075, beauty: 0.06 },
    capPerOrder: null,
    historicalClaimApproval: 0.71,
  },
  ajio: {
    id: "ajio",
    name: "AJIO",
    attributionWindowHours: 24,
    trackingLagHours: 48,
    claimWindowDays: 10,
    claimResponseDays: 10,
    returnWindowDays: 15,
    validationLagDays: 35,
    excludedCategories: ["gift_card", "gold_coin"],
    couponPolicy: "retailer_only",
    multiItemTracking: true,
    exchangeVoidsCashback: false,
    rates: { default: 0.08, fashion: 0.08 },
    capPerOrder: null,
    historicalClaimApproval: 0.66,
  },
  nykaa: {
    id: "nykaa",
    name: "Nykaa",
    attributionWindowHours: 24,
    trackingLagHours: 48,
    claimWindowDays: 10,
    claimResponseDays: 7,
    returnWindowDays: 15,
    validationLagDays: 30,
    excludedCategories: ["gift_card"],
    couponPolicy: "retailer_only",
    multiItemTracking: true,
    exchangeVoidsCashback: false,
    rates: { default: 0.06, beauty: 0.06 },
    capPerOrder: null,
    historicalClaimApproval: 0.74,
  },
  tatacliq: {
    id: "tatacliq",
    name: "Tata CLiQ",
    attributionWindowHours: 24,
    trackingLagHours: 72,
    claimWindowDays: 10,
    claimResponseDays: 12,
    returnWindowDays: 15,
    validationLagDays: 45,
    excludedCategories: ["gift_card", "gold_coin"],
    couponPolicy: "any",
    multiItemTracking: true,
    exchangeVoidsCashback: true,
    rates: { default: 0.04, electronics: 0.02, fashion: 0.07 },
    capPerOrder: 2000,
    historicalClaimApproval: 0.55,
  },
  makemytrip: {
    id: "makemytrip",
    name: "MakeMyTrip",
    attributionWindowHours: 24,
    trackingLagHours: 72,
    claimWindowDays: 15,
    claimResponseDays: 14,
    returnWindowDays: 0,
    validationLagDays: 30, // counted from check-out/travel date in reality; simplified here
    excludedCategories: ["flight_fare"],
    couponPolicy: "retailer_only",
    multiItemTracking: false,
    exchangeVoidsCashback: true,
    rates: { default: 0.05, hotel: 0.05 },
    capPerOrder: 2500,
    historicalClaimApproval: 0.5,
  },
};

export const RETAILER_LIST = Object.values(RETAILERS);

export function retailerFromName(name: string | null | undefined): Retailer | null {
  if (!name) return null;
  const n = name.toLowerCase().replace(/[^a-z]/g, "");
  if (n.includes("amazon")) return RETAILERS.amazon;
  if (n.includes("flipkart")) return RETAILERS.flipkart;
  if (n.includes("myntra")) return RETAILERS.myntra;
  if (n.includes("ajio")) return RETAILERS.ajio;
  if (n.includes("nykaa")) return RETAILERS.nykaa;
  if (n.includes("tatacliq") || n.includes("cliq")) return RETAILERS.tatacliq;
  if (n.includes("makemytrip") || n.includes("mmt")) return RETAILERS.makemytrip;
  return null;
}

export const CATEGORY_LABELS: Record<string, string> = {
  default: "General",
  electronics: "Electronics",
  mobile: "Mobiles",
  fashion: "Fashion",
  beauty: "Beauty",
  home: "Home",
  hotel: "Hotels",
  gift_card: "Gift cards",
  gold_coin: "Gold & coins",
  grocery_fresh: "Fresh grocery",
  flight_fare: "Flights",
};
