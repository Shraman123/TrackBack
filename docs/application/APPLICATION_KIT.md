# CashKaro — AI-First Product Management Intern: application kit

Everything to send, say and show. Fill `[brackets]` with your own details.

---

## 1. How to apply

The JD doesn't list an application method. It's hosted on a CashKaro employee's OneDrive, so whoever shared that link is your best channel. Send the note below **to that person directly**, then also apply through any formal channel you find (CashKaro careers page / LinkedIn job post) and mention you've sent it.

Order of attachments / links, strongest first:
1. `https://trackback-rosy.vercel.app` — the case study (lands on the story, one click to the demo)
2. `https://trackback-rosy.vercel.app/prd` — the PRD
3. `https://github.com/Shraman123/TrackBack` — code, eval report, research scripts
4. Resume (PDF)
5. Optional: a 90-second Loom of the demo (script in §5)

---

## 2. Cover note (email)

**Subject:** AI-First PM Intern: I built a fix for missing cashback (PRD + working MVP)

Hi [Name],

Your JD's hiring bar is "PRD in the morning, prototype with Claude by lunch, MVP by evening", so instead of a cover letter I did that for a CashKaro problem.

I analysed 6,000 recent CashKaro Play Store reviews. 54% of the substantive negative ones are about the same loop: the order doesn't track, the user raises a ticket, waits 8–10 days, and often gets a cancellation with no reason. Most of that isn't a tracking bug. It's attribution rules the product never explains.

So I built **TrackBack**: https://trackback-rosy.vercel.app
- **Claim copilot:** share a screenshot, email or SMS (Hinglish too). Claude reads it, a deterministic rules engine checks it against the visit log and store rules, and the user gets an answer in seconds: filed for you, we'll re-check, add one thing, or no, with the exact rule.
- **Wallet explainer:** every pending or cancelled cashback shows its step, the reason, and what happens next.
- **Ops console:** agents only see claims that need judgment, and the reason codes turn into a list of product fixes.

AI reads and words; rules decide the money. A 400-scenario test suite has 0 false auto-files, and a guardrail stops Claude from inventing numbers in messages. The PRD has RICE, metrics, an experiment design, and what I'd do in my first 30 days: a backtest on real tickets before trusting any of my assumptions.

PRD: https://trackback-rosy.vercel.app/prd · Code: https://github.com/Shraman123/TrackBack

I'm [one line: degree/year/college, or current role]. I've shipped [2–3 strongest: e.g. a live payment-recovery agent on Razorpay webhooks, an open-source fix in LiteLLM]. I can commit 3–4 months full-time in Gurugram and want to convert.

Would love 20 minutes to walk you through it.

Shraman Hazra
[phone] · hazrashraman2002@gmail.com · [LinkedIn]

---

## 3. Short versions

**LinkedIn DM / connection note (≤300 chars):**
> Hi [Name], applying for CashKaro's AI-First PM Intern role. 54% of negative CashKaro Play Store reviews are about missing/pending/cancelled cashback, so I wrote a PRD and built a working fix: https://trackback-rosy.vercel.app. Would value 15 min of your feedback.

**Form field "Why you?" (≈100 words):**
> I come from engineering and I'm moving into product, which is who this role is written for. Instead of describing that, I built it for a CashKaro problem: analysed 6,000 Play Store reviews, found 54% of negative ones trace to the missing-cashback loop, wrote a PRD with RICE, metrics and an experiment plan, and shipped a working MVP with Claude (claim copilot, wallet explainer, ops console) plus an eval suite. It uses AI where it beats code (messy Hinglish screenshots) and keeps money decisions deterministic. Link: https://trackback-rosy.vercel.app.

---

## 4. Resume bullets

Put TrackBack at the top of Projects.

**TrackBack — missing-cashback resolver (PRD + MVP)** · https://trackback-rosy.vercel.app
- Scraped and theme-coded 6,000 CashKaro Play Store reviews (Python); found 54% of negative reviews trace to the cashback claim lifecycle, and used that to scope the product
- Wrote the PRD: root-cause analysis of affiliate attribution failures, RICE prioritisation, decision spec, north-star and guardrail metrics, A/B design, 30-day validation plan
- Built a Next.js/TypeScript MVP with Claude (structured outputs + vision) for order extraction from screenshots/SMS/Hinglish, and a deterministic rules engine for eligibility across 16 rules
- Designed an eval harness: 400 planted scenarios + 16 boundary cases, 0 false auto-files; an LLM-rewrite guardrail that rejects invented numbers; 95% of simulated claims settled without an agent

Map your other work to the JD's four ingredients (pick 2–3; keep one line each):

| JD ingredient | Your proof |
|---|---|
| Product ownership | JanReport Bengal: live civic data product; scoped features, declined politician-scoring requests on principle |
| Full-stack fluency | Razorpay payment agent: real webhooks with HMAC verification, idempotency, deployed backend + landing page |
| AI-native building | Atlys voice agent / Peakflo collections agent: streaming LLM pipelines with eval harnesses (8/10 → 10/10) |
| Prototype to production | Frameup (live on Vercel), Katha Studio (live, 55 tests); LiteLLM open-source PR with CI green |

---

## 5. 90-second demo script (Loom)

1. **(0–10 s) Landing page.** "More than half of CashKaro's negative reviews are one loop: didn't track, ticket, 8–10 days, cancelled with no reason. I built the fix."
2. **(10–35 s) /claim → "Amazon order never tracked".** "Priya shares her order email. It's matched to her visit 24 minutes before the order, and the claim is filed with everything the network needs. No screenshots, no ticket." Point at the check list on the right.
3. **(35–50 s) "Myntra + outside coupon".** "A 'no' arrives instantly, with the exact rule and what to do next time." Toggle **Hinglish**.
4. **(50–60 s) "₹63k phone".** "Needs the invoice." Click attach: now auto-filed. "It asks for exactly one thing."
5. **(60–75 s) /wallet.** "Pending for 74 days, the date moved: here's why, and it never moves silently again."
6. **(75–90 s) /ops → /impact.** "Agents only see claims that need judgment. 95% settle without a person. Zero false auto-files in 400 test scenarios. AI reads and words; rules decide the money."

---

## 6. Interview prep

### Questions they'll likely ask

**"Walk me through how you picked this problem."**
Started from the business model: CashKaro earns affiliate commission and passes on cashback, so trust in the payout *is* the product. Reviews are the cheapest large-scale user research, so I pulled 6,000 and coded them. Lifecycle complaints were 54% of negative ones and steady month on month, not a spike. Then I asked *why* cashback goes missing and found it's mostly attribution mechanics the user can't see.

**"How would you know it's working?"**
North star: % of missing-cashback cases resolved with no ticket. User outcome: time to a definitive answer. Guardrails: network rejection rate on auto-filed claims must not rise, and the dispute rate on "not eligible" stays under 5%. User-level A/B, stratified by store; ~400 users per arm detects a 10-point drop in ticket rate. The constraint is the ~40-day wait for network outcomes, not sample size.

**"Why not let the LLM decide eligibility?"**
It's money. A decision has to be reproducible, explainable to a store's affiliate team, and testable at boundaries (24.0 h vs 24.1 h). An LLM adds variance with no upside there. Where it wins is messy input, so that's where I use it, and I check what it produces.

**"What would you do first if you joined?"**
Backtest. My eval proves the rules match my spec, not that the spec matches real network outcomes. Week 1: run the engine on 3 months of tickets with real outcomes, talk to 10 users and 5 agents. Then shadow mode, then ship the wallet explainer first. It has the highest RICE and no network dependency.

**"What's the biggest risk?"**
Flooding networks with claims and hurting partner relationships, plus fraud. Mitigations: only well-formed claims get filed (fewer than today's manual forwards), per-store caps, the visit log is the source of truth rather than screenshots, high value goes to humans, and there's a rejection-rate guardrail with auto-pause.

**"Tell me about a time AI got something wrong while you built this."**
The order-ID regex matched "Order Confirmation" as an ID, and a test assumed the wrong category rate for a pressure cooker. Both caught by review and tests. Also, the rule parser failed on Hinglish and SMS, which is exactly why extraction uses Claude with a fallback rather than regex alone.

**"What would you cut to ship in 2 weeks?"**
Auto-filing, because it depends on network agreements. Ship the wallet explainer plus the day-4 "not tracked yet" nudge with auto re-check. Those need only data CashKaro already has.

**Know your CashKaro facts** (from the JD): India's largest cashback app; ₹10,000 Cr GMV, ₹600 Cr revenue in FY26 (+70%), ₹250 Cr raised; founded 2013 by Swati and Rohan Bhargava; sister platforms EarnKaro (affiliate for creators, 80% of affiliate traffic on Telegram) and BankKaro (financial products).

### Questions to ask them
1. Which networks accept programmatic missing-claim submissions today, and what's the SLA?
2. What share of missing-cashback tickets end in the user's favour?
3. How does the team decide between fixing attribution with stores vs. explaining it to users?
4. What does a great first 90 days look like for this intern, and what did the last conversion do differently?
5. How is AI prototyping used in the product team today? Do PMs ship to production?
