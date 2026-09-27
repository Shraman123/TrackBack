"""Pull recent CashKaro Play Store reviews (India, English) for problem sizing."""
import json
from google_play_scraper import reviews, Sort

out = []
token = None
while len(out) < 6000:
    batch, token = reviews("com.cashkaro", lang="en", country="in",
                           sort=Sort.NEWEST, count=200, continuation_token=token)
    if not batch:
        break
    out.extend(batch)
    if token is None:
        break

rows = [{"id": r["reviewId"], "score": r["score"], "text": r["content"] or "",
         "at": r["at"].isoformat(), "thumbs": r["thumbsUpCount"],
         "reply": bool(r.get("replyContent")), "version": r.get("reviewCreatedVersion")}
        for r in out]
with open("reviews_raw.json", "w", encoding="utf-8") as f:
    json.dump(rows, f, ensure_ascii=False)
print(len(rows), rows[-1]["at"], rows[0]["at"])
