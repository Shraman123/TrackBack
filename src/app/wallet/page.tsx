import { RETAILERS } from "@/lib/data/retailers";
import { TRANSACTIONS, userById } from "@/lib/data/seed";
import { explainTransaction } from "@/lib/engine/explainStatus";
import { DEMO_NOW } from "@/lib/engine/time";
import { WalletView } from "./WalletView";

export const metadata = { title: "Wallet — TrackBack" };

export default function WalletPage() {
  const user = userById("u_priya");
  const rows = TRANSACTIONS.filter((t) => t.userId === user.id).map((t) => ({
    t,
    store: RETAILERS[t.retailerId].name,
    ex: explainTransaction(t, DEMO_NOW),
  }));
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10">
      <div className="kicker mb-2">Wallet explainer</div>
      <h1 className="display text-4xl md:text-5xl text-ink max-w-3xl">Every pending or cancelled rupee gets a reason and a date.</h1>
      <p className="mt-4 text-ink-2 max-w-3xl">
        21% of negative reviews are about cashback stuck in &ldquo;pending&rdquo; or dates that keep moving; 24% are cancellations
        that arrive with no reason. The fix isn&rsquo;t faster stores, it&rsquo;s telling people what&rsquo;s happening:
        which step the order is at, what the store is waiting for, and what they can do.
      </p>
      <WalletView rows={rows} userName={user.name} />
    </div>
  );
}
