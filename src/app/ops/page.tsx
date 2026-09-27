import { demoContext, sampleClaim } from "@/lib/data/context";
import { RETAILERS } from "@/lib/data/retailers";
import { SAMPLES, userById } from "@/lib/data/seed";
import { evaluateClaim } from "@/lib/engine/evaluate";
import { templateMessage } from "@/lib/engine/messages";
import { claimStream, mulberry32 } from "@/lib/sim/generate";
import { OpsConsole, type OpsRow } from "./OpsConsole";

export const metadata = { title: "Ops console — TrackBack" };

const NAMES = ["Aarav", "Diya", "Kabir", "Meera", "Rohan", "Isha", "Arjun", "Sneha", "Vivaan", "Pooja", "Karan", "Neha", "Aditya", "Riya", "Siddharth", "Tanvi", "Manish", "Anjali", "Yash", "Kavya"];
const CITIES = ["Delhi", "Pune", "Jaipur", "Kolkata", "Chennai", "Indore", "Lucknow", "Kochi", "Nagpur", "Patna"];

function buildQueue(): OpsRow[] {
  const rows: OpsRow[] = SAMPLES.map((s, i) => {
    const claim = sampleClaim(s);
    const d = evaluateClaim(claim, demoContext(s.userId));
    const u = userById(s.userId);
    return {
      id: claim.id,
      user: `${u.name} · ${u.city}`,
      store: RETAILERS[claim.order.retailerId!].name,
      orderId: claim.order.orderId ?? "—",
      amount: claim.order.amount ?? 0,
      minutesAgo: 3 + i * 7,
      decision: d,
      reply: templateMessage(d, "en"),
    };
  });
  const r = mulberry32(99);
  for (const s of claimStream(70, 23)) {
    const d = evaluateClaim(s.claim, s.ctx);
    const ret = s.claim.order.retailerId ? RETAILERS[s.claim.order.retailerId].name : "Unknown store";
    rows.push({
      id: s.claim.id,
      user: `${NAMES[Math.floor(r() * NAMES.length)]} ${String.fromCharCode(65 + Math.floor(r() * 26))}. · ${CITIES[Math.floor(r() * CITIES.length)]}`,
      store: ret,
      orderId: s.claim.order.orderId ?? "—",
      amount: s.claim.order.amount ?? 0,
      minutesAgo: Math.round(10 + r() * 600),
      decision: d,
      reply: templateMessage(d, "en"),
    });
  }
  return rows.sort((a, b) => a.minutesAgo - b.minutesAgo);
}

export default function OpsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10">
      <div className="kicker mb-2">Internal tool</div>
      <h1 className="display text-4xl md:text-5xl text-ink max-w-3xl">Support agents only see the claims that need judgment.</h1>
      <p className="mt-4 text-ink-2 max-w-3xl">
        Today every missing-cashback ticket is a manual email thread asking for screenshots. Here, the engine settles the
        clear cases and hands a person the rest with the evidence already assembled, a drafted reply, and one-click actions.
        Every override is logged, and the reason codes show which product fixes would stop claims being needed at all.
      </p>
      <OpsConsole rows={buildQueue()} />
    </div>
  );
}
