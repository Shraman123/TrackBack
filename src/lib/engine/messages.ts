import type { Decision, ReasonCode } from "../types";

// Deterministic user-facing copy for every decision. This is the fallback when the
// LLM is off, and the benchmark the LLM rewrite is checked against.
export type Lang = "en" | "hi";

type F = Record<string, string | number>;
type Tpl = (f: F) => { title: string; body: string };

const EN: Record<ReasonCode, Tpl> = {
  OK: (f) => ({
    title: "Claim filed with " + f.store,
    body: `We matched your visit (${f.clickGap} before the order) and sent ${f.store} a complete claim for order ${f.orderId}. Expected cashback: ${f.expectedCashback}. ${f.store} usually answers by ${f.networkAnswerBy}; if accepted, it confirms around ${f.expectedConfirmBy}. You don't need to send anything else.`,
  }),
  HIGH_VALUE: (f) => ({
    title: "Claim prepared, a teammate will file it",
    body: `Your claim for ${f.expectedCashback} on order ${f.orderId} checks out. Claims this size get a quick human check before we send them to ${f.store}, usually within 1 working day. Nothing more needed from you.`,
  }),
  RISK_SIGNAL: (f) => ({
    title: "Claim prepared, a teammate will review it",
    body: `Your claim for order ${f.orderId} passed our checks. A teammate will review it before we send it to ${f.store}, usually within 1 working day. We'll message you either way.`,
  }),
  TOO_EARLY: (f) => ({
    title: "Hold on — it may still track by itself",
    body: `${f.store} can take up to 3 days to report orders. Everything else checks out, so we'll re-check on ${f.recheckAt} and file the claim for you automatically if it still hasn't tracked. Expected cashback: ${f.expectedCashback}.`,
  }),
  MISSING_FIELDS: (f) => ({
    title: "We need one more detail",
    body: `To check this order we still need: ${f.missing}. The fastest way is to share the order confirmation screenshot or email.`,
  }),
  INVOICE_REQUIRED: (f) => ({
    title: "Add the invoice and we'll file it",
    body: `Everything else checks out for order ${f.orderId}. ${f.store} asks for the invoice on orders above ${f.invoiceThreshold}. Add it (PDF or screenshot from ${f.store}'s Orders page) and we'll file straight away. Expected cashback: ${f.expectedCashback}.`,
  }),
  DUPLICATE_TRACKED: (f) => ({
    title: "This order is already in your wallet",
    body: `Order ${f.orderId} tracked already (${f.trackedStatus}, ${f.trackedCashback}). Open it in your wallet to see why it's in that state and when it moves next.`,
  }),
  CLAIM_WINDOW_EXPIRED: (f) => ({
    title: "Too late to claim this one",
    body: `${f.store} accepts missing-cashback claims until ${f.claimDeadline} for an order placed on ${f.orderDate}. Next time, raise it within that window, or turn on reminders and we'll nudge you on day 4 if an order hasn't tracked.`,
  }),
  NO_CLICK: (f) => ({
    title: "We couldn't find your visit through us",
    body: `There's no record of you going to ${f.store} through us before this order. Stores only pay cashback when the visit starts from us. If you used a different phone or account, tell us and a teammate will look.`,
  }),
  CLICK_AFTER_ORDER: (f) => ({
    title: "The visit came after the order",
    body: `Your visit to ${f.store} through us was ${f.clickGap} after the order was placed, so ${f.store} can't link the two. For cashback, open the store from us first, then check out.`,
  }),
  CLICK_OUTSIDE_WINDOW: (f) => ({
    title: "The visit was too long before the order",
    body: `Your last visit through us was ${f.clickGap} before the order, but ${f.store} only credits orders placed within ${f.window} of the visit. For cashback, come through us again right before checkout.`,
  }),
  ORDER_CANCELLED: (f) => ({
    title: "This order was cancelled",
    body: `Order ${f.orderId} shows as cancelled, and cashback is only paid on completed orders. If it was delivered, send us the delivery confirmation.`,
  }),
  ORDER_RETURNED: (f) => ({
    title: "This order was returned",
    body: `Order ${f.orderId} shows as returned, and stores don't pay cashback on returns. If you kept the item, send us the delivery confirmation.`,
  }),
  EXCHANGE_VOIDS: (f) => ({
    title: `${f.store} treats exchanges as returns`,
    body: `Order ${f.orderId} was exchanged, and ${f.store} cancels cashback on exchanges. We know this rule is frustrating; it's set by ${f.store}, and we show it on the store page now.`,
  }),
  ALL_ITEMS_EXCLUDED: (f) => ({
    title: "These items don't earn cashback",
    body: `${f.store} doesn't pay cashback on: ${f.excludedItems}. We show excluded categories on the store page before you shop.`,
  }),
  THIRD_PARTY_COUPON: (f) => ({
    title: "An outside coupon cancelled the cashback",
    body: `Coupon ${f.coupon} isn't from ${f.store}, and ${f.store} cancels cashback when outside coupons are used. Use ${f.store}'s own coupons, or the ones in our app, to keep cashback.`,
  }),
};

const HI: Record<ReasonCode, Tpl> = {
  OK: (f) => ({
    title: `${f.store} ke paas claim file ho gaya`,
    body: `Aapki visit (order se ${f.clickGap} pehle) match ho gayi aur order ${f.orderId} ka poora claim ${f.store} ko bhej diya. Expected cashback: ${f.expectedCashback}. ${f.store} ka jawab ${f.networkAnswerBy} tak aata hai; accept hua to ${f.expectedConfirmBy} ke aas-paas confirm hoga. Aapko kuch aur bhejne ki zarurat nahi.`,
  }),
  HIGH_VALUE: (f) => ({
    title: "Claim ready hai, team member file karega",
    body: `Order ${f.orderId} par ${f.expectedCashback} ka claim sahi hai. Itne bade claim ko ${f.store} bhejne se pehle ek insaan check karta hai — aam taur par 1 working day. Aapse aur kuch nahi chahiye.`,
  }),
  RISK_SIGNAL: (f) => ({
    title: "Claim ready hai, team review karegi",
    body: `Order ${f.orderId} ka claim humare checks pass kar gaya. ${f.store} ko bhejne se pehle team member review karega, aam taur par 1 working day. Dono case mein aapko message milega.`,
  }),
  TOO_EARLY: (f) => ({
    title: "Thoda ruko — yeh khud track ho sakta hai",
    body: `${f.store} ko order report karne mein 3 din tak lag sakte hain. Baaki sab sahi hai, isliye hum ${f.recheckAt} ko dobara check karenge aur tab bhi track nahi hua to claim khud file kar denge. Expected cashback: ${f.expectedCashback}.`,
  }),
  MISSING_FIELDS: (f) => ({
    title: "Ek detail aur chahiye",
    body: `Is order ko check karne ke liye abhi chahiye: ${f.missing}. Sabse aasaan — order confirmation ka screenshot ya email share kar dijiye.`,
  }),
  INVOICE_REQUIRED: (f) => ({
    title: "Invoice add karo, hum file kar denge",
    body: `Order ${f.orderId} ke liye baaki sab sahi hai. ${f.invoiceThreshold} se upar ke orders par ${f.store} invoice maangta hai. ${f.store} ke Orders page se invoice (PDF ya screenshot) add kijiye, hum turant file kar denge. Expected cashback: ${f.expectedCashback}.`,
  }),
  DUPLICATE_TRACKED: (f) => ({
    title: "Yeh order pehle se wallet mein hai",
    body: `Order ${f.orderId} already track ho chuka hai (${f.trackedStatus}, ${f.trackedCashback}). Wallet mein kholkar dekhiye ki yeh is state mein kyun hai aur aage kab badhega.`,
  }),
  CLAIM_WINDOW_EXPIRED: (f) => ({
    title: "Is order ka claim time nikal gaya",
    body: `${f.orderDate} ke order ke liye ${f.store} missing-cashback claim ${f.claimDeadline} tak hi leta hai. Agli baar reminders on kar dijiye — order track na ho to hum din 4 par yaad dila denge.`,
  }),
  NO_CLICK: (f) => ({
    title: "Humein aapki visit nahi mili",
    body: `Is order se pehle aap humare through ${f.store} gaye, iska record nahi hai. Store cashback tabhi deta hai jab visit humare app se shuru ho. Agar doosra phone ya account use kiya tha to batayein, team member dekhega.`,
  }),
  CLICK_AFTER_ORDER: (f) => ({
    title: "Visit order ke baad hui",
    body: `Aapki visit order place hone ke ${f.clickGap} baad hui, isliye ${f.store} dono ko link nahi kar sakta. Cashback ke liye pehle humare app se store kholiye, phir checkout kijiye.`,
  }),
  CLICK_OUTSIDE_WINDOW: (f) => ({
    title: "Visit order se bahut pehle thi",
    body: `Aapki aakhri visit order se ${f.clickGap} pehle thi, lekin ${f.store} sirf ${f.window} ke andar ke orders credit karta hai. Checkout se theek pehle humare through dobara jaaiye.`,
  }),
  ORDER_CANCELLED: (f) => ({
    title: "Yeh order cancel hua tha",
    body: `Order ${f.orderId} cancelled dikh raha hai, aur cashback sirf complete orders par milta hai. Agar delivery hui thi to delivery confirmation bhejiye.`,
  }),
  ORDER_RETURNED: (f) => ({
    title: "Yeh order return hua tha",
    body: `Order ${f.orderId} returned dikh raha hai, aur return par store cashback nahi deta. Agar item aapke paas hai to delivery confirmation bhejiye.`,
  }),
  EXCHANGE_VOIDS: (f) => ({
    title: `${f.store} exchange ko return maanta hai`,
    body: `Order ${f.orderId} exchange hua tha, aur ${f.store} exchange par cashback cancel karta hai. Yeh rule ${f.store} ka hai; ab hum ise store page par pehle se dikhate hain.`,
  }),
  ALL_ITEMS_EXCLUDED: (f) => ({
    title: "In items par cashback nahi milta",
    body: `${f.store} in par cashback nahi deta: ${f.excludedItems}. Excluded categories hum shopping se pehle store page par dikhate hain.`,
  }),
  THIRD_PARTY_COUPON: (f) => ({
    title: "Bahar ke coupon se cashback cancel hua",
    body: `Coupon ${f.coupon} ${f.store} ka nahi hai, aur ${f.store} bahar ke coupon par cashback cancel kar deta hai. Cashback bachane ke liye ${f.store} ke apne ya humare app ke coupons use kijiye.`,
  }),
};

export function templateMessage(d: Decision, lang: Lang = "en") {
  const table = lang === "hi" ? HI : EN;
  return table[d.reason](d.facts);
}
