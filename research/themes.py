"""Keyword-code negative CashKaro reviews (1-3 stars) into complaint themes.

Rule-based on purpose: transparent and reproducible, so every number in the PRD
can be re-derived. Handles common Hinglish phrasings. Multi-label.
"""
import json, re, collections

THEMES = {
    "not_tracked": r"not (get )?track|didn'?t track|doesn'?t track|not tracked|no track|untrack|tracking|missing (cashback|ticket|claim|request)|raise (a )?(missing|ticket|request)|track nahi|track nhi",
    "cancelled_rejected": r"cancel|reject|declin|not attributed|revers|deni|cencel|kat (diya|liya)",
    "stuck_pending": r"pending|delay|still waiting|months?\b|\d+\s*days|extend|postpone|confirmation date|not confirmed|hold",
    "not_received": r"no cash ?back|not (get|got|receiv)|didn'?t (get|receive)|haven'?t (got|received)|don'?t give|doesn'?t give|not paying|taken back|nahi (milta|mila|deta|diya)|nhi (milta|mila|deta)|not giv",
    "eligibility_tnc": r"not eligible|eligib|terms|t&c|t & c|condition|excluded|not applicable",
    "amount_mismatch": r"less(er)? (than|cashback|amount)|lower|different amount|half|reduced|only ₹|only rs|mismatch|not as promised|promised",
    "no_explanation": r"no (clear )?(reason|explanation)|without (any )?(specific |clear )?(reason|explanation)|vague|excuse|no response|no reply|not respond|support|customer care|ticket",
    "account_blocked": r"block|suspend|ban(ned)?\b|deactivat",
    "withdrawal_payout": r"withdraw|payout|transfer to (my )?bank|redeem|payment not",
    "app_bug": r"not open|crash|browser|chrome|login|otp|slow|bug|glitch",
    "fin_products": r"credit card|loan|\bfd\b|cibil|bankkaro",
}

def code(text):
    t = text.lower()
    return [k for k, p in THEMES.items() if re.search(p, t)]

if __name__ == "__main__":
    rows = json.load(open("reviews_raw.json", encoding="utf-8"))
    neg = [r for r in rows if r["score"] <= 3 and len(r["text"]) >= 25]
    counts, pair = collections.Counter(), collections.Counter()
    coded = []
    for r in neg:
        th = code(r["text"])
        counts.update(th)
        if {"not_tracked", "cancelled_rejected", "stuck_pending", "not_received"} & set(th):
            pair["any_claim_lifecycle"] += 1
        if th and "no_explanation" in th and ("cancelled_rejected" in th or "not_tracked" in th):
            pair["lifecycle+no_explanation"] += 1
        coded.append({**r, "themes": th})
    months = collections.Counter(r["at"][:7] for r in rows)
    neg_m = collections.Counter(r["at"][:7] for r in neg)
    life_m = collections.Counter(c["at"][:7] for c in coded
                                 if {"not_tracked", "cancelled_rejected", "stuck_pending", "not_received"} & set(c["themes"]))
    summary = {
        "total_reviews": len(rows),
        "window": [min(r["at"] for r in rows)[:10], max(r["at"] for r in rows)[:10]],
        "rating_dist": dict(collections.Counter(r["score"] for r in rows)),
        "negative_n": len(neg),
        "theme_counts": dict(counts.most_common()),
        "theme_share": {k: round(v / len(neg), 3) for k, v in counts.most_common()},
        "uncoded": sum(1 for c in coded if not c["themes"]),
        **{k: v for k, v in pair.items()},
        "by_month": {m: {"all": months[m], "neg": neg_m[m], "lifecycle": life_m[m]} for m in sorted(months)},
        "dev_reply_rate_neg": round(sum(r["reply"] for r in neg) / len(neg), 3),
    }
    json.dump(summary, open("theme_summary.json", "w"), indent=2)
    json.dump(coded, open("reviews_coded.json", "w", encoding="utf-8"), ensure_ascii=False)
    print(json.dumps(summary, indent=2))
