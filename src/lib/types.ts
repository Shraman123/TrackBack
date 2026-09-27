// Domain model for the cashback claim lifecycle.
// Click (user leaves via us) -> Order (placed at retailer) -> network reports it
// (tracked/pending) -> confirmed or cancelled. A "missing cashback" claim is the
// user saying "I bought this through you, but you never tracked it".

export type RetailerId =
  | "amazon"
  | "flipkart"
  | "myntra"
  | "ajio"
  | "nykaa"
  | "tatacliq"
  | "makemytrip";

export type CouponPolicy =
  | "any" // any coupon is fine
  | "retailer_only"; // coupons not issued by the retailer void cashback

export interface Retailer {
  id: RetailerId;
  name: string;
  /** Hours between click and order within which the network attributes the sale. */
  attributionWindowHours: number;
  /** A missing claim can't be raised before this (network reports can lag). */
  trackingLagHours: number;
  /** A missing claim must be raised within this many days of the order. */
  claimWindowDays: number;
  /** Days the network takes to answer a filed missing claim. */
  claimResponseDays: number;
  /** Retailer return window; cashback can't confirm before it closes. */
  returnWindowDays: number;
  /** Days after the return window before the network sends its final report. */
  validationLagDays: number;
  excludedCategories: string[];
  couponPolicy: CouponPolicy;
  /** If false, only the first item of a multi-item cart is attributed. */
  multiItemTracking: boolean;
  /** Does an exchange count as a return (cashback void)? */
  exchangeVoidsCashback: boolean;
  /** Cashback rate by category; "default" applies otherwise. Fractions of price. */
  rates: Record<string, number>;
  /** Hard cap on cashback per order, rupees (null = none). */
  capPerOrder: number | null;
  /** Share of well-formed missing claims the network historically accepts. */
  historicalClaimApproval: number;
}

export interface User {
  id: string;
  name: string;
  city: string;
  tenureDays: number;
  lifetimeClaims: number;
  approvedClaims: number;
  flagged: boolean;
}

export interface Click {
  id: string;
  userId: string;
  retailerId: RetailerId;
  at: string; // ISO
  surface: "app" | "web";
}

export interface OrderItem {
  name: string;
  category: string;
  price: number;
}

export type OrderStatus =
  | "placed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned"
  | "exchanged";

/** What the user tells us about an order (typed, pasted, or extracted from a screenshot). */
export interface ClaimedOrder {
  retailerId: RetailerId | null;
  orderId: string | null;
  placedAt: string | null; // ISO
  amount: number | null;
  items: OrderItem[];
  status: OrderStatus;
  couponCode: string | null;
  couponSource: "retailer" | "third_party" | null;
  hasInvoice: boolean;
}

export interface Claim {
  id: string;
  userId: string;
  submittedAt: string;
  order: ClaimedOrder;
  /** How the order details were captured. */
  source: "form" | "email_text" | "screenshot" | "seed";
}

/** A cashback the network already reported (shows up in the user's wallet). */
export type TxnStatus = "pending" | "confirmed" | "cancelled" | "paid";

export type CancelCode =
  | "RETURNED"
  | "ORDER_CANCELLED"
  | "OTHER_AFFILIATE"
  | "CART_BEFORE_CLICK"
  | "EXCLUDED_CATEGORY"
  | "COUPON_VOID"
  | "EXCHANGED"
  | "NETWORK_REJECTED_NO_REASON";

export interface Transaction {
  id: string;
  userId: string;
  retailerId: RetailerId;
  orderId: string;
  orderAmount: number;
  cashback: number;
  placedAt: string;
  status: TxnStatus;
  /** The date shown to the user when the cashback was first tracked. */
  originalConfirmBy: string;
  /** Current expected date (may have moved). */
  currentConfirmBy: string;
  cancelCode?: CancelCode;
  /** Last network report received for this order. */
  lastNetworkReportAt: string | null;
}

// ---- engine output --------------------------------------------------------

export type Verdict =
  | "AUTO_FILE" // evidence is strong: file with the network now, pre-filled
  | "WAIT" // too early; tracking may still land, we'll re-check automatically
  | "NEEDS_INFO" // one specific thing is missing
  | "NOT_ELIGIBLE" // a rule says no; tell the user which rule, plainly
  | "HUMAN_REVIEW" // money or risk is high enough that a person decides
  | "ALREADY_TRACKED"; // it's in the wallet; show its status instead

export type CheckStatus = "pass" | "fail" | "warn" | "skip";

export interface Check {
  id:
    | "fields"
    | "duplicate"
    | "tracking_lag"
    | "claim_window"
    | "click_match"
    | "order_status"
    | "category"
    | "coupon"
    | "multi_item"
    | "evidence"
    | "risk";
  label: string;
  status: CheckStatus;
  detail: string;
}

export type ReasonCode =
  | "MISSING_FIELDS"
  | "DUPLICATE_TRACKED"
  | "TOO_EARLY"
  | "CLAIM_WINDOW_EXPIRED"
  | "NO_CLICK"
  | "CLICK_AFTER_ORDER"
  | "CLICK_OUTSIDE_WINDOW"
  | "ORDER_CANCELLED"
  | "ORDER_RETURNED"
  | "EXCHANGE_VOIDS"
  | "ALL_ITEMS_EXCLUDED"
  | "THIRD_PARTY_COUPON"
  | "INVOICE_REQUIRED"
  | "HIGH_VALUE"
  | "RISK_SIGNAL"
  | "OK";

export interface Decision {
  claimId: string;
  verdict: Verdict;
  reason: ReasonCode;
  checks: Check[];
  /** Cashback we expect if the claim goes through, after exclusions and caps. */
  expectedCashback: number;
  /** Probability the network accepts the filed claim (0-1), when filed. */
  approvalOdds: number | null;
  /** Key dates, ISO. */
  dates: {
    decidedAt: string;
    recheckAt?: string;
    networkAnswerBy?: string;
    expectedConfirmBy?: string;
    claimDeadline?: string;
  };
  /** Structured facts the explanation may mention (and nothing else). */
  facts: Record<string, string | number>;
  /** Pre-filled payload that would be sent to the affiliate network. */
  networkPayload?: Record<string, string | number>;
  matchedClickId?: string;
  matchedTxnId?: string;
}
