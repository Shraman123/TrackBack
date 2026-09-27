import Link from "next/link";
import results from "@/lib/sim/evalResults.json";
import themes from "../../research/theme_summary.json";

const pct = (x: number) => `${Math.round(x * 100)}%`;

const SURFACES = [
  {
    href: "/claim",
    kicker: "User · claim copilot",
    title: "“It didn’t track” → answered in seconds",
    body: "Share a screenshot, email or SMS. Claude reads it, the rules engine checks it against the visit log, and the user gets: filed for you, wait (we’ll re-check), add one thing, or no, with the exact rule.",
  },
  {
    href: "/wallet",
    kicker: "User · wallet explainer",
    title: "Pending and cancelled, explained",
    body: "Every rupee shows which step it’s at, what the store is waiting for, and what happens next. Moved dates come with a reason. Cancellations come with one plain sentence and an appeal if one can work.",
  },
  {
    href: "/ops",
    kicker: "Internal · ops console",
    title: "Agents only see what needs judgment",
    body: "High-value and risky claims arrive with evidence and a drafted reply. Overrides are logged to tune rules. Reason codes roll up into the product fixes that would stop claims happening.",
  },
  {
    href: "/impact",
    kicker: "Proof · impact & eval",
    title: "Measured, not asserted",
    body: "Review analysis, a 1,000-claim simulation, an impact model you can edit, a 400-scenario test suite with zero false auto-files, and parser vs Claude extraction scores.",
  },
];

const BUILD = [
  ["Problem", "Scraped 6,000 Play Store reviews, coded 633 complaints into themes (Python, reproducible)."],
  ["PRD", "Root causes, RICE prioritisation, decision spec, metrics, experiment and a 30-day validation plan."],
  ["Engine", "Deterministic rules engine + status explainer in TypeScript, unit-tested boundary by boundary."],
  ["AI layer", "Claude structured extraction for screenshots/Hinglish; guarded rewrite that can't invent numbers."],
  ["Product", "Next.js app: claim flow, wallet, ops console, impact page. Fallbacks when the API is off."],
  ["Eval", "Planted-scenario suite, edge cases, extraction scoring, impact stream: one command, same numbers every run."],
];

export default function Home() {
  const lifecycle = themes.any_claim_lifecycle / themes.negative_n;
  const auto = (results.impact.n - results.impact.distribution.HUMAN_REVIEW) / results.impact.n;
  return (
    <div>
      {/* hero */}
      <section className="mx-auto max-w-6xl px-4 pt-14 md:pt-20 pb-12 grid lg:grid-cols-[1.4fr_1fr] gap-10 items-end">
        <div>
          <div className="kicker mb-4">Product case study · AI-first PM · built end to end</div>
          <h1 className="display text-5xl md:text-7xl leading-[1.02] text-ink">
            Missing cashback isn&rsquo;t a tracking problem. <span className="text-brand">It&rsquo;s a trust problem.</span>
          </h1>
          <p className="mt-6 text-lg text-ink-2 max-w-2xl">
            Over half of CashKaro&rsquo;s negative reviews trace back to one loop: the order doesn&rsquo;t track, the user raises a ticket, waits
            8–10 days, and often gets a cancellation with no reason. TrackBack is my PRD and working MVP for closing that loop.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/claim" className="rounded-full bg-ink text-paper px-5 py-2.5 text-sm font-medium">Try the claim demo →</Link>
            <Link href="/prd" className="rounded-full border border-line bg-card px-5 py-2.5 text-sm font-medium text-ink">Read the PRD</Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <HeroStat value={themes.total_reviews.toLocaleString("en-IN")} label="Play Store reviews analysed" />
          <HeroStat value={pct(lifecycle)} label="of negative reviews are the claim lifecycle" accent />
          <HeroStat value="8–10 days" label="wait users describe for a missing-cashback ticket" />
          <HeroStat value={pct(auto)} label="of simulated claims settled in seconds, no agent" accent />
        </div>
      </section>

      {/* insight */}
      <section className="border-y border-line bg-card">
        <div className="mx-auto max-w-6xl px-4 py-12 grid md:grid-cols-3 gap-8">
          <div>
            <div className="kicker mb-2">The insight</div>
            <p className="display text-3xl text-ink leading-tight">Users experience eight different failures as one: &ldquo;they didn&rsquo;t pay me.&rdquo;</p>
          </div>
          <p className="text-ink-2 md:col-span-2 leading-relaxed">
            Click windows, app-to-app handoffs, last-click attribution to coupon sites, items already in the cart, outside coupons, one-item-per-cart
            stores, validation lags, reason-less rejections. Most &ldquo;missing&rdquo; cashback is the rules working as designed. But the product never says
            <em> which</em> rule, so every case becomes a ticket and a suspicion. The fix is to decide instantly where the rules already decide,
            explain everything else, and give a person only the cases that need judgment.
          </p>
        </div>
      </section>

      {/* surfaces */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="kicker mb-2">What I built</div>
        <h2 className="display text-4xl text-ink mb-8">Three surfaces, one engine</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {SURFACES.map((s) => (
            <Link key={s.href} href={s.href} className="card p-6 hover:border-ink-2 transition group">
              <div className="kicker mb-2">{s.kicker}</div>
              <h3 className="text-xl font-semibold text-ink group-hover:text-brand transition">{s.title}</h3>
              <p className="text-sm text-ink-2 mt-2 leading-relaxed">{s.body}</p>
              <div className="text-sm text-brand mt-4">Open →</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ai boundary */}
      <section className="mx-auto max-w-6xl px-4 pb-14">
        <div className="card p-6 md:p-8">
          <div className="kicker mb-2">Judgment about AI</div>
          <h2 className="display text-3xl md:text-4xl text-ink mb-6">AI reads. Rules decide. AI words, inside a guardrail.</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              ["Claude reads", "Screenshots, forwarded emails, SMS and Hinglish chat become structured order fields. Every field is sanity-checked and confirmed by the user.", "ai"],
              ["Rules decide", "Eligibility and cashback amount are deterministic: auditable, testable, explainable to a store and to a regulator. No model decides money.", "brand"],
              ["Claude words", "Messages can be rewritten warmly in English or Hinglish. A guardrail rejects any rewrite that adds a number, date or amount the engine didn't produce.", "ai"],
            ].map(([t, b, tone], i) => (
              <div key={t} className={`rounded-xl p-5 ${tone === "ai" ? "bg-ai-soft" : "bg-brand-soft"}`}>
                <div className={`text-xs font-mono ${tone === "ai" ? "text-ai" : "text-brand-ink"}`}>0{i + 1}</div>
                <div className="text-lg font-semibold text-ink mt-1">{t}</div>
                <p className="text-sm text-ink-2 mt-2 leading-relaxed">{b}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-ink-2 mt-6">
            Why this split: an LLM is far better than regex at messy input (the rule parser breaks on Hinglish and SMS), but a wrong
            cashback decision costs money and trust, and has to be explainable to the store&rsquo;s affiliate team. When the API is down,
            the parser takes over and the product still works.
          </p>
        </div>
      </section>

      {/* build */}
      <section className="mx-auto max-w-6xl px-4 pb-14 grid lg:grid-cols-[1fr_1.3fr] gap-10">
        <div>
          <div className="kicker mb-2">How I built it</div>
          <h2 className="display text-4xl text-ink">PRD in the morning, prototype by lunch, MVP by evening.</h2>
          <p className="text-ink-2 mt-4 leading-relaxed">
            Built with Claude Code as the co-builder: I set the problem, the principles and the decision spec; I reviewed and tested
            what it produced. Where it was wrong (a regex that matched &ldquo;Order Confirmation&rdquo; as an order ID, a test that
            assumed the wrong cashback rate), review and the tests caught it before it shipped.
          </p>
          <p className="text-sm text-muted mt-4">Next.js · TypeScript · Tailwind · Claude API (structured outputs, vision) · Vitest · Python for research</p>
        </div>
        <ol className="space-y-3">
          {BUILD.map(([k, v], i) => (
            <li key={k} className="card p-4 flex gap-4">
              <span className="text-xs font-mono text-muted pt-0.5">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <div className="font-semibold text-ink">{k}</div>
                <div className="text-sm text-ink-2">{v}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* next */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="rounded-2xl bg-ink text-paper p-8 md:p-10 grid md:grid-cols-[1.2fr_1fr] gap-8 items-center">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest opacity-60 mb-2">If I joined</div>
            <h2 className="display text-3xl md:text-4xl">First 30 days: backtest, shadow, ship the explainer.</h2>
            <p className="opacity-75 mt-3 text-sm leading-relaxed">
              Week 1: run the engine on 3 months of real tickets and network outcomes, and talk to 10 users and 5 agents. Weeks 2–3: shadow mode
              next to agents. Week 4: wallet explainer + auto re-check to 10%. Then the auto-file pilot on Amazon, gated on the rejection-rate guardrail.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/prd" className="rounded-full bg-paper text-ink px-5 py-3 text-sm font-medium text-center">Read the full PRD</Link>
            <Link href="/impact" className="rounded-full border border-paper/30 px-5 py-3 text-sm font-medium text-center">See the evidence & eval</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function HeroStat({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 border ${accent ? "bg-brand-soft border-transparent" : "bg-card border-line"}`}>
      <div className={`display text-4xl ${accent ? "text-brand-ink" : "text-ink"}`}>{value}</div>
      <div className="text-xs text-ink-2 mt-1 leading-snug">{label}</div>
    </div>
  );
}
