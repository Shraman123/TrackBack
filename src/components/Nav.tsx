"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/", label: "Case study" },
  { href: "/claim", label: "Claim demo" },
  { href: "/wallet", label: "Wallet" },
  { href: "/ops", label: "Ops console" },
  { href: "/impact", label: "Impact & eval" },
  { href: "/prd", label: "PRD" },
];

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 font-semibold tracking-tight text-ink">
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
        <rect width="24" height="24" rx="6" fill="var(--brand)" />
        <path d="M7 12.5l3 3 7-7" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      TrackBack
    </span>
  );
}

export function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <Link href="/" onClick={() => setOpen(false)}>
          <Logo />
        </Link>
        <nav className="hidden md:flex items-center gap-1 text-sm">
          {LINKS.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded-full transition ${active ? "bg-ink text-paper" : "text-ink-2 hover:text-ink hover:bg-sunk"}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <button
          className="md:hidden text-sm px-3 py-1.5 rounded-full border border-line"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          Menu
        </button>
      </div>
      {open && (
        <nav className="md:hidden border-t border-line px-4 py-2 flex flex-col text-sm">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="py-2 text-ink-2">
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
