import type { Click, RetailerId, Transaction, User, Verdict } from "../types";
import { addDays, addHours, DEMO_NOW } from "../engine/time";

const now = DEMO_NOW;
const ago = (h: number) => addHours(now, -h);
const daysAgo = (d: number) => addDays(now, -d);

export const USERS: User[] = [
  { id: "u_priya", name: "Priya S.", city: "Gurugram", tenureDays: 910, lifetimeClaims: 6, approvedClaims: 5, flagged: false },
  { id: "u_rahul", name: "Rahul M.", city: "Lucknow", tenureDays: 420, lifetimeClaims: 3, approvedClaims: 2, flagged: false },
  { id: "u_ankit", name: "Ankit (new)", city: "Indore", tenureDays: 5, lifetimeClaims: 0, approvedClaims: 0, flagged: false },
  { id: "u_vikram", name: "Vikram K.", city: "Surat", tenureDays: 300, lifetimeClaims: 21, approvedClaims: 4, flagged: false },
];

export const userById = (id: string) => USERS.find((u) => u.id === id)!;

/** Store-issued coupon codes (in reality, from each store's coupon feed). */
export const STORE_COUPONS: Partial<Record<RetailerId, string[]>> = {
  myntra: ["MYNTRA300", "EORS200", "FIRSTBUY"],
  ajio: ["AJIOMANIA", "EXTRA15"],
  nykaa: ["NYKAA150", "GLOW10"],
  makemytrip: ["MMTSTAY", "MMTSUPER"],
  amazon: ["AMZSAVE50"],
  flipkart: ["FKBIGSALE"],
  tatacliq: ["CLIQ500"],
};

/**
 * Sample orders for the claim demo. Each is an order-confirmation email as a user
 * would paste it, the visit trail that sits behind it, and what the engine should say.
 * `review` is the Play Store complaint the scenario answers (paraphrased).
 */
export interface Sample {
  id: string;
  userId: string;
  title: string;
  expect: Verdict;
  review: string;
  email: string;
  hasInvoice: boolean;
  clicks: Omit<Click, "userId">[];
}

const d = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export const SAMPLES: Sample[] = [
  {
    id: "s_amazon_headphones",
    userId: "u_priya",
    title: "Amazon order never tracked",
    expect: "AUTO_FILE",
    review: "Every time I shop from Amazon it doesn't track automatically, I have to raise a ticket and it takes 8–10 days.",
    hasInvoice: false,
    clicks: [{ id: "clk_a1", retailerId: "amazon", at: ago(5 * 24 + 0.4), surface: "app" }],
    email: `Amazon.in — Order Confirmation
Hello Priya, thank you for your order.
Order #408-7719342-5520311
Placed on ${d(ago(5 * 24))}
Sony WH-CH720N Wireless Headphones   ₹3,499
Order Total: ₹3,499
Status: Delivered`,
  },
  {
    id: "s_flipkart_cart",
    userId: "u_priya",
    title: "Flipkart cart, 3 items",
    expect: "AUTO_FILE",
    review: "Whenever I order multiple products in one go it never tracks the items. Only one item at a time.",
    hasInvoice: false,
    clicks: [{ id: "clk_f1", retailerId: "flipkart", at: ago(4 * 24 + 2), surface: "app" }],
    email: `Flipkart: Your order has been placed
Order ID: OD331298745512364100
Ordered on ${d(ago(4 * 24))}
1. Prestige Pressure Cooker 5L  ₹2,149
2. Cotton Bedsheet Double  ₹899
3. Men's Running Shoes  ₹1,799
Total: ₹4,847
Status: Delivered`,
  },
  {
    id: "s_amazon_phone",
    userId: "u_priya",
    title: "₹63k phone, no invoice yet",
    expect: "NEEDS_INFO",
    review: "Even after giving invoice and all details it takes 8–10 days. Till then the return window is over.",
    hasInvoice: false,
    clicks: [{ id: "clk_a2", retailerId: "amazon", at: ago(6 * 24 + 0.2), surface: "app" }],
    email: `Amazon.in — Order Confirmation
Order #171-2294410-9983126
Placed on ${d(ago(6 * 24))}
Samsung Galaxy S26 5G (256 GB) Mobile Phone   ₹62,999
Order Total: ₹62,999
Status: Delivered`,
  },
  {
    id: "s_tatacliq_tv",
    userId: "u_rahul",
    title: "₹90k TV — high value",
    expect: "HUMAN_REVIEW",
    review: "Whenever the cashback is higher they delay it and afterwards reject it without any specific reason.",
    hasInvoice: true,
    clicks: [{ id: "clk_t1", retailerId: "tatacliq", at: ago(7 * 24 + 0.5), surface: "web" }],
    email: `Tata CLiQ Order Confirmed
Order No: 1407729981236
Date: ${d(ago(7 * 24))}
LG 65" OLED evo Smart TV  ₹89,990
Grand Total: ₹89,990
Status: Delivered`,
  },
  {
    id: "s_myntra_coupon",
    userId: "u_priya",
    title: "Myntra + outside coupon",
    expect: "NOT_ELIGIBLE",
    review: "My cashback was cancelled with excuses. No clear explanation.",
    hasInvoice: false,
    clicks: [{ id: "clk_m1", retailerId: "myntra", at: ago(6 * 24 + 1), surface: "app" }],
    email: `Myntra — Order Placed
Order No. 1198827365-4412
Placed on ${d(ago(6 * 24))}
Women Printed Kurta Set  ₹1,899
Coupon applied: DEALSHUB20
Total Paid: ₹1,519
Status: Delivered`,
  },
  {
    id: "s_ajio_yesterday",
    userId: "u_rahul",
    title: "AJIO order from yesterday",
    expect: "WAIT",
    review: "It says the tracking time is 72 hours, it just doesn't track things correctly.",
    hasInvoice: false,
    clicks: [{ id: "clk_j1", retailerId: "ajio", at: ago(26.5), surface: "app" }],
    email: `AJIO: Thank you for shopping!
Order ID FN4471290318
Order date: ${d(ago(26))}
Levi's Men Slim Fit Jeans  ₹2,599
Order Total ₹2,599
Status: Shipped`,
  },
  {
    id: "s_flipkart_old_click",
    userId: "u_rahul",
    title: "Clicked yesterday, bought today",
    expect: "NOT_ELIGIBLE",
    review: "I placed the order properly through the app on Flipkart but it was not tracked and my request was rejected.",
    hasInvoice: false,
    clicks: [{ id: "clk_f2", retailerId: "flipkart", at: ago(5 * 24 + 31), surface: "app" }],
    email: `Flipkart: Your order has been placed
Order ID: OD331377120093421500
Ordered on ${d(ago(5 * 24))}
boAt Airdopes 141 Earbuds  ₹1,299
Total: ₹1,299
Status: Delivered`,
  },
  {
    id: "s_nykaa_late",
    userId: "u_priya",
    title: "Nykaa order, claimed late",
    expect: "NOT_ELIGIBLE",
    review: "By the time you remember, you lose track of which order didn't get cashback.",
    hasInvoice: false,
    clicks: [{ id: "clk_n1", retailerId: "nykaa", at: ago(16 * 24 + 0.3), surface: "app" }],
    email: `Nykaa — Order Confirmed
Order ID: NYK-88213377
Placed on ${d(ago(16 * 24))}
Maybelline Fit Me Foundation  ₹649
Lakme 9to5 Lipstick  ₹550
Order Total: ₹1,199
Status: Delivered`,
  },
  {
    id: "s_ankit_new",
    userId: "u_ankit",
    title: "New account, ₹6k Myntra",
    expect: "HUMAN_REVIEW",
    review: "(Ops side) New accounts making large first claims are the main fraud pattern.",
    hasInvoice: true,
    clicks: [{ id: "clk_m2", retailerId: "myntra", at: ago(4 * 24 + 0.3), surface: "app" }],
    email: `Myntra — Order Placed
Order No. 1199002741-1180
Placed on ${d(ago(4 * 24))}
Men Wool Blend Overcoat  ₹5,999
Coupon applied: MYNTRA300
Total Paid: ₹5,699
Status: Delivered`,
  },
];

// ---- clicks ---------------------------------------------------------------

export const CLICKS: Click[] = [
  ...SAMPLES.flatMap((s) => s.clicks.map((c) => ({ ...c, userId: s.userId }))),
  // Noise: visits that shouldn't match anything.
  { id: "clk_x1", userId: "u_priya", retailerId: "ajio", at: ago(40 * 24), surface: "web" },
  { id: "clk_x2", userId: "u_priya", retailerId: "amazon", at: ago(30 * 24), surface: "app" },
  { id: "clk_x3", userId: "u_rahul", retailerId: "myntra", at: ago(3 * 24), surface: "app" },
];

// ---- wallet (Priya) ----------------------------------------------------------

export const TRANSACTIONS: Transaction[] = [
  {
    id: "t1", userId: "u_priya", retailerId: "amazon", orderId: "405-1180032-7712004",
    orderAmount: 42990, cashback: 161, placedAt: daysAgo(74), status: "pending",
    originalConfirmBy: daysAgo(14), currentConfirmBy: addDays(now, 10),
    lastNetworkReportAt: daysAgo(31),
  },
  {
    id: "t2", userId: "u_priya", retailerId: "myntra", orderId: "1187723311-2231",
    orderAmount: 2499, cashback: 187, placedAt: daysAgo(6), status: "pending",
    originalConfirmBy: addDays(daysAgo(6), 44), currentConfirmBy: addDays(daysAgo(6), 44),
    lastNetworkReportAt: daysAgo(5),
  },
  {
    id: "t3", userId: "u_priya", retailerId: "flipkart", orderId: "OD329981276655120000",
    orderAmount: 7999, cashback: 280, placedAt: daysAgo(58), status: "pending",
    originalConfirmBy: daysAgo(8), currentConfirmBy: daysAgo(8),
    lastNetworkReportAt: daysAgo(45),
  },
  {
    id: "t4", userId: "u_priya", retailerId: "ajio", orderId: "FN4410098812",
    orderAmount: 3299, cashback: 264, placedAt: daysAgo(48), status: "cancelled",
    originalConfirmBy: daysAgo(0), currentConfirmBy: daysAgo(3), cancelCode: "OTHER_AFFILIATE",
    lastNetworkReportAt: daysAgo(3),
  },
  {
    id: "t5", userId: "u_priya", retailerId: "tatacliq", orderId: "1406612200917",
    orderAmount: 18490, cashback: 740, placedAt: daysAgo(70), status: "cancelled",
    originalConfirmBy: daysAgo(10), currentConfirmBy: daysAgo(2), cancelCode: "NETWORK_REJECTED_NO_REASON",
    lastNetworkReportAt: daysAgo(2),
  },
  {
    id: "t6", userId: "u_priya", retailerId: "amazon", orderId: "403-9981127-6620045",
    orderAmount: 1299, cashback: 39, placedAt: daysAgo(90), status: "confirmed",
    originalConfirmBy: daysAgo(30), currentConfirmBy: daysAgo(30),
    lastNetworkReportAt: daysAgo(30),
  },
  {
    id: "t7", userId: "u_priya", retailerId: "flipkart", orderId: "OD328812200091123000",
    orderAmount: 2999, cashback: 105, placedAt: daysAgo(60), status: "cancelled",
    originalConfirmBy: daysAgo(10), currentConfirmBy: daysAgo(12), cancelCode: "EXCHANGED",
    lastNetworkReportAt: daysAgo(12),
  },
  {
    id: "t8", userId: "u_priya", retailerId: "nykaa", orderId: "NYK-87120045",
    orderAmount: 1450, cashback: 87, placedAt: daysAgo(120), status: "paid",
    originalConfirmBy: daysAgo(75), currentConfirmBy: daysAgo(75),
    lastNetworkReportAt: daysAgo(75),
  },
];
