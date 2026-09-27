# PRD: TrackBack — resolve missing, pending and cancelled cashback in seconds

**Author:** Shraman Hazra · **Status:** Prototype built, ready for validation · **Last updated:** 27 Sep 2026
**Links:** [Working demo](https://trackback-rosy.vercel.app/claim) · [Wallet explainer](https://trackback-rosy.vercel.app/wallet) · [Ops console](https://trackback-rosy.vercel.app/ops) · [Impact & eval](https://trackback-rosy.vercel.app/impact) · [Source](https://github.com/Shraman123/TrackBack)

> Unofficial concept. I don't have CashKaro's internal data. Every number below is either from public Play Store reviews (sourced, reproducible) or an explicitly labelled assumption that I'd replace with real data in week one.

---

## 1. TL;DR

When cashback doesn't track, users raise a ticket, wait 8–10 days, get asked for screenshots, and often end up with a cancellation that has no explanation. That loop generates **54% of all negative CashKaro reviews** in the last nine months (344 of 633 substantive 1–3★ reviews).

TrackBack replaces the loop with three things:

1. **Claim copilot (user):** share an order screenshot or email → Claude reads it → a rules engine checks it against the visit log and store rules → the user gets a definitive answer in seconds: *filed for you*, *wait, we'll re-check automatically*, *add one thing*, or *no, and here's the exact rule*.
2. **Wallet explainer (user):** every pending or cancelled cashback shows which step it's at, what the store is waiting for, and what happens next. Dates never move silently.
3. **Ops console (internal):** agents only see claims that need judgment (high value or risk), with evidence and a drafted reply already there. Reason codes roll up into a list of product fixes that would stop claims happening at all.

In a 1,000-claim simulation, **95% of claims are settled without a person**, and there are **0 false auto-files** across a 400-scenario test suite.

---

## 2. Problem

### 2.1 Evidence

I pulled the 6,000 most recent CashKaro Play Store reviews (India, English, 17 Dec 2025 – 26 Sep 2026) and keyword-coded the 633 negative reviews with real text into themes (multi-label, Hinglish variants included; hand-checked precision 37/40). Code: `research/themes.py`.

| Theme | Share of negative reviews |
|---|---|
| Cancelled / rejected cashback | 24% |
| Stuck in pending / confirmation date moved | 21% |
| Cashback never received | 16% |
| No reason given / support unhelpful | 14% |
| Order didn't track, had to raise a ticket | 11% |
| Surprise T&C / not eligible | 5% |
| Amount lower than promised | 4% |

**Any claim-lifecycle theme: 54%.** Negative volume is steady at 50–90 a month, while total reviews grew 5× from June to August 2026. This is structural, not a spike. CashKaro replies to 97% of negative reviews, so the team clearly cares; the gap is in the product loop, not in effort.

What users say, paraphrased:
- "Amazon orders don't track automatically. Every time I raise a ticket, and even with the invoice it takes 8–10 days. By then the return window is over."
- "The confirmation date keeps getting extended by 10 days, then it gets cancelled."
- "Whenever the cashback is high, they cancel it with a vague reason."
- "I ordered multiple items in one go and only one tracked."

### 2.2 Why it happens (root causes)

Most "missing" cashback isn't a bug. It's attribution mechanics the user can't see:

| Mechanic | What the user experiences |
|---|---|
| Store only credits orders within N hours of the visit | "I came through the app yesterday and it didn't track" |
| Store app was already open, so the handoff dropped | "Tracked on web, never in app" |
| Another site or coupon extension was visited after us (last-click wins) | "Cancelled: not attributed to CashKaro" |
| Items were in the cart before the visit | "Cancelled: product was already in cart" |
| Outside coupon used at a store that voids cashback on them | "Cancelled with a vague reason" |
| Store credits only the first item of a cart | "Only one item tracked" |
| Store's final report arrives after the return window plus a validation lag | "Pending for 2 months, date keeps moving" |
| Store rejects without a reason code | "Rejected, no explanation" |

**Insight:** users experience all of these as one thing, "CashKaro didn't pay me", because the product never tells them which one it is. The cost is trust, which is the entire product for a cashback app.

### 2.3 Who's affected

- **Priya, regular shopper (Gurugram, 2.5 years on the app).** Buys fashion and electronics monthly. Won't chase ₹150 through a ticket; quietly stops using the app instead.
- **Rahul, big-ticket buyer (Lucknow).** Plans a ₹90k TV purchase around cashback. A silent cancellation turns him into a 1★ review and tells five friends.
- **Support agent.** Spends most of each ticket asking for screenshots and forwarding claims to networks; can't see why the network said no.
- **Partnerships / category manager.** Can't see which stores' rules generate the most failed claims, so can't negotiate or communicate them.

---

## 3. Goals and non-goals

**Goals**
1. Give every "didn't track" a definitive, explained answer in under a minute for ≥90% of cases.
2. Remove the ticket for every claim where the rules already decide the outcome.
3. Make every pending/cancelled state self-explaining: reason + next step + date.
4. Turn claim data into product fixes that prevent claims (nudges, store-page rules).

**Non-goals (v1)**
- Changing any store's attribution rules or payout terms.
- Using AI to decide eligibility or amounts. Money decisions stay deterministic.
- Credit card / loan (BankKaro) rewards: a different lifecycle; separate PRD.
- The "amount lower than promised" problem (4%): needs a promised-amount lock at click time; next PRD.

---

## 4. Solution

### 4.1 Principles

1. **AI reads, rules decide, AI words.** Claude extracts order fields from messy screenshots, forwarded emails, SMS and Hinglish messages, and may rephrase messages. Eligibility and amounts come from a deterministic engine that's testable and explainable to a store.
2. **Every "no" names the rule and has a human route.** No dead ends.
3. **Don't make a user wait for a "no".** Rule checks run before the 72-hour tracking-delay check.
4. **Dates never move silently.** A moved date always comes with the reason.
5. **Assemble evidence once.** The claim sent to the network carries the click ID, timestamps and eligible value, so it doesn't bounce back asking for screenshots.

### 4.2 Claim flow

```
Order screenshot / email / SMS
      │  Claude (structured output) — or rule-based parser as fallback
      ▼
Extracted fields ── sanity checks (order-ID format per store, items vs total, date range)
      │  user confirms / edits
      ▼
Rules engine (visit log + wallet + store rules + user history)
      │
      ├─ AUTO_FILE       → pre-filled claim sent to the affiliate network
      ├─ WAIT            → auto re-check when the tracking delay ends; user does nothing
      ├─ NEEDS_INFO      → ask for exactly one thing (e.g. the invoice)
      ├─ NOT_ELIGIBLE    → the exact rule, in plain language, + what to do next time
      ├─ HUMAN_REVIEW    → ops queue with evidence + drafted reply
      └─ ALREADY_TRACKED → open the wallet explainer for that order
      ▼
Message: approved template (EN / Hinglish) — optionally reworded by Claude,
         rejected if it introduces any number/date/amount not in the template
```

### 4.3 Decision spec

Checks run in this order; the first failing hard rule decides.

| # | Check | Fails → | Rationale |
|---|---|---|---|
| 1 | Store, order ID, date, amount, items present | NEEDS_INFO | Ask for one thing, not a form |
| 2 | Order not already in wallet | ALREADY_TRACKED | Duplicate tickets are pure waste |
| 3 | Raised within store's claim window (10–15 days) | NOT_ELIGIBLE | Network won't accept later |
| 4 | Visit through us before the order, within the store's attribution window | NOT_ELIGIBLE | Core attribution rule |
| 5 | Order not cancelled/returned (exchange per store rule) | NOT_ELIGIBLE | No sale, no commission |
| 6 | At least one item in an eligible category | NOT_ELIGIBLE | Store-level exclusions |
| 7 | No outside coupon at stores that void on them | NOT_ELIGIBLE | Store-level rule |
| 8 | Store's tracking delay (48–72 h) has passed | WAIT | It may still track by itself |
| 9 | Invoice attached if order ≥ ₹5,000 | NEEDS_INFO | Networks reject large claims without one |
| 10 | Cashback ≤ ₹1,000 and no risk signal | HUMAN_REVIEW | Protect money and the network relationship |
| — | All pass | AUTO_FILE | |

Risk signals: account flagged by trust & safety; <30% approval on ≥8 past claims; account <14 days old claiming >₹300. Thresholds live in one `POLICY` object so ops can tune them from override data.

Store rules (windows, lags, exclusions, coupon policy, multi-item tracking, caps) are config per store, owned by partnerships, not code.

### 4.4 Wallet explainer

For each wallet entry: a 4-step timeline (tracked → return window closes → store's final report → ready/cancelled), a one-sentence **why**, and a **what next**. Store cancellation codes map to plain language plus an appeal button where an appeal can succeed (returned-but-kept, cancelled-but-delivered, rejected-without-reason). Overdue entries escalate to the network automatically, then to a person after 7 days.

### 4.5 Ops console

- Queue shows only HUMAN_REVIEW by default; everything else is visible but settled.
- Each claim has the check list, the prepared network payload, and a drafted reply. Actions: approve & file, ask for proof, reject with a mandatory reason the customer sees.
- **Override log:** every reviewer disagreement with the engine is recorded with the reason and reviewed weekly to tune thresholds.
- **Preventable claims:** reason codes ranked by volume, each mapped to the product change that would stop it.

---

## 5. User stories and acceptance criteria

| # | Story | Acceptance criteria |
|---|---|---|
| U1 | As a shopper whose order didn't track, I want to share my order confirmation and get an answer immediately | Screenshot/email/SMS accepted; fields shown for confirmation; decision in <10 s p95; message in EN or Hinglish |
| U2 | As a shopper, if my claim is valid I don't want to send anything else | AUTO_FILE sends click ID, timestamps, eligible value; user sees expected cashback, store answer date and confirm date |
| U3 | As a shopper who claims too early, I don't want to come back later | WAIT schedules a re-check at order + tracking delay and files automatically if still untracked |
| U4 | As a shopper whose claim isn't eligible, I want the specific reason and what to do next time | Message names the rule with the numbers (e.g. "visit was 31 h before; Flipkart credits 24 h"); link to a person |
| U5 | As a shopper with pending cashback, I want to know why and when | Timeline + why + next; moved date shows old and new dates and reason |
| U6 | As a support agent, I only want claims that need judgment | Default queue = HUMAN_REVIEW; evidence and draft reply present; one-click actions |
| U7 | As an ops lead, I want to tune rules from evidence | Overrides logged with reason; thresholds configurable |
| U8 | As a PM, I want to prevent claims, not just process them | Reason-code volume dashboard mapped to product fixes |

---

## 6. Prioritisation

RICE on the candidate solutions. Reach is per quarter, relative and illustrative; I'd re-score with real funnel data.

| Candidate | Reach | Impact | Confidence | Effort (pw) | Score | Call |
|---|---|---|---|---|---|---|
| Wallet explainer (reason + next step + date) | 600k | 1 | 80% | 3 | 160k | **Ship first**: no network dependency, broadest reach |
| Day-4 "your order hasn't tracked" nudge + auto re-check | 150k | 1 | 60% | 1 | 90k | Ship with the explainer |
| Claim copilot with auto-file | 150k | 2 | 70% | 6 | 35k | **Core bet**: needs network claim API / bulk-upload agreement |
| "Your visit expires in 3 h" nudge | 300k | 0.5 | 50% | 2 | 37.5k | After data shows CLICK_OUTSIDE_WINDOW volume |
| Promised-amount lock at click time | 50k | 1 | 50% | 4 | 6k | Separate PRD |

**Sequencing:** explainer + re-check first (weeks 1–4), then copilot for Amazon and Flipkart (largest claim volume), then the long tail of stores. The prototype builds all three to prove the system works end to end.

---

## 7. Metrics

| Type | Metric | Target |
|---|---|---|
| **North star** | % of missing-cashback cases resolved with no ticket raised | ≥ 70% in 90 days |
| Primary | Median time from "didn't track" to definitive answer | < 1 min for ≥ 90% (today 8–10 days per reviews) |
| Primary | Support tickets tagged missing/pending/cancelled per 1,000 orders | −50% |
| Guardrail | Network rejection rate on auto-filed claims | ≤ manual baseline |
| Guardrail | Dispute/reopen rate on NOT_ELIGIBLE | ≤ 5% |
| Guardrail | False auto-files found in audit (weekly 1% sample) | 0 tolerance; any → pause auto-file for that store |
| Lagging | 1–2★ reviews mentioning lifecycle themes per 1,000 reviews | −40% in 2 quarters |
| Lagging | 30-day repeat purchase through app after a claim | + vs control |

### Experiment design
- **Unit:** user, randomised 50/50 at the first missing-cashback entry point, stratified by store (Amazon, Flipkart, others).
- **Primary metric:** ticket raised within 14 days (binary). With a ~60% baseline ticket rate, detecting a 10-point drop at 80% power needs ~400 users per arm. Easy at CashKaro scale; the constraint is waiting for network outcomes (~40 days) for the guardrail.
- **Kill / pause criteria:** auto-filed rejection rate > baseline + 5 pts for any store, or any confirmed false auto-file above ₹500.

---

## 8. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Wrong "no" destroys trust | Every no names a rule + human route; dispute rate is a guardrail; boundary cases in the test suite |
| Fraud: fabricated screenshots | Visit log is the source of truth, not the screenshot; risk signals route to humans; invoice above ₹5k; network is the final validator |
| Flooding networks with claims hurts the relationship | Only well-formed claims are filed (fewer than today's manual forwards); per-store daily cap; rejection-rate guardrail |
| LLM misreads a field | Structured output, per-store ID formats, items-vs-total check, user confirms fields; AI never sets eligibility or amount |
| LLM rewrite changes a number | Guardrail rejects any rewrite with a number not in the approved template; falls back to template |
| Store rules change silently | Rules as config owned by partnerships; alert when a store's auto-file rejection rate drifts |
| API outage / cost | Rule-based parser fallback (93.6% field accuracy on test set); extraction is a single low-effort call per claim |

---

## 9. Validation plan (first 30 days if I joined)

1. **Week 1 — backtest.** Pull 3 months of historical missing-cashback tickets with their eventual network outcome, plus click logs. Run the engine offline. Report agreement with real outcomes by store and reason, and especially any case the engine would auto-file that the network rejected. This validates the spec, which the current suite (generated from the same spec) can't.
2. **Week 1 — talk to 10 users** who raised a ticket last month and 5 support agents. Test the wallet explainer copy in Hindi and English.
3. **Weeks 2–3 — shadow mode.** Engine runs on live claims; agents see its suggestion but act as today. Measure agreement and time saved.
4. **Week 4 — ship the wallet explainer + auto re-check** to 10% of users (no network dependency).
5. **Weeks 5–8 — auto-file pilot** on Amazon for 10% → 50%, gated on the guardrails.

---

## 10. Open questions for the CashKaro team

1. Which affiliate networks accept programmatic missing-claim submission vs. manual upload, and what are their response SLAs?
2. What share of today's tickets are resolved in the user's favour? (Sets the baseline for the rejection guardrail.)
3. Do we receive cancellation reason codes from networks, and how granular are they?
4. Is the click log joinable to orders at sub-ID level for all major stores?
5. Who owns store rules today: partnerships, ops, or engineering?

---

## 11. What's built vs. what's mocked

| Piece | Status |
|---|---|
| Review scrape + theme coding | **Real.** 6,000 reviews, reproducible scripts |
| Rules engine, status explainer, messages (EN + Hinglish) | **Built.** Unit-tested; 400-scenario suite + 16 boundary cases |
| Claude extraction (text + screenshot) + guarded rewrite | **Built.** Runs when `ANTHROPIC_API_KEY` is set; parser fallback otherwise |
| Visit logs, wallet, users, store rules | **Mocked.** Illustrative data shaped like real affiliate programs |
| Network claim submission | **Mocked.** Payload is built; no network is called |
| Ops console actions, override log | **Built in-session** (no persistence in the demo) |
| Impact numbers | **Simulated** on an assumed claim mix, stated in the code |
