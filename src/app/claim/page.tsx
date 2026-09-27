import { SAMPLES, USERS } from "@/lib/data/seed";
import { llmEnabled, MODEL } from "@/lib/llm/claude";
import { ClaimDemo } from "./ClaimDemo";

export const metadata = { title: "Claim demo — TrackBack" };

export default function ClaimPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10">
      <div className="kicker mb-2">Working prototype</div>
      <h1 className="display text-4xl md:text-5xl text-ink max-w-3xl">
        &ldquo;My cashback didn&rsquo;t track.&rdquo; Answered in seconds, not 8–10 days.
      </h1>
      <p className="mt-4 text-ink-2 max-w-3xl">
        Pick a real-world scenario (each one answers a complaint from the Play Store), paste your own order email,
        or drop a screenshot. The left side is what a user sees; the right side shows every check the engine ran and
        what would be sent to the store&rsquo;s affiliate network.
      </p>
      <ClaimDemo
        samples={SAMPLES.map(({ id, userId, title, expect, review, email, hasInvoice }) => ({ id, userId, title, expect, review, email, hasInvoice }))}
        users={USERS}
        llm={llmEnabled()}
        model={MODEL}
      />
    </div>
  );
}
