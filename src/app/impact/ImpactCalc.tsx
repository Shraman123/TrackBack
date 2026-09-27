"use client";

import { useState } from "react";

export function ImpactCalc({ autoShare, reviewShare }: { autoShare: number; reviewShare: number }) {
  const [claims, setClaims] = useState(50000);
  const [minutes, setMinutes] = useState(7);
  const [touches, setTouches] = useState(2.5);
  const [cost, setCost] = useState(300);

  // Today: every claim is a ticket with back-and-forth. After: only reviews need a person,
  // and they arrive with evidence assembled (assume one touch).
  const hoursBefore = (claims * touches * minutes) / 60;
  const hoursAfter = (claims * reviewShare * minutes) / 60;
  const saved = hoursBefore - hoursAfter;
  const fmt = (n: number) => Math.round(n).toLocaleString("en-IN");

  const field = "mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 text-ink tabular-nums";
  return (
    <div className="card p-6">
      <div className="kicker mb-1">Impact model — change the assumptions</div>
      <h3 className="font-semibold text-ink mb-4">Support hours per month</h3>
      <div className="grid md:grid-cols-4 gap-3 text-sm">
        <label className="text-ink-2">Missing-cashback claims / month
          <input type="number" min={0} step={1000} className={field} value={claims} onChange={(e) => setClaims(Number(e.target.value))} />
        </label>
        <label className="text-ink-2">Agent minutes per touch
          <input type="number" min={1} className={field} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
        </label>
        <label className="text-ink-2">Touches per ticket today
          <input type="number" min={1} step={0.5} className={field} value={touches} onChange={(e) => setTouches(Number(e.target.value))} />
        </label>
        <label className="text-ink-2">Loaded cost / agent hour (₹)
          <input type="number" min={0} step={50} className={field} value={cost} onChange={(e) => setCost(Number(e.target.value))} />
        </label>
      </div>
      <div className="grid md:grid-cols-3 gap-3 mt-5">
        <div className="rounded-xl bg-sunk p-4">
          <div className="text-2xl font-semibold text-ink tabular-nums">{fmt(hoursBefore)} h</div>
          <div className="text-xs text-muted">today: every claim is a ticket</div>
        </div>
        <div className="rounded-xl bg-sunk p-4">
          <div className="text-2xl font-semibold text-ink tabular-nums">{fmt(hoursAfter)} h</div>
          <div className="text-xs text-muted">with TrackBack: only the {(reviewShare * 100).toFixed(0)}% needing review, one touch each</div>
        </div>
        <div className="rounded-xl bg-good-soft p-4">
          <div className="text-2xl font-semibold text-good tabular-nums">{fmt(saved)} h · ₹{fmt(saved * cost)}</div>
          <div className="text-xs text-ink-2">saved per month ({fmt(saved / 160)} agent FTEs)</div>
        </div>
      </div>
      <p className="text-xs text-muted mt-4">
        {(autoShare * 100).toFixed(0)}% decided without a person comes from the simulated claim mix (1,000 claims). Every input
        here is an assumption to replace with CashKaro&rsquo;s real ticket data in week one. The bigger win isn&rsquo;t hours:
        it&rsquo;s the user getting an answer in seconds instead of 8–10 days, inside the return window.
      </p>
    </div>
  );
}
