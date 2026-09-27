# TrackBack

**Missing cashback, resolved in seconds.** A product case study and working MVP: an AI-assisted resolver for missing, pending and cancelled cashback, built from an analysis of 6,000 cashback-app reviews.

> Independent concept, not affiliated with CashKaro. Store rules, users and volumes are illustrative; review data is public Play Store content.

**Live:** [https://trackback-rosy.vercel.app](https://trackback-rosy.vercel.app) · **PRD:** [`docs/PRD.md`](docs/PRD.md) · **Eval report:** [`eval/REPORT.md`](eval/REPORT.md)

---

## The problem, in one number

**54%** of substantive negative reviews (344 of 633, Dec 2025 – Sep 2026) are about the cashback claim lifecycle: the order didn't track, cashback stuck in pending, cancelled with no reason, or never received. Users describe raising a ticket, waiting 8–10 days, and being asked for screenshots. Scripts in [`research/`](research).

## What it does

| Surface | What it shows |
|---|---|
| `/claim` — claim copilot | Paste an order email/SMS or drop a screenshot. Claude extracts the fields, a rules engine checks them against the visit log and store rules, and the user gets **auto-filed / wait (auto re-check) / needs one detail / not eligible (exact rule) / human review / already tracked**, in English or Hinglish. The "under the hood" panel shows every check and the claim payload for the affiliate network. |
| `/wallet` — wallet explainer | Every pending/cancelled cashback gets a timeline, a one-sentence *why*, a *what next*, and an appeal where an appeal can work. Moved dates are always explained. |
| `/ops` — ops console | Agents see only claims needing judgment, with evidence and a drafted reply. Overrides are logged. Reason codes roll up into the product fixes that would prevent claims. |
| `/impact` — impact & eval | Review themes, a 1,000-claim simulation, an editable impact model, the engine's test results and parser-vs-Claude extraction scores. |
| `/prd` | The full PRD: root causes, RICE, decision spec, metrics, experiment design, 30-day validation plan. |

## Design principle: AI reads, rules decide, AI words

```
screenshot / email / SMS ──► Claude (structured output) ─┐
                            rule parser (fallback) ───────┤
                                                          ▼
                              sanity checks → user confirms fields
                                                          ▼
          rules engine (visit log · wallet · store rules · user history)
                                                          ▼
      verdict + checks + network payload + template message (EN/Hinglish)
                                                          ▼
          optional Claude rewrite ── guardrail: no new numbers/dates ──► user
```

- **Claude** is used where it clearly beats code: messy, multilingual input (the rule parser gets 84.6% of documents fully right and fails on Hinglish chat and SMS). Output is schema-constrained and sanity-checked.
- **Eligibility and amounts are deterministic.** They're auditable, testable, and explainable to a store's affiliate team.
- **Rewrites are guarded:** any rewrite introducing a number, date or amount not in the approved template is rejected and the template is used.

## Evaluation

`npm run eval` (deterministic):

- **400 planted scenarios** (16 rules × 25), 180 with noise that must not change the verdict → 100% verdict accuracy, **0 false auto-files**
- **16 hand-written boundary cases** (24.0 h vs 24.1 h, ₹4,999 vs ₹5,000, excluded item first in a one-item-credit cart, …) → 16/16
- **Extraction** on 13 documents (9 clean, 4 messy) → parser 84.6% all-fields / 93.6% field accuracy; `npm run eval -- --claude` scores Claude
- **Impact stream** of 1,000 claims at an assumed mix → 95% settled without a person

Caveat, stated in the report: the suite is generated from the same spec the engine implements, so it proves *the rules do what the spec says*, not *the spec matches real network outcomes*. That needs a backtest on historical claims (PRD §9).

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # unit tests
npm run eval         # regenerates eval/REPORT.md and the /impact numbers
```

Optional: set `ANTHROPIC_API_KEY` (and `CLAUDE_MODEL`, default `claude-opus-5`) to enable screenshot reading and Claude message rewrites. Without it, everything else works on the rule-based parser and templates.

## Layout

```
research/            review scrape + theme coding (Python)
docs/PRD.md          the PRD
src/lib/engine/      rules engine, status explainer, messages (EN + Hinglish)
src/lib/llm/         Claude extraction + guarded rewrite
src/lib/extract/     rule-based parser + field sanity checks
src/lib/sim/         scenario generator, edge cases, extraction gold set
src/app/             pages + /api/extract, /api/decide
eval/                eval runner + report
```

## What's real vs mocked

| Real | Mocked |
|---|---|
| Review data and analysis, rules engine, explainer, messages, Claude integration, eval | Visit logs, wallets, users, store rules (illustrative), network submission (payload built, not sent), ops persistence |

Built by Shraman Hazra with Claude Code.
