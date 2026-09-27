import { Bars, Stat } from "@/components/ui";
import results from "@/lib/sim/evalResults.json";
import themes from "../../../research/theme_summary.json";
import { ImpactCalc } from "./ImpactCalc";

export const metadata = { title: "Impact & eval — TrackBack" };

const THEME_LABEL: Record<string, string> = {
  cancelled_rejected: "Cancelled / rejected",
  stuck_pending: "Stuck pending / date moved",
  not_received: "Never received",
  no_explanation: "No reason / support silent",
  not_tracked: "Didn't track",
  eligibility_tnc: "Surprise T&C / not eligible",
  amount_mismatch: "Less than promised",
  app_bug: "App bugs",
  withdrawal_payout: "Withdrawal issues",
  account_blocked: "Account blocked",
  fin_products: "Credit cards / loans",
};
const LIFECYCLE = new Set(["cancelled_rejected", "stuck_pending", "not_received", "not_tracked"]);
const VERDICT_LABEL: Record<string, string> = {
  AUTO_FILE: "Auto-filed",
  NOT_ELIGIBLE: "Not eligible (reason shown)",
  WAIT: "Wait + auto re-check",
  NEEDS_INFO: "Needs one detail",
  HUMAN_REVIEW: "Human review",
  ALREADY_TRACKED: "Already tracked",
};

const pct = (x: number, d = 0) => `${(x * 100).toFixed(d)}%`;

export default function ImpactPage() {
  const t = themes;
  const lifecycleShare = t.any_claim_lifecycle / t.negative_n;
  const imp = results.impact;
  const autoShare = (imp.n - imp.distribution.HUMAN_REVIEW) / imp.n;
  const reviewShare = imp.distribution.HUMAN_REVIEW / imp.n;
  const months = Object.entries(t.by_month);
  const maxNeg = Math.max(...months.map(([, v]) => v.neg));
  const s = results.suite;
  const verdicts = Object.keys(s.confusion);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 space-y-12">
      <div>
        <div className="kicker mb-2">Evidence, impact and evaluation</div>
        <h1 className="display text-4xl md:text-5xl text-ink max-w-3xl">What the reviews say, what this would change, and how I know the engine is right.</h1>
      </div>

      {/* ---- evidence ---- */}
      <section className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat value={t.total_reviews.toLocaleString("en-IN")} label="Play Store reviews analysed" sub={`${t.window[0]} → ${t.window[1]}`} />
          <Stat value={t.negative_n.toLocaleString("en-IN")} label="1–3★ with real text" sub="the complaint set" />
          <Stat value={pct(lifecycleShare)} label="about the claim lifecycle" sub="didn't track, stuck, cancelled, never received" />
          <Stat value={pct(t.dev_reply_rate_neg)} label="of those got a team reply" sub="effort isn't the gap; the product loop is" />
        </div>
        <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6">
          <div className="card p-6">
            <div className="kicker mb-1">Complaint themes (multi-label)</div>
            <h3 className="font-semibold text-ink mb-4">Negative reviews mentioning each theme</h3>
            <Bars
              rows={Object.entries(t.theme_counts).map(([k, v]) => ({ label: THEME_LABEL[k] ?? k, value: v as number }))}
              highlight={(label) => [...LIFECYCLE].some((k) => THEME_LABEL[k] === label)}
            />
            <p className="text-xs text-muted mt-4">
              Highlighted bars = claim-lifecycle themes TrackBack addresses. Keyword-coded with Hinglish variants; spot-check precision
              37/40 on a random sample. Code in <code>research/themes.py</code>.
            </p>
          </div>
          <div className="card p-6">
            <div className="kicker mb-1">Negative reviews per month</div>
            <h3 className="font-semibold text-ink mb-4">Steady, not a one-off spike</h3>
            <div className="flex items-end gap-2 h-48" role="img" aria-label="Negative reviews per month, December 2025 to September 2026">
              {months.map(([m, v]) => (
                <div key={m} className="flex-1 flex flex-col items-center gap-1 h-full justify-end" title={`${m}: ${v.neg} negative, ${v.lifecycle} lifecycle`}>
                  <span className="text-[10px] text-ink-2 tabular-nums">{v.neg}</span>
                  <div className="w-full rounded-t" style={{ height: `${(v.neg / maxNeg) * 100}%`, background: "var(--bar)", minHeight: 4 }} />
                  <span className="text-[10px] text-muted">{m.slice(5)}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted mt-4">
              December is a partial month (data starts 17 Dec). Total review volume grew ~5× from Jun to Aug 2026 (mostly 5★), while negative reviews stayed at 50–90 a month.
              The lifecycle problem is structural.
            </p>
          </div>
        </div>
      </section>

      {/* ---- impact ---- */}
      <section className="space-y-6">
        <div>
          <div className="kicker mb-2">Impact</div>
          <h2 className="display text-3xl md:text-4xl text-ink">1,000 simulated claims through the engine</h2>
        </div>
        <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
          <div className="card p-6">
            <h3 className="font-semibold text-ink mb-4">Outcome of each claim</h3>
            <Bars
              rows={Object.entries(imp.distribution).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: VERDICT_LABEL[k] ?? k, value: v }))}
              format={(n) => pct(n / imp.n)}
            />
            <p className="text-xs text-muted mt-4">
              {pct(autoShare)} settled in seconds without a person. Even a &ldquo;no&rdquo; is a win: it arrives instantly with the exact rule,
              instead of after 8–10 days of back-and-forth. The claim mix is a stated assumption (<code>ASSUMED_MIX</code>).
            </p>
          </div>
          <div className="card p-6">
            <h3 className="font-semibold text-ink mb-3">How I&rsquo;d measure it in production</h3>
            <dl className="space-y-3 text-sm">
              <div><dt className="font-medium text-ink">North star</dt><dd className="text-ink-2">Share of missing-cashback cases resolved with no ticket raised (auto-file, auto re-check, or clear &ldquo;no&rdquo;).</dd></div>
              <div><dt className="font-medium text-ink">User outcome</dt><dd className="text-ink-2">Median time from &ldquo;didn&rsquo;t track&rdquo; to first definitive answer. Today: 8–10 days (reviews). Target: under 1 minute for 90%.</dd></div>
              <div><dt className="font-medium text-ink">Guardrails</dt><dd className="text-ink-2">Network rejection rate of auto-filed claims (must not rise above the manual baseline); reopen/dispute rate on &ldquo;not eligible&rdquo;; cashback cost per order.</dd></div>
              <div><dt className="font-medium text-ink">Lagging</dt><dd className="text-ink-2">1–2★ reviews mentioning tracking/pending/cancelled per 1,000 reviews; repeat purchase through the app after a claim.</dd></div>
            </dl>
          </div>
        </div>
        <ImpactCalc autoShare={autoShare} reviewShare={reviewShare} />
      </section>

      {/* ---- eval ---- */}
      <section className="space-y-6">
        <div>
          <div className="kicker mb-2">Evaluation</div>
          <h2 className="display text-3xl md:text-4xl text-ink">Proving the engine does what the spec says</h2>
          <p className="text-ink-2 mt-3 max-w-3xl">
            Money decisions need tests, not vibes. The suite plants one broken rule per scenario and adds noise that must not change
            the answer. Honest caveat: it proves the rules match the spec, not that the spec matches CashKaro&rsquo;s real networks.
            That&rsquo;s a backtest on historical claims, and it&rsquo;s the first thing I&rsquo;d run (PRD §9).
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat value={pct(s.verdictAccuracy, 1)} label="Verdict accuracy" sub={`${s.n} planted scenarios, ${s.reasons} rules`} />
          <Stat value={String(s.falseApprove)} label="False auto-files" sub="the metric that costs money" />
          <Stat value={pct(s.noisy.accuracy, 1)} label="Accuracy under noise" sub={`n=${s.noisy.n}`} />
          <Stat value={`${results.edge.passed}/${results.edge.n}`} label="Boundary cases pass" sub="hand-written product decisions" />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card p-6 min-w-0">
            <h3 className="font-semibold text-ink mb-4">Confusion matrix (rows = planted, cols = engine)</h3>
            <div className="overflow-x-auto">
              <table className="text-xs tabular-nums">
                <thead>
                  <tr>
                    <th />
                    {verdicts.map((v) => <th key={v} className="px-1.5 py-1 font-medium text-muted [writing-mode:vertical-rl] rotate-180 h-24 text-left">{VERDICT_LABEL[v]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {verdicts.map((row) => {
                    const r = s.confusion[row as keyof typeof s.confusion] as Record<string, number>;
                    const max = Math.max(...Object.values(r), 1);
                    return (
                      <tr key={row}>
                        <th className="pr-2 py-1 text-left font-medium text-ink-2 whitespace-nowrap">{VERDICT_LABEL[row]}</th>
                        {verdicts.map((col) => (
                          <td key={col} className="p-0.5">
                            <div
                              className="h-9 w-12 rounded grid place-items-center"
                              style={{ background: r[col] ? `color-mix(in oklab, var(--bar) ${20 + (r[col] / max) * 70}%, var(--card))` : "var(--sunk)", color: r[col] / max > 0.5 ? "#fff" : "var(--ink-2)" }}
                              title={`planted ${row}, engine ${col}: ${r[col]}`}
                            >
                              {r[col] || ""}
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card p-6 min-w-0">
            <h3 className="font-semibold text-ink mb-4">Boundary cases</h3>
            <ul className="space-y-2 text-sm">
              {results.edge.cases.map((c) => (
                <li key={c.id} className="flex gap-2">
                  <span className={c.pass ? "text-good" : "text-bad"}>{c.pass ? "✓" : "✕"}</span>
                  <span className="text-ink-2"><span className="text-muted tabular-nums">{c.id}</span> {c.why} → <span className="text-ink">{VERDICT_LABEL[c.expected]}</span></span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-ink mb-1">Order extraction: where AI earns its place</h3>
          <p className="text-sm text-ink-2 mb-4">
            13 documents: 9 clean confirmation emails and 4 messy ones (a forwarded email, an SMS, a Hinglish chat message, a cancellation notice).
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted border-b border-line">
                <th className="py-2 font-medium">Extractor</th>
                <th className="py-2 font-medium text-right">All fields right</th>
                <th className="py-2 font-medium text-right">Field accuracy</th>
                <th className="py-2 font-medium pl-4">Misses</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line">
                <td className="py-2 text-ink">Rule-based parser (fallback)</td>
                <td className="py-2 text-right tabular-nums">{pct(results.extraction.parser.allRight, 1)}</td>
                <td className="py-2 text-right tabular-nums">{pct(results.extraction.parser.fieldAcc, 1)}</td>
                <td className="py-2 pl-4 text-ink-2 text-xs">{results.extraction.parser.misses.map((m) => `${m.case.replace("x_", "")}: ${m.wrong.join(", ")}`).join(" · ") || "none"}</td>
              </tr>
              <tr>
                <td className="py-2 text-ink">LLM {results.extraction.claude ? `(${(results.extraction.claude as { model: string }).model} on Groq)` : ""}</td>
                {results.extraction.claude ? (
                  <>
                    <td className="py-2 text-right tabular-nums">{pct((results.extraction.claude as { allRight: number }).allRight, 1)}</td>
                    <td className="py-2 text-right tabular-nums">{pct((results.extraction.claude as { fieldAcc: number }).fieldAcc, 1)}</td>
                    <td className="py-2 pl-4 text-ink-2 text-xs">{((results.extraction.claude as { misses: { case: string; wrong: string[] }[] }).misses).map((m) => `${m.case.replace("x_", "")}: ${m.wrong.join(", ")}`).join(" · ") || "none"}</td>
                  </>
                ) : (
                  <td colSpan={3} className="py-2 text-right text-muted text-xs">Run <code>npm run eval -- --llm</code> with an API key to score it.</td>
                )}
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-muted mt-4">
            The parser is the safety net when the API is down; it breaks on exactly the inputs real users send (Hinglish, SMS). Either way,
            extracted fields go through sanity checks (order-ID format per store, items vs total, date range) and the user confirms them before the engine runs.
          </p>
        </div>
      </section>
    </div>
  );
}
