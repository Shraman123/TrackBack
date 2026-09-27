import { claimFromOrder, demoContext } from "@/lib/data/context";
import { USERS } from "@/lib/data/seed";
import { evaluateClaim } from "@/lib/engine/evaluate";
import { templateMessage, type Lang } from "@/lib/engine/messages";
import { addHours, DEMO_NOW } from "@/lib/engine/time";
import { llmEnabled, rewriteWithClaude, type RewriteResult } from "@/lib/llm/claude";
import type { ClaimedOrder, Click } from "@/lib/types";

interface Body {
  userId: string;
  order: ClaimedOrder;
  lang?: Lang;
  polish?: boolean;
  /** Sandbox only: pretend the user came through us this many minutes before ordering. */
  sandboxClickMinutesBefore?: number;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.order || !USERS.some((u) => u.id === body.userId)) {
    return Response.json({ error: "Need a known userId and an order." }, { status: 400 });
  }
  const lang: Lang = body.lang === "hi" ? "hi" : "en";

  const extraClicks: Click[] = [];
  if (
    typeof body.sandboxClickMinutesBefore === "number" &&
    body.order.retailerId &&
    body.order.placedAt
  ) {
    extraClicks.push({
      id: "clk_sandbox",
      userId: body.userId,
      retailerId: body.order.retailerId,
      at: addHours(body.order.placedAt, -body.sandboxClickMinutesBefore / 60),
      surface: "app",
    });
  }

  const claim = claimFromOrder(body.userId, body.order, "form");
  const decision = evaluateClaim(claim, demoContext(body.userId, extraClicks));
  const draft = templateMessage(decision, lang);

  let message: RewriteResult = { ...draft, source: "template" };
  if (body.polish && llmEnabled()) {
    try {
      message = await rewriteWithClaude(decision, draft, lang);
    } catch {
      message = { ...draft, source: "template", blocked: "Claude unavailable" };
    }
  }

  return Response.json({ decision, message, now: DEMO_NOW });
}
