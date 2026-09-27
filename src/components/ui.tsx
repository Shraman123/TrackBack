import type { Check, Verdict } from "@/lib/types";

export const VERDICT_META: Record<Verdict, { label: string; short: string; tone: Tone }> = {
  AUTO_FILE: { label: "Filed automatically", short: "Auto-filed", tone: "good" },
  WAIT: { label: "Auto re-check scheduled", short: "Wait", tone: "wait" },
  NEEDS_INFO: { label: "Needs one detail", short: "Needs info", tone: "info" },
  NOT_ELIGIBLE: { label: "Not eligible — reason shown", short: "Not eligible", tone: "bad" },
  HUMAN_REVIEW: { label: "Human review", short: "Review", tone: "neutral" },
  ALREADY_TRACKED: { label: "Already in wallet", short: "Tracked", tone: "info" },
};

export type Tone = "good" | "wait" | "bad" | "info" | "neutral" | "ai";

const TONE: Record<Tone, string> = {
  good: "bg-good-soft text-good",
  wait: "bg-wait-soft text-wait",
  bad: "bg-bad-soft text-bad",
  info: "bg-info-soft text-info",
  neutral: "bg-sunk text-ink-2",
  ai: "bg-ai-soft text-ai",
};

export function Pill({ tone, children, className = "" }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONE[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function VerdictPill({ verdict, short = false }: { verdict: Verdict; short?: boolean }) {
  const m = VERDICT_META[verdict];
  return <Pill tone={m.tone}>{short ? m.short : m.label}</Pill>;
}

const CHECK_ICON: Record<Check["status"], { glyph: string; cls: string; sr: string }> = {
  pass: { glyph: "✓", cls: "bg-good-soft text-good", sr: "passed" },
  fail: { glyph: "✕", cls: "bg-bad-soft text-bad", sr: "failed" },
  warn: { glyph: "!", cls: "bg-wait-soft text-wait", sr: "warning" },
  skip: { glyph: "–", cls: "bg-sunk text-muted", sr: "skipped" },
};

export function CheckList({ checks }: { checks: Check[] }) {
  return (
    <ol className="space-y-2">
      {checks.map((c) => {
        const i = CHECK_ICON[c.status];
        return (
          <li key={c.id} className="flex gap-3 items-start">
            <span className={`mt-0.5 h-5 w-5 shrink-0 rounded-full grid place-items-center text-[11px] font-bold ${i.cls}`}>
              {i.glyph}
              <span className="sr-only">{i.sr}</span>
            </span>
            <div className="min-w-0">
              <div className="text-sm font-medium text-ink">{c.label}</div>
              <div className="text-xs text-ink-2 break-words">{c.detail}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function Section({ kicker, title, children, className = "" }: { kicker?: string; title?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`mx-auto max-w-6xl px-4 ${className}`}>
      {kicker && <div className="kicker mb-2">{kicker}</div>}
      {title && <h2 className="display text-3xl md:text-4xl mb-6 text-ink">{title}</h2>}
      {children}
    </section>
  );
}

export function Stat({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div className="card p-5">
      <div className="display text-4xl text-ink">{value}</div>
      <div className="text-sm font-medium text-ink mt-1">{label}</div>
      {sub && <div className="text-xs text-muted mt-1">{sub}</div>}
    </div>
  );
}

/** Horizontal single-series bar chart with direct labels and native hover titles. */
export function Bars({
  rows,
  format = (n) => String(n),
  highlight,
}: {
  rows: { label: string; value: number; note?: string }[];
  format?: (n: number) => string;
  highlight?: (label: string) => boolean;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="space-y-2" role="table">
      {rows.map((r) => (
        <div key={r.label} role="row" className="grid grid-cols-[minmax(0,9rem)_1fr_auto] md:grid-cols-[13rem_1fr_4rem] items-center gap-3" title={`${r.label}: ${format(r.value)}${r.note ? ` — ${r.note}` : ""}`}>
          <div role="cell" className="text-sm text-ink-2 truncate">{r.label}</div>
          <div role="cell" className="h-5 rounded bg-sunk overflow-hidden">
            <div
              className="h-full rounded-r"
              style={{
                width: `${(r.value / max) * 100}%`,
                background: highlight && !highlight(r.label) ? "var(--bar-2)" : "var(--bar)",
                minWidth: 4,
              }}
            />
          </div>
          <div role="cell" className="text-sm tabular-nums text-ink text-right">{format(r.value)}</div>
        </div>
      ))}
    </div>
  );
}
