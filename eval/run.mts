/**
 * Offline eval for TrackBack.
 *   npm run eval            -> engine suite, edge cases, parser extraction, impact stream
 *   ANTHROPIC_API_KEY=... npm run eval -- --claude   -> also scores Claude extraction
 *
 * Writes src/lib/sim/evalResults.json (read by the /impact page) and eval/REPORT.md.
 */
import { writeFileSync } from "node:fs";
import { evaluateClaim } from "../src/lib/engine/evaluate.ts";
import { parseOrderText } from "../src/lib/extract/parseText.ts";
import { EDGE_CASES } from "../src/lib/sim/edgeCases.ts";
import { EXTRACTION_CASES, type ExtractionCase } from "../src/lib/sim/extractionSet.ts";
import { ALL_REASONS, ASSUMED_MIX, claimStream, evalSuite, REASON_VERDICT } from "../src/lib/sim/generate.ts";
import type { ClaimedOrder, Verdict } from "../src/lib/types.ts";

const VERDICTS: Verdict[] = ["AUTO_FILE", "WAIT", "NEEDS_INFO", "NOT_ELIGIBLE", "HUMAN_REVIEW", "ALREADY_TRACKED"];

// ---- 1. engine suite ---------------------------------------------------------
const suite = evalSuite(25, 7);
const confusion: Record<string, Record<string, number>> = {};
for (const v of VERDICTS) confusion[v] = Object.fromEntries(VERDICTS.map((p) => [p, 0]));
let verdictOk = 0, reasonOk = 0, falseApprove = 0, missedApprove = 0, noisyN = 0, noisyOk = 0;
const failures: string[] = [];
for (const s of suite) {
  const d = evaluateClaim(s.claim, s.ctx);
  confusion[s.expected][d.verdict]++;
  if (d.verdict === s.expected) verdictOk++;
  else failures.push(`${s.claim.id} planted=${s.label} expected=${s.expected} got=${d.verdict}/${d.reason} noise=[${s.noise.join("; ")}]`);
  if (d.reason === s.label) reasonOk++;
  if (d.verdict === "AUTO_FILE" && s.expected !== "AUTO_FILE") falseApprove++;
  if (s.expected === "AUTO_FILE" && d.verdict !== "AUTO_FILE") missedApprove++;
  if (s.noise.length) { noisyN++; if (d.verdict === s.expected) noisyOk++; }
}

// ---- 2. edge cases -------------------------------------------------------------
const edge = EDGE_CASES.map((c) => {
  const { claim, ctx } = c.make();
  const d = evaluateClaim(claim, ctx);
  return { id: c.id, why: c.why, expected: c.expected, got: d.verdict, reason: d.reason, pass: d.verdict === c.expected };
});

// ---- 3. extraction -------------------------------------------------------------
type FieldScore = { case: string; fields: Record<string, boolean> };
function scoreExtraction(c: ExtractionCase, o: ClaimedOrder | null): FieldScore {
  const g = c.gold;
  return {
    case: c.id,
    fields: {
      store: o?.retailerId === g.retailerId,
      orderId: o?.orderId === g.orderId,
      amount: o?.amount === g.amount,
      items: o?.items.length === g.itemCount,
      status: o?.status === g.status,
      coupon: (o?.couponCode ?? null) === g.couponCode,
    },
  };
}
function summarize(scores: FieldScore[]) {
  const fields = Object.keys(scores[0].fields);
  const perField = Object.fromEntries(fields.map((f) => [f, scores.filter((s) => s.fields[f]).length / scores.length]));
  const allRight = scores.filter((s) => Object.values(s.fields).every(Boolean)).length / scores.length;
  const fieldAcc = scores.reduce((a, s) => a + Object.values(s.fields).filter(Boolean).length, 0) / (scores.length * fields.length);
  return { perField, allRight, fieldAcc, n: scores.length, misses: scores.filter((s) => !Object.values(s.fields).every(Boolean)).map((s) => ({ case: s.case, wrong: Object.entries(s.fields).filter(([, v]) => !v).map(([k]) => k) })) };
}
const parserScores = EXTRACTION_CASES.map((c) => scoreExtraction(c, parseOrderText(c.text)));
const parser = summarize(parserScores);

let claude: (ReturnType<typeof summarize> & { model: string }) | null = null;
if (process.argv.includes("--claude")) {
  const { extractOrderWithClaude, llmEnabled, MODEL } = await import("../src/lib/llm/claude.ts");
  if (!llmEnabled()) {
    console.log("--claude given but ANTHROPIC_API_KEY is not set; skipping Claude extraction.");
  } else {
    console.log(`Scoring Claude extraction with ${MODEL} on ${EXTRACTION_CASES.length} cases...`);
    const scores: FieldScore[] = [];
    for (const c of EXTRACTION_CASES) {
      const o = await extractOrderWithClaude({ kind: "text", text: c.text }).catch(() => null);
      scores.push(scoreExtraction(c, o));
    }
    claude = { ...summarize(scores), model: MODEL };
  }
}

// ---- 4. impact stream ------------------------------------------------------------
const stream = claimStream(1000, 11);
const dist: Record<string, number> = Object.fromEntries(VERDICTS.map((v) => [v, 0]));
const reasons: Record<string, number> = {};
let autoCashback = 0;
for (const s of stream) {
  const d = evaluateClaim(s.claim, s.ctx);
  dist[d.verdict]++;
  reasons[d.reason] = (reasons[d.reason] ?? 0) + 1;
  if (d.verdict === "AUTO_FILE") autoCashback += d.expectedCashback;
}

const results = {
  generatedAt: new Date().toISOString(),
  suite: {
    n: suite.length,
    perReason: 25,
    reasons: ALL_REASONS.length,
    verdictAccuracy: verdictOk / suite.length,
    reasonAccuracy: reasonOk / suite.length,
    falseApprove,
    missedApprove,
    noisy: { n: noisyN, accuracy: noisyN ? noisyOk / noisyN : 1 },
    confusion,
    failures: failures.slice(0, 20),
  },
  edge: { n: edge.length, passed: edge.filter((e) => e.pass).length, cases: edge },
  extraction: { parser, claude },
  impact: { n: stream.length, distribution: dist, reasons, avgAutoCashback: dist.AUTO_FILE ? autoCashback / dist.AUTO_FILE : 0, mix: ASSUMED_MIX },
  reasonVerdict: REASON_VERDICT,
};
writeFileSync("src/lib/sim/evalResults.json", JSON.stringify(results, null, 2));

// ---- report ------------------------------------------------------------------------
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const md = `# TrackBack eval report

_Generated by \`npm run eval\`. Deterministic: same seed, same numbers._

## 1. Decision engine — ${suite.length} planted scenarios (${ALL_REASONS.length} reason codes × 25)

Each scenario starts as a valid claim and breaks exactly one rule. ${noisyN} of them also carry noise
that must **not** change the outcome (visits to other stores, older visits, allowed coupons,
allowed exchanges, one excluded item among eligible ones).

| Metric | Result |
|---|---|
| Verdict accuracy | **${pct(results.suite.verdictAccuracy)}** |
| Reason-code accuracy | ${pct(results.suite.reasonAccuracy)} |
| False auto-files (money sent for a claim that should not be) | **${falseApprove}** |
| Missed auto-files (valid claim pushed to a slower path) | ${missedApprove} |
| Accuracy on noisy scenarios | ${pct(results.suite.noisy.accuracy)} (n=${noisyN}) |

> Read this honestly: scenarios are generated from the same rules the engine implements, so 100% here
> means "the rules do what the spec says and nothing regressed" — not "the rules match CashKaro's
> real network outcomes". That needs a backtest on historical claims (PRD §9).

${failures.length ? "Failures:\n\n" + failures.slice(0, 20).map((f) => "- " + f).join("\n") : "No failures."}

## 2. Edge cases — ${results.edge.passed}/${edge.length} pass

| ID | Case | Expected | Got |
|---|---|---|---|
${edge.map((e) => `| ${e.id} | ${e.why} | ${e.expected} | ${e.pass ? "✅" : "❌"} ${e.got} |`).join("\n")}

## 3. Order extraction — ${EXTRACTION_CASES.length} documents (9 clean emails + 4 messy: forwarded mail, SMS, Hinglish chat, cancellation)

| Extractor | All fields right | Field accuracy |
|---|---|---|
| Rule-based parser (fallback) | ${pct(parser.allRight)} | ${pct(parser.fieldAcc)} |
${claude ? `| Claude (${claude.model}) | ${pct(claude.allRight)} | ${pct(claude.fieldAcc)} |` : "| Claude | _not run — needs ANTHROPIC_API_KEY and `--claude`_ | |"}

Parser misses: ${parser.misses.map((m) => `${m.case} (${m.wrong.join(", ")})`).join("; ") || "none"}
${claude ? `\nClaude misses: ${claude.misses.map((m) => `${m.case} (${m.wrong.join(", ")})`).join("; ") || "none"}` : ""}

## 4. Impact stream — 1,000 claims at the assumed mix

| Verdict | Claims | Share |
|---|---|---|
${VERDICTS.map((v) => `| ${v} | ${dist[v]} | ${pct(dist[v] / stream.length)} |`).join("\n")}

Decided instantly without a human: **${pct((stream.length - dist.HUMAN_REVIEW) / stream.length)}**.
The mix is an assumption (see \`ASSUMED_MIX\` in \`src/lib/sim/generate.ts\`), not CashKaro data.
`;
writeFileSync("eval/REPORT.md", md);
console.log(md);
