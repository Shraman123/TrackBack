import { readFileSync } from "node:fs";
import path from "node:path";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const metadata = { title: "PRD — TrackBack" };

export default function PrdPage() {
  // Read at build time; the page is static.
  const md = readFileSync(path.join(process.cwd(), "docs", "PRD.md"), "utf8");
  return (
    <article className="prose-prd mx-auto max-w-3xl px-4 pt-10">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children }) => <pre className="text-xs bg-sunk rounded-xl p-4 overflow-x-auto text-ink my-4">{children}</pre>,
        }}
      >
        {md}
      </Markdown>
    </article>
  );
}
