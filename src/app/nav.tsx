"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Persistent bottom tab bar + the `+` entry sheet. Tabs are real routes so the
// app stays navigable as an installed PWA (no browser back chrome to rely on).
// `+` is an action, not a route: it opens a sheet over the current tab so the
// tab's context stays mounted behind it.

const TABS = [
  { href: "/", label: "Home" },
  { href: "/activity", label: "Activity" },
  { href: "/owed", label: "Owed" },
  { href: "/more", label: "More" },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

// Routes that own the full screen — no app chrome (e.g. auth, before sign-in).
const CHROMELESS = ["/login", "/signup"];

export function AppNav() {
  const pathname = usePathname();
  const [entryOpen, setEntryOpen] = useState(false);

  if (CHROMELESS.some((route) => pathname.startsWith(route))) return null;

  return (
    <>
      <nav
        className="z-40 grid grid-cols-5 border-t border-foreground/10 bg-app-surface"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <TabLink {...TABS[0]} active={isActive(pathname, TABS[0].href)} />
        <TabLink {...TABS[1]} active={isActive(pathname, TABS[1].href)} />
        <button
          type="button"
          onClick={() => setEntryOpen(true)}
          aria-label="New entry"
          className="flex h-14 items-center justify-center text-foreground"
        >
          <span className="text-2xl leading-none">+</span>
        </button>
        <TabLink {...TABS[2]} active={isActive(pathname, TABS[2].href)} />
        <TabLink {...TABS[3]} active={isActive(pathname, TABS[3].href)} />
      </nav>
      {entryOpen && <EntrySheet onClose={() => setEntryOpen(false)} />}
    </>
  );
}

function TabLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex h-14 items-center justify-center text-sm ${
        active ? "font-medium text-foreground" : "text-foreground/45"
      }`}
    >
      {label}
    </Link>
  );
}

function EntrySheet({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" aria-hidden="true" />
      <div className="app-column relative" onClick={(e) => e.stopPropagation()}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label="New entry"
          className="rounded-t-lg border-t border-foreground/10 bg-app-surface px-5 pt-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium">New entry</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center text-foreground/60"
            >
              <span className="text-lg leading-none">×</span>
            </button>
          </div>
          <p className="mt-8 text-sm text-foreground/45">Entry form goes here.</p>
        </div>
      </div>
    </div>
  );
}
