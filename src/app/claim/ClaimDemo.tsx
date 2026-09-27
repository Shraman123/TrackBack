"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckList, Pill, VerdictPill, VERDICT_META } from "@/components/ui";
import { CATEGORY_LABELS, RETAILER_LIST } from "@/lib/data/retailers";
import type { ClaimedOrder, Decision, OrderStatus, RetailerId, User, Verdict } from "@/lib/types";
import { fmtDate, inr } from "@/lib/engine/time";

interface SampleLite {
  id: string;
  userId: string;
  title: string;
  expect: Verdict;
  review: string;
  email: string;
  hasInvoice: boolean;
}

interface ExtractResp {
  order?: ClaimedOrder;
  via?: "claude" | "parser";
  note?: string;
  warnings?: { field: string; message: string }[];
  error?: string;
}

interface DecideResp {
  decision: Decision;
  message: { title: string; body: string; source: "claude" | "template"; blocked?: string };
}

type Mode = "sample" | "paste" | "screenshot";

const STATUSES: OrderStatus[] = ["placed", "shipped", "delivered", "cancelled", "returned", "exchanged"];

// datetime-local <-> ISO, always in IST
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 5.5 * 3600_000);
  return d.toISOString().slice(0, 16);
}
function fromLocalInput(v: string) {
  return v ? new Date(`${v}:00+05:30`).toISOString() : null;
}

const HEADER_TONE: Record<string, string> = {
  good: "bg-good text-white",
  wait: "bg-wait text-white",
  bad: "bg-bad text-white",
  info: "bg-info text-white",
  neutral: "bg-ink text-paper",
};

export function ClaimDemo({ samples, users, llm, model }: { samples: SampleLite[]; users: User[]; llm: boolean; model: string }) {
  const [mode, setMode] = useState<Mode>("sample");
  const [userId, setUserId] = useState("u_priya");
  const [sampleId, setSampleId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [polish, setPolish] = useState(false);
  const [sandboxClick, setSandboxClick] = useState(true);
  const [listOpen, setListOpen] = useState(true);
  const [clickMinutes, setClickMinutes] = useState(20);

  const [order, setOrder] = useState<ClaimedOrder | null>(null);
  const [extract, setExtract] = useState<ExtractResp | null>(null);
  const [result, setResult] = useState<DecideResp | null>(null);
  const [busy, setBusy] = useState<"extract" | "decide" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setOrder(null);
    setExtract(null);
    setResult(null);
    setError(null);
  };

  async function runExtract(payload: Record<string, string>, hasInvoice = false) {
    reset();
    setBusy("extract");
    try {
      const res = await fetch("/api/extract", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data: ExtractResp = await res.json();
      if (!res.ok || !data.order) {
        setError(data.error ?? "Couldn't read that order.");
        setExtract(data);
        return null;
      }
      const o = { ...data.order, hasInvoice: data.order.hasInvoice || hasInvoice };
      setExtract(data);
      setOrder(o);
      return o;
    } finally {
      setBusy(null);
    }
  }

  async function runDecide(o: ClaimedOrder, opts: { uid?: string; useSandbox?: boolean; l?: "en" | "hi" } = {}) {
    setBusy("decide");
    setError(null);
    try {
      const useSandbox = opts.useSandbox ?? (mode !== "sample" && sandboxClick);
      const res = await fetch("/api/decide", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: opts.uid ?? userId,
          order: o,
          lang: opts.l ?? lang,
          polish,
          sandboxClickMinutesBefore: useSandbox ? clickMinutes : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Something went wrong.");
      else setResult(data);
    } finally {
      setBusy(null);
    }
  }

  async function pickSample(s: SampleLite) {
    setMode("sample");
    setSampleId(s.id);
    setListOpen(false);
    setUserId(s.userId);
    const o = await runExtract({ text: s.email }, s.hasInvoice);
    if (o) await runDecide(o, { uid: s.userId, useSandbox: false });
  }

  async function onFile(f: File) {
    if (f.size > 4_000_000) return setError("Screenshot is too large (max 4 MB).");
    const buf = await f.arrayBuffer();
    let bin = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    await runExtract({ imageBase64: btoa(bin), mediaType: f.type });
  }

  const patch = (p: Partial<ClaimedOrder>) => {
    setOrder((o) => (o ? { ...o, ...p } : o));
    setResult(null);
  };

  const d = result?.decision;
  const meta = d ? VERDICT_META[d.verdict] : null;
  const user = users.find((u) => u.id === userId)!;
  const activeSample = samples.find((s) => s.id === sampleId);

  return (
    <div className="mt-8 grid lg:grid-cols-[440px_1fr] gap-6 items-start">
      {/* ---------------- user side ---------------- */}
      <div className="card overflow-hidden">
        <div className="px-5 pt-4 pb-3 border-b border-line flex items-center justify-between gap-2">
          <div>
            <div className="kicker">User view</div>
            <div className="text-sm text-ink font-medium">Missing cashback</div>
          </div>
          <div className="flex items-center gap-1 text-xs" role="group" aria-label="Language">
            {(["en", "hi"] as const).map((l) => (
              <button
                key={l}
                onClick={() => {
                  setLang(l);
                  if (order && result) runDecide(order, { l });
                }}
                className={`px-2.5 py-1 rounded-full border ${lang === l ? "bg-ink text-paper border-ink" : "border-line text-ink-2"}`}
              >
                {l === "en" ? "English" : "Hinglish"}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* source tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-sunk rounded-xl text-sm" role="tablist">
            {([
              ["sample", "Scenarios"],
              ["paste", "Paste email"],
              ["screenshot", "Screenshot"],
            ] as const).map(([m, label]) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m);
                  reset();
                  setSampleId(null);
                }}
                className={`py-1.5 rounded-lg ${mode === m ? "bg-card text-ink shadow-sm" : "text-ink-2"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === "sample" && sampleId && !listOpen && (
            <button onClick={() => setListOpen(true)} className="w-full text-left rounded-xl border border-brand bg-brand-soft px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-ink">{activeSample?.title}</span>
                <span className="text-xs text-brand-ink underline underline-offset-2">Pick another</span>
              </div>
              <div className="text-xs text-muted mt-0.5">{users.find((u) => u.id === activeSample?.userId)?.name}</div>
            </button>
          )}

          {mode === "sample" && (listOpen || !sampleId) && (
            <div className="space-y-2">
              {samples.map((s) => (
                <button
                  key={s.id}
                  onClick={() => pickSample(s)}
                  className={`w-full text-left rounded-xl border px-3 py-2.5 transition ${sampleId === s.id ? "border-brand bg-brand-soft" : "border-line hover:border-ink-2"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-ink">{s.title}</span>
                    <VerdictPill verdict={s.expect} short />
                  </div>
                  <div className="text-xs text-muted mt-0.5">{users.find((u) => u.id === s.userId)?.name}</div>
                </button>
              ))}
            </div>
          )}

          {mode !== "sample" && (
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="text-ink-2">Claiming as</span>
                <select value={userId} onChange={(e) => { setUserId(e.target.value); setResult(null); }} className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 text-ink">
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} · {u.city}</option>
                  ))}
                </select>
              </label>
              {mode === "paste" ? (
                <>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={7}
                    placeholder={"Paste an order confirmation email or SMS, e.g.\n\nFlipkart: Your order has been placed\nOrder ID: OD331298745512364100\nOrdered on 20 Sept 2026, 7:10 pm\nCotton Bedsheet Double  ₹899\nTotal: ₹899"}
                    className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm font-mono text-ink"
                  />
                  <button
                    disabled={!text.trim() || busy !== null}
                    onClick={() => runExtract({ text })}
                    className="w-full rounded-xl bg-ink text-paper py-2.5 text-sm font-medium disabled:opacity-40"
                  >
                    {busy === "extract" ? "Reading…" : "Read my order"}
                  </button>
                </>
              ) : (
                <label className="block rounded-xl border-2 border-dashed border-line p-6 text-center cursor-pointer hover:border-ink-2">
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
                  <div className="text-sm text-ink font-medium">{busy === "extract" ? "Reading screenshot…" : "Drop an order screenshot"}</div>
                  <div className="text-xs text-muted mt-1">
                    {llm ? `Read by Claude (${model})` : "Needs Claude — not configured on this deployment. Use Paste email instead."}
                  </div>
                </label>
              )}
              <div className="rounded-xl bg-sunk p-3 text-xs text-ink-2 space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={sandboxClick} onChange={(e) => { setSandboxClick(e.target.checked); setResult(null); }} />
                  <span>Sandbox: pretend I came through the app before ordering</span>
                </label>
                {sandboxClick && (
                  <label className="flex items-center gap-2">
                    <span>Visit was</span>
                    <input type="number" min={-600} max={10000} value={clickMinutes} onChange={(e) => { setClickMinutes(Number(e.target.value)); setResult(null); }} className="w-20 rounded border border-line bg-card px-2 py-1 text-ink" />
                    <span>min before the order</span>
                  </label>
                )}
                <p className="text-muted">Real visit logs only exist for the scenario users; this adds one so your own order can be tested.</p>
              </div>
            </div>
          )}

          {error && <div className="rounded-xl bg-bad-soft text-bad text-sm p-3">{error}</div>}

          {/* confirm fields (non-sample) */}
          {order && mode !== "sample" && (
            <OrderForm order={order} warnings={extract?.warnings ?? []} onChange={patch} />
          )}
          {order && mode !== "sample" && (
            <button
              disabled={busy !== null}
              onClick={() => runDecide(order)}
              className="w-full rounded-xl bg-brand text-white py-2.5 text-sm font-medium disabled:opacity-40"
            >
              {busy === "decide" ? "Checking…" : "Check my claim"}
            </button>
          )}

          {/* decision */}
          {busy === "decide" && !d && <div className="text-sm text-muted">Checking…</div>}
          {d && meta && result && (
            <div className="rounded-2xl overflow-hidden border border-line">
              <div className={`px-4 py-3 ${HEADER_TONE[meta.tone]}`}>
                <div className="text-xs opacity-90">{meta.label}</div>
                <div className="font-semibold">{result.message.title}</div>
              </div>
              <div className="p-4 space-y-3 bg-card">
                <p className="text-sm text-ink leading-relaxed">{result.message.body}</p>
                {d.expectedCashback > 0 && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Pill tone="good">Expected {inr(d.expectedCashback)}</Pill>
                    {d.approvalOdds !== null && <Pill tone="neutral">Store accepts ~{Math.round(d.approvalOdds * 100)}% of claims like this</Pill>}
                  </div>
                )}
                <DateRow d={d} />
                <Actions d={d} onInvoice={() => order && (patch({ hasInvoice: true }), runDecide({ ...order, hasInvoice: true }))} />
                <div className="text-[11px] text-muted flex items-center gap-1.5">
                  {result.message.source === "claude" ? (
                    <Pill tone="ai">Worded by Claude · facts from rules engine</Pill>
                  ) : (
                    <span>Message from approved template{result.message.blocked ? ` (Claude rewrite rejected: ${result.message.blocked})` : ""}</span>
                  )}
                </div>
              </div>
            </div>
          )}
          {llm && (
            <label className="flex items-center gap-2 text-xs text-ink-2">
              <input type="checkbox" checked={polish} onChange={(e) => setPolish(e.target.checked)} />
              Let Claude word the message (numbers are locked by a guardrail)
            </label>
          )}
        </div>
      </div>

      {/* ---------------- under the hood ---------------- */}
      <div className="space-y-4 min-w-0">
        <div className="card p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="kicker">Under the hood</div>
            <span className="text-xs text-muted">Demo clock: 27 Sep 2026, 10:00 IST</span>
          </div>
          {!order && !d && (
            <p className="text-sm text-ink-2 mt-3">
              Pick a scenario on the left. You&rsquo;ll see: <b>1</b> how the order was read, <b>2</b> each rule the engine
              checked and why, <b>3</b> the claim that would go to the store, and <b>4</b> where AI was and wasn&rsquo;t allowed to act.
            </p>
          )}
          {activeSample && (
            <blockquote className="mt-3 border-l-2 border-brand pl-3 text-sm text-ink-2 italic">
              Review this answers: &ldquo;{activeSample.review}&rdquo;
            </blockquote>
          )}
        </div>

        {extract?.order && (
          <div className="card p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="font-semibold text-ink">1 · Order read</h3>
              {extract.via === "claude" ? <Pill tone="ai">Claude ({model})</Pill> : <Pill tone="neutral">Rule-based parser</Pill>}
            </div>
            {extract.note && <p className="text-xs text-muted mb-2">{extract.note}</p>}
            {extract.warnings && extract.warnings.length > 0 && (
              <ul className="mb-3 space-y-1">
                {extract.warnings.map((w, i) => (
                  <li key={i} className="text-xs rounded bg-wait-soft text-wait px-2 py-1">Check “{w.field}”: {w.message}</li>
                ))}
              </ul>
            )}
            <OrderSummary o={order ?? extract.order} />
          </div>
        )}

        {d && (
          <div className="card p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="font-semibold text-ink">2 · Rules engine</h3>
              <span className="flex items-center gap-2">
                <code className="text-xs text-muted">{d.reason}</code>
                <VerdictPill verdict={d.verdict} short />
              </span>
            </div>
            <CheckList checks={d.checks} />
            <p className="text-xs text-muted mt-4">
              Deterministic and auditable: same inputs, same answer. Claims for {user.name} are checked against their visit log,
              wallet and claim history ({user.approvedClaims}/{user.lifetimeClaims} past claims approved).
            </p>
          </div>
        )}

        {d?.networkPayload && (
          <div className="card p-5">
            <h3 className="font-semibold text-ink mb-1">3 · Claim for the affiliate network</h3>
            <p className="text-xs text-muted mb-3">
              {d.verdict === "AUTO_FILE" ? "Sent automatically." : "Prepared and waiting for a reviewer in the ops console."} Everything the network
              needs, so it isn&rsquo;t bounced back asking for screenshots.
            </p>
            <pre className="text-xs bg-sunk rounded-lg p-3 overflow-x-auto text-ink">{JSON.stringify(d.networkPayload, null, 2)}</pre>
          </div>
        )}

        {d && (
          <div className="card p-5">
            <h3 className="font-semibold text-ink mb-2">4 · Where AI is allowed</h3>
            <ul className="text-sm text-ink-2 space-y-1.5">
              <li><Pill tone="ai">Claude</Pill> reads messy screenshots, forwarded emails, SMS and Hinglish into fields. Every field is sanity-checked and shown to the user to confirm.</li>
              <li><Pill tone="neutral">Rules</Pill> decide eligibility and the amount. Money decisions stay deterministic, testable and explainable to a store.</li>
              <li><Pill tone="ai">Claude</Pill> may reword the message warmly (EN/Hinglish). A guardrail rejects any rewrite that adds a number, date or amount the engine didn&rsquo;t produce.</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function OrderSummary({ o }: { o: ClaimedOrder }) {
  const r = RETAILER_LIST.find((x) => x.id === o.retailerId);
  const rows: [string, string][] = [
    ["Store", r?.name ?? "—"],
    ["Order ID", o.orderId ?? "—"],
    ["Placed", o.placedAt ? fmtDate(o.placedAt) : "—"],
    ["Total", o.amount ? inr(o.amount) : "—"],
    ["Status", o.status],
    ["Coupon", o.couponCode ? `${o.couponCode} (${o.couponSource === "retailer" ? "store's own" : "outside"})` : "none"],
    ["Invoice", o.hasInvoice ? "attached" : "no"],
  ];
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd className="text-ink break-all">{v}</dd>
          </div>
        ))}
      </dl>
      <ul className="text-sm space-y-1">
        {o.items.map((it, i) => (
          <li key={i} className="flex justify-between gap-2 border-b border-line pb-1">
            <span className="text-ink truncate">{it.name} <span className="text-xs text-muted">· {CATEGORY_LABELS[it.category] ?? it.category}</span></span>
            <span className="tabular-nums text-ink-2">{inr(it.price)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OrderForm({ order, warnings, onChange }: { order: ClaimedOrder; warnings: { field: string }[]; onChange: (p: Partial<ClaimedOrder>) => void }) {
  const warn = (f: string) => (warnings.some((w) => w.field === f) ? "border-wait" : "border-line");
  const input = "mt-1 w-full rounded-lg border bg-card px-2.5 py-1.5 text-sm text-ink";
  return (
    <div className="rounded-xl border border-line p-3 space-y-2">
      <div className="text-sm font-medium text-ink">Is this right?</div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-ink-2">Store
          <select className={`${input} ${warn("retailerId")}`} value={order.retailerId ?? ""} onChange={(e) => onChange({ retailerId: (e.target.value || null) as RetailerId | null })}>
            <option value="">—</option>
            {RETAILER_LIST.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>
        <label className="text-xs text-ink-2">Order ID
          <input className={`${input} ${warn("orderId")}`} value={order.orderId ?? ""} onChange={(e) => onChange({ orderId: e.target.value || null })} />
        </label>
        <label className="text-xs text-ink-2">Placed (IST)
          <input type="datetime-local" className={`${input} ${warn("placedAt")}`} value={toLocalInput(order.placedAt)} onChange={(e) => onChange({ placedAt: fromLocalInput(e.target.value) })} />
        </label>
        <label className="text-xs text-ink-2">Total ₹
          <input type="number" className={`${input} ${warn("amount")}`} value={order.amount ?? ""} onChange={(e) => onChange({ amount: e.target.value ? Number(e.target.value) : null })} />
        </label>
        <label className="text-xs text-ink-2">Status
          <select className={`${input} border-line`} value={order.status} onChange={(e) => onChange({ status: e.target.value as OrderStatus })}>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="text-xs text-ink-2">Coupon
          <input className={`${input} border-line`} value={order.couponCode ?? ""} placeholder="none" onChange={(e) => onChange({ couponCode: e.target.value.toUpperCase() || null, couponSource: e.target.value ? "third_party" : null })} />
        </label>
      </div>
      {order.items.map((it, i) => (
        <div key={i} className="grid grid-cols-[1fr_7rem] gap-2 items-end">
          <div className="text-xs text-ink truncate pb-2">{it.name} · {inr(it.price)}</div>
          <select
            className={`${input} border-line text-xs`}
            value={it.category}
            aria-label={`Category for ${it.name}`}
            onChange={(e) => onChange({ items: order.items.map((x, j) => (j === i ? { ...x, category: e.target.value } : x)) })}
          >
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      ))}
      <label className="flex items-center gap-2 text-xs text-ink-2">
        <input type="checkbox" checked={order.hasInvoice} onChange={(e) => onChange({ hasInvoice: e.target.checked })} /> Invoice attached
      </label>
    </div>
  );
}

function DateRow({ d }: { d: Decision }) {
  const items: [string, string | undefined][] = [
    ["Re-check", d.dates.recheckAt],
    ["Store answers by", d.dates.networkAnswerBy],
    ["Confirms around", d.dates.expectedConfirmBy],
  ];
  const shown = items.filter(([, v]) => v);
  if (!shown.length) return null;
  return (
    <div className="grid grid-cols-2 gap-2">
      {shown.map(([k, v]) => (
        <div key={k} className="rounded-lg bg-sunk px-3 py-2">
          <div className="text-[11px] text-muted">{k}</div>
          <div className="text-sm text-ink font-medium">{fmtDate(v!)}</div>
        </div>
      ))}
    </div>
  );
}

function Actions({ d, onInvoice }: { d: Decision; onInvoice: () => void }) {
  if (d.reason === "INVOICE_REQUIRED")
    return <button onClick={onInvoice} className="w-full rounded-xl bg-ink text-paper py-2 text-sm font-medium">Attach invoice (simulated)</button>;
  if (d.verdict === "ALREADY_TRACKED")
    return <Link href="/wallet" className="block text-center w-full rounded-xl bg-ink text-paper py-2 text-sm font-medium">Open in wallet</Link>;
  if (d.verdict === "NOT_ELIGIBLE")
    return <div className="text-xs text-ink-2">Think this is wrong? <span className="underline">Ask a person</span> — every “no” has a human route, with this check list attached.</div>;
  if (d.verdict === "WAIT")
    return <div className="text-xs text-ink-2">We&rsquo;ll message you on the re-check date. No need to come back.</div>;
  return null;
}
