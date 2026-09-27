"use client";

import { useState } from "react";
import { Pill, type Tone } from "@/components/ui";
import type { StatusExplanation } from "@/lib/engine/explainStatus";
import { fmtDate, inr } from "@/lib/engine/time";
import type { Transaction } from "@/lib/types";

interface Row {
  t: Transaction;
  store: string;
  ex: StatusExplanation;
}

const STATUS_TONE: Record<Transaction["status"], Tone> = {
  pending: "wait",
  confirmed: "good",
  paid: "neutral",
  cancelled: "bad",
};

export function WalletView({ rows, userName }: { rows: Row[]; userName: string }) {
  const [sel, setSel] = useState(rows.find((r) => r.ex.dateMoved)?.t.id ?? rows[0].t.id);
  const cur = rows.find((r) => r.t.id === sel)!;
  const sum = (s: Transaction["status"][]) => rows.filter((r) => s.includes(r.t.status)).reduce((a, r) => a + r.t.cashback, 0);

  return (
    <div className="mt-8 grid lg:grid-cols-[400px_1fr] gap-6 items-start">
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-line">
          <div className="kicker">{userName}&rsquo;s wallet</div>
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            {([
              ["Pending", sum(["pending"])],
              ["Confirmed", sum(["confirmed"])],
              ["Paid", sum(["paid"])],
            ] as const).map(([k, v]) => (
              <div key={k} className="rounded-lg bg-sunk py-2">
                <div className="text-lg font-semibold text-ink tabular-nums">{inr(v)}</div>
                <div className="text-[11px] text-muted">{k}</div>
              </div>
            ))}
          </div>
        </div>
        <ul>
          {rows.map(({ t, store, ex }) => (
            <li key={t.id}>
              <button
                onClick={() => setSel(t.id)}
                className={`w-full text-left px-5 py-3 border-b border-line flex items-center justify-between gap-3 ${sel === t.id ? "bg-brand-soft" : "hover:bg-sunk"}`}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-ink">{store} · {inr(t.orderAmount)}</div>
                  <div className="text-xs text-muted truncate">{ex.headline}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm tabular-nums text-ink">{inr(t.cashback)}</div>
                  <Pill tone={STATUS_TONE[t.status]}>{t.status}</Pill>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="card p-6 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="kicker">{cur.store} · order {cur.t.orderId}</div>
            <h2 className="display text-3xl text-ink mt-1">{cur.ex.headline}</h2>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold tabular-nums text-ink">{inr(cur.t.cashback)}</div>
            <div className="text-xs text-muted">on {inr(cur.t.orderAmount)}, ordered {fmtDate(cur.t.placedAt)}</div>
          </div>
        </div>

        <ol className="mt-6 relative border-l-2 border-line ml-2 space-y-5">
          {cur.ex.stages.map((s, i) => (
            <li key={i} className="pl-5 relative">
              <span
                className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 ${
                  s.done ? (cur.ex.tone === "bad" && i === cur.ex.stages.length - 1 ? "bg-bad border-bad" : "bg-brand border-brand") : "bg-card border-line"
                }`}
              />
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className={`text-sm font-medium ${s.done ? "text-ink" : "text-ink-2"}`}>{s.label}</span>
                <span className="text-xs text-muted tabular-nums">{s.date}</span>
                {s.note && <Pill tone="wait">{s.note}</Pill>}
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <div className="rounded-xl bg-sunk p-4">
            <div className="kicker mb-1">Why</div>
            <p className="text-sm text-ink leading-relaxed">{cur.ex.why}</p>
          </div>
          <div className="rounded-xl bg-sunk p-4">
            <div className="kicker mb-1">What happens next</div>
            <p className="text-sm text-ink leading-relaxed">{cur.ex.next}</p>
            {cur.ex.appealable && (
              <button className="mt-3 rounded-lg bg-ink text-paper px-3 py-1.5 text-sm">Appeal with one tap</button>
            )}
          </div>
        </div>

        <details className="mt-6 text-sm">
          <summary className="cursor-pointer text-ink-2">How this is computed</summary>
          <p className="mt-2 text-ink-2">
            The explanation comes from the store&rsquo;s return window, its usual validation lag, the date of the last report
            the store sent, and a mapped cancellation code. The store&rsquo;s raw code is translated into one plain sentence and
            one next step. If a store rejects without a reason, the user is told it&rsquo;s on us to chase, not on them. A moved
            date always comes with a message; it never changes silently.
          </p>
        </details>
      </div>
    </div>
  );
}
