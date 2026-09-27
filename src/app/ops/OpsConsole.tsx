"use client";

import { useMemo, useState } from "react";
import { Bars, CheckList, Pill, VerdictPill, VERDICT_META } from "@/components/ui";
import { inr } from "@/lib/engine/time";
import type { Decision, ReasonCode, Verdict } from "@/lib/types";

export interface OpsRow {
  id: string;
  user: string;
  store: string;
  orderId: string;
  amount: number;
  minutesAgo: number;
  decision: Decision;
  reply: { title: string; body: string };
}

type Action = { kind: "approved" | "rejected" | "asked"; note: string; agreed: boolean };

const TABS: { key: "review" | "all" | Verdict; label: string }[] = [
  { key: "review", label: "Needs a person" },
  { key: "all", label: "All" },
  { key: "AUTO_FILE", label: "Auto-filed" },
  { key: "NOT_ELIGIBLE", label: "Not eligible" },
  { key: "WAIT", label: "Waiting" },
  { key: "NEEDS_INFO", label: "Needs info" },
];

// Reason codes that point at a product fix rather than a support fix.
const FIXES: Partial<Record<ReasonCode, string>> = {
  TOO_EARLY: "Tell users on the order screen that tracking takes up to 72 h. Auto re-check removes the ticket entirely.",
  CLICK_OUTSIDE_WINDOW: "“Your visit expires in 3 h” nudge; one-tap re-open of the store from the cart reminder.",
  NO_CLICK: "Detect app-to-app handoff failures (store app already open) and warn before the user shops.",
  THIRD_PARTY_COUPON: "Show the store’s coupon rule on the store page; surface our own coupons first.",
  CLAIM_WINDOW_EXPIRED: "Day-4 push: “Your Amazon order hasn’t tracked yet. Claim now in one tap.”",
  INVOICE_REQUIRED: "Deep-link to the store’s invoice page from the claim screen.",
  CLICK_AFTER_ORDER: "Explain on first use that the visit must start from us, not after checkout.",
  ALL_ITEMS_EXCLUDED: "Show excluded categories before checkout, not after.",
  EXCHANGE_VOIDS: "Warn at the return/exchange step for stores that treat exchanges as returns.",
};

function ago(m: number) {
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function OpsConsole({ rows }: { rows: OpsRow[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("review");
  const [sel, setSel] = useState<string | null>(rows.find((r) => r.decision.verdict === "HUMAN_REVIEW")?.id ?? null);
  const [actions, setActions] = useState<Record<string, Action>>({});
  const [rejectReason, setRejectReason] = useState("Order details don't match the store's report");

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) c[r.decision.verdict] = (c[r.decision.verdict] ?? 0) + 1;
    return c;
  }, [rows]);

  const visible = rows.filter((r) =>
    tab === "all" ? true : tab === "review" ? r.decision.verdict === "HUMAN_REVIEW" && !actions[r.id] : r.decision.verdict === tab,
  );
  const cur = rows.find((r) => r.id === sel) ?? null;
  const auto = rows.length - (counts.HUMAN_REVIEW ?? 0);
  const overrides = Object.entries(actions).filter(([, a]) => !a.agreed);

  const reasonRows = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rows) if (FIXES[r.decision.reason]) m[r.decision.reason] = (m[r.decision.reason] ?? 0) + 1;
    return Object.entries(m)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => ({ label: k, value: v, note: FIXES[k as ReasonCode] }));
  }, [rows]);

  function act(kind: Action["kind"]) {
    if (!cur) return;
    const suggested = cur.decision.verdict === "HUMAN_REVIEW" ? "approved" : null;
    const note = kind === "rejected" ? rejectReason : kind === "asked" ? "Requested invoice / delivery proof" : "Filed with network";
    setActions((a) => ({ ...a, [cur.id]: { kind, note, agreed: suggested === null ? true : kind === suggested } }));
    const next = rows.find((r) => r.decision.verdict === "HUMAN_REVIEW" && !actions[r.id] && r.id !== cur.id);
    if (tab === "review" && next) setSel(next.id);
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi value={String(rows.length)} label="Claims in the last 10 h" />
        <Kpi value={`${Math.round((auto / rows.length) * 100)}%`} label="Decided without a person" sub="auto-file, wait, info, not eligible, tracked" />
        <Kpi value={String((counts.HUMAN_REVIEW ?? 0) - Object.keys(actions).filter((id) => rows.find((r) => r.id === id)?.decision.verdict === "HUMAN_REVIEW").length)} label="Waiting for a reviewer" sub="high value or risk signal" />
        <Kpi value={String(overrides.length)} label="Overrides logged" sub="reviewer disagreed with engine" />
      </div>

      <div className="grid lg:grid-cols-[1fr_420px] gap-6 items-start">
        <div className="card overflow-hidden min-w-0">
          <div className="flex gap-1 p-2 border-b border-line overflow-x-auto" role="tablist">
            {TABS.map((t) => {
              const n = t.key === "all" ? rows.length : t.key === "review" ? rows.filter((r) => r.decision.verdict === "HUMAN_REVIEW" && !actions[r.id]).length : counts[t.key] ?? 0;
              return (
                <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${tab === t.key ? "bg-ink text-paper" : "text-ink-2 hover:bg-sunk"}`}>
                  {t.label} <span className="opacity-60 tabular-nums">{n}</span>
                </button>
              );
            })}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted border-b border-line">
                  <th className="px-4 py-2 font-medium">Customer</th>
                  <th className="px-2 py-2 font-medium">Store</th>
                  <th className="px-2 py-2 font-medium text-right">Order</th>
                  <th className="px-2 py-2 font-medium text-right">Cashback</th>
                  <th className="px-2 py-2 font-medium">Engine</th>
                  <th className="px-4 py-2 font-medium text-right">Age</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Queue clear. Nothing needs a person right now.</td></tr>
                )}
                {visible.map((r) => (
                  <tr key={r.id} onClick={() => setSel(r.id)} className={`border-b border-line cursor-pointer ${sel === r.id ? "bg-brand-soft" : "hover:bg-sunk"}`}>
                    <td className="px-4 py-2.5 text-ink whitespace-nowrap">{r.user}</td>
                    <td className="px-2 py-2.5 text-ink-2">{r.store}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-ink-2">{inr(r.amount)}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-ink">{r.decision.expectedCashback ? inr(r.decision.expectedCashback) : "—"}</td>
                    <td className="px-2 py-2.5">
                      {actions[r.id] ? <Pill tone={actions[r.id].kind === "approved" ? "good" : actions[r.id].kind === "rejected" ? "bad" : "info"}>{actions[r.id].kind}</Pill> : <VerdictPill verdict={r.decision.verdict} short />}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted tabular-nums">{ago(r.minutesAgo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-5 lg:sticky lg:top-20 min-w-0">
          {!cur ? (
            <p className="text-sm text-muted">Select a claim.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="kicker">{cur.store} · {cur.orderId}</div>
                  <VerdictPill verdict={cur.decision.verdict} short />
                </div>
                <div className="text-lg font-semibold text-ink mt-1">{cur.user}</div>
                <div className="text-xs text-muted">
                  Engine: {VERDICT_META[cur.decision.verdict].label} · <code>{cur.decision.reason}</code>
                  {cur.decision.approvalOdds !== null && ` · store accepts ~${Math.round(cur.decision.approvalOdds * 100)}%`}
                </div>
              </div>
              <CheckList checks={cur.decision.checks} />
              {cur.decision.networkPayload && (
                <details>
                  <summary className="text-sm text-ink-2 cursor-pointer">Prepared network claim</summary>
                  <pre className="mt-2 text-xs bg-sunk rounded-lg p-3 overflow-x-auto text-ink">{JSON.stringify(cur.decision.networkPayload, null, 2)}</pre>
                </details>
              )}
              <div className="rounded-xl bg-sunk p-3">
                <div className="kicker mb-1">Drafted reply</div>
                <div className="text-sm font-medium text-ink">{cur.reply.title}</div>
                <p className="text-sm text-ink-2 mt-1">{cur.reply.body}</p>
              </div>
              {actions[cur.id] ? (
                <div className="rounded-xl border border-line p-3 text-sm text-ink-2">
                  <b className="text-ink capitalize">{actions[cur.id].kind}</b> — {actions[cur.id].note}
                  {!actions[cur.id].agreed && <div className="text-xs text-wait mt-1">Logged as an override for the weekly rules review.</div>}
                </div>
              ) : cur.decision.verdict === "HUMAN_REVIEW" ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => act("approved")} className="rounded-lg bg-brand text-white py-2 text-sm font-medium">Approve &amp; file</button>
                    <button onClick={() => act("asked")} className="rounded-lg border border-line py-2 text-sm text-ink">Ask for proof</button>
                  </div>
                  <div className="flex gap-2">
                    <select value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="flex-1 min-w-0 rounded-lg border border-line bg-card px-2 py-2 text-sm text-ink">
                      <option>Order details don&apos;t match the store&apos;s report</option>
                      <option>Duplicate across accounts</option>
                      <option>Pattern of abuse on this account</option>
                    </select>
                    <button onClick={() => act("rejected")} className="rounded-lg border border-bad text-bad px-3 text-sm">Reject</button>
                  </div>
                  <p className="text-xs text-muted">Rejections need a reason; the customer sees it in plain language.</p>
                </div>
              ) : (
                <p className="text-xs text-muted">Decided by the engine. A reviewer can reopen it if the customer disputes, with this check list attached.</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="kicker mb-1">Ops data → product roadmap</div>
          <h3 className="font-semibold text-ink mb-4">Claims that a product change would prevent</h3>
          <Bars rows={reasonRows} />
          <ul className="mt-4 space-y-2">
            {reasonRows.slice(0, 4).map((r) => (
              <li key={r.label} className="text-sm text-ink-2"><code className="text-xs text-ink">{r.label}</code>: {r.note}</li>
            ))}
          </ul>
        </div>
        <div className="card p-5">
          <div className="kicker mb-1">Override log</div>
          <h3 className="font-semibold text-ink mb-4">Where reviewers disagreed with the engine</h3>
          {overrides.length === 0 ? (
            <p className="text-sm text-muted">No overrides yet. Reject or ask for proof on a claim the engine prepared, and it lands here with the reason, so rules get tuned from evidence, not anecdotes.</p>
          ) : (
            <ul className="space-y-2">
              {overrides.map(([id, a]) => {
                const r = rows.find((x) => x.id === id)!;
                return (
                  <li key={id} className="text-sm border-b border-line pb-2">
                    <span className="text-ink">{r.store} · {inr(r.decision.expectedCashback)}</span>{" "}
                    <span className="text-muted">engine said review → reviewer {a.kind}:</span> <span className="text-ink-2">{a.note}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-2xl font-semibold text-ink tabular-nums">{value}</div>
      <div className="text-sm text-ink">{label}</div>
      {sub && <div className="text-[11px] text-muted mt-0.5">{sub}</div>}
    </div>
  );
}
