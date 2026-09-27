import { SAMPLES } from "../data/seed";
import type { OrderStatus, RetailerId } from "../types";

// Gold labels for extraction. The first nine are the demo emails; the rest are
// messier real-world phrasings that a regex parser is expected to struggle with.

export interface ExtractionCase {
  id: string;
  text: string;
  gold: {
    retailerId: RetailerId;
    orderId: string;
    amount: number;
    itemCount: number;
    status: OrderStatus;
    couponCode: string | null;
  };
}

const sample = (id: string) => SAMPLES.find((s) => s.id === id)!.email;

export const EXTRACTION_CASES: ExtractionCase[] = [
  { id: "x_amazon_headphones", text: sample("s_amazon_headphones"), gold: { retailerId: "amazon", orderId: "408-7719342-5520311", amount: 3499, itemCount: 1, status: "delivered", couponCode: null } },
  { id: "x_flipkart_cart", text: sample("s_flipkart_cart"), gold: { retailerId: "flipkart", orderId: "OD331298745512364100", amount: 4847, itemCount: 3, status: "delivered", couponCode: null } },
  { id: "x_amazon_phone", text: sample("s_amazon_phone"), gold: { retailerId: "amazon", orderId: "171-2294410-9983126", amount: 62999, itemCount: 1, status: "delivered", couponCode: null } },
  { id: "x_tatacliq_tv", text: sample("s_tatacliq_tv"), gold: { retailerId: "tatacliq", orderId: "1407729981236", amount: 89990, itemCount: 1, status: "delivered", couponCode: null } },
  { id: "x_myntra_coupon", text: sample("s_myntra_coupon"), gold: { retailerId: "myntra", orderId: "1198827365-4412", amount: 1519, itemCount: 1, status: "delivered", couponCode: "DEALSHUB20" } },
  { id: "x_ajio", text: sample("s_ajio_yesterday"), gold: { retailerId: "ajio", orderId: "FN4471290318", amount: 2599, itemCount: 1, status: "shipped", couponCode: null } },
  { id: "x_flipkart_earbuds", text: sample("s_flipkart_old_click"), gold: { retailerId: "flipkart", orderId: "OD331377120093421500", amount: 1299, itemCount: 1, status: "delivered", couponCode: null } },
  { id: "x_nykaa", text: sample("s_nykaa_late"), gold: { retailerId: "nykaa", orderId: "NYK-88213377", amount: 1199, itemCount: 2, status: "delivered", couponCode: null } },
  { id: "x_myntra_coat", text: sample("s_ankit_new"), gold: { retailerId: "myntra", orderId: "1199002741-1180", amount: 5699, itemCount: 1, status: "delivered", couponCode: "MYNTRA300" } },
  {
    id: "x_messy_forwarded",
    text: `---------- Forwarded message ---------
From: Flipkart <no-reply@flipkart.com>
Subject: Your Flipkart order OD331500912276654300 has been delivered

Hi Neha, your item has been delivered!
Philips Hair Dryer HP8120 - Rs. 1,045
You paid Rs. 1,045 (incl. delivery)
Delivered on Tue, 22 Sep`,
    gold: { retailerId: "flipkart", orderId: "OD331500912276654300", amount: 1045, itemCount: 1, status: "delivered", couponCode: null },
  },
  {
    id: "x_messy_sms",
    text: `Amazon: Your order of "Prestige Induction Cooktop..." & 1 more item, Order# 402-5566123-7788990, total Rs 3,248 has been shipped. Track: amzn.in/d/xyz`,
    gold: { retailerId: "amazon", orderId: "402-5566123-7788990", amount: 3248, itemCount: 2, status: "shipped", couponCode: null },
  },
  {
    id: "x_messy_hinglish",
    text: `bhai ye mera myntra order hai, cashback nahi aaya
order no 1201873345-0091, 2 kurte liye the 1,299 + 1,499, SAVE200 coupon lagaya tha total 2,598 pay kiya. deliver ho gaya 20 sept ko`,
    gold: { retailerId: "myntra", orderId: "1201873345-0091", amount: 2598, itemCount: 2, status: "delivered", couponCode: "SAVE200" },
  },
  {
    id: "x_messy_cancelled",
    text: `AJIO | Order Cancelled
We're sorry, your order FN4499871203 has been cancelled as requested.
Puma Unisex Sneakers ₹3,299
Refund of ₹3,299 will be credited in 5-7 days.`,
    gold: { retailerId: "ajio", orderId: "FN4499871203", amount: 3299, itemCount: 1, status: "cancelled", couponCode: null },
  },
];
