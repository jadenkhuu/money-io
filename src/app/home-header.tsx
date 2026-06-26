"use client";

import { useEffect, useState } from "react";

// Greeting strip between the coin and the widgets. The date/time is live, so it
// renders client-side (set on mount, updated each minute) to avoid a stale
// server timestamp and hydration mismatch. The `+` is the affordance for adding
// widgets — non-functional for now; a handler drops in when that flow exists.
export function HomeHeader() {
  const [stamp, setStamp] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const date = now.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
      const time = now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setStamp(`${date} · ${time}`);
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mt-8 -mx-5 flex items-center justify-between border-y border-app-border px-5 py-3">
      {stamp && (
        <span className="font-mono text-xs text-foreground/45">{stamp}</span>
      )}
      <button
        type="button"
        aria-label="Manage widgets"
        className="flex h-8 w-8 items-center justify-center text-foreground/70"
      >
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden="true">
          <line x1="0" y1="1" x2="16" y2="1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="0" y1="6" x2="16" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="0" y1="11" x2="16" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
