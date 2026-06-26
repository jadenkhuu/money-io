"use client";

import { useEffect, useMemo, useState } from "react";
import type { Transaction } from "@/lib/data";
import { CATEGORIES, spendingByCategory, summarize } from "@/lib/data";
import { amount, bar, signed } from "@/lib/format";

// Activity = a pinned summary over a scrolling transaction log. The summary and
// the log both read from the same filtered set, so the ASCII bars at the top
// always describe exactly what's listed below. The summary collapses to a
// single line once you scroll into the log.
//
// Filters are three dropdown buttons: category tags, a month picker, and an
// all / in / out type switch.

type TypeFilter = "all" | "in" | "out";
type Menu = "cat" | "month" | "type" | null;

// Date filter: relative presets, all-time, or a specific calendar month.
type DateFilter =
  | { kind: "week" }
  | { kind: "3mo" }
  | { kind: "all" }
  | { kind: "month"; key: string };

const TYPES: { key: TypeFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "in", label: "In" },
  { key: "out", label: "Out" },
];

function monthLabel(key: string): string {
  return new Date(`${key}-01`).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function dateFilterLabel(df: DateFilter): string {
  switch (df.kind) {
    case "week":
      return "Past week";
    case "3mo":
      return "Past 3 months";
    case "all":
      return "All time";
    case "month":
      return monthLabel(df.key);
  }
}

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function ActivityView({ transactions }: { transactions: Transaction[] }) {
  const [type, setType] = useState<TypeFilter>("all");
  const [cats, setCats] = useState<Set<string>>(new Set());
  const [extraCats, setExtraCats] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>({ kind: "3mo" });
  // The date menu commits only on OK, so its selection is staged here while open.
  const [draftDate, setDraftDate] = useState<DateFilter>({ kind: "3mo" });
  const [menu, setMenu] = useState<Menu>(null);
  const [collapsed, setCollapsed] = useState(false);

  const allCats = useMemo(() => [...CATEGORIES, ...extraCats], [extraCats]);

  // "now" is anchored to the latest entry so the relative presets stay
  // meaningful for the mock data regardless of the wall clock.
  const now = useMemo(() => {
    const latest = transactions.reduce((m, t) => (t.date > m ? t.date : m), "");
    return latest ? new Date(latest) : new Date();
  }, [transactions]);

  const filtered = useMemo(() => {
    let from: Date | null = null;
    if (dateFilter.kind === "week") {
      from = new Date(now);
      from.setDate(from.getDate() - 7);
    } else if (dateFilter.kind === "3mo") {
      from = new Date(now);
      from.setMonth(from.getMonth() - 3);
    }
    return transactions.filter((t) => {
      if (dateFilter.kind === "month" && !t.date.startsWith(dateFilter.key)) return false;
      if (from && new Date(t.date) < from) return false;
      if (type === "in" && t.amount < 0) return false;
      if (type === "out" && t.amount >= 0) return false;
      if (cats.size > 0 && !cats.has(t.category)) return false;
      return true;
    });
  }, [transactions, dateFilter, type, cats, now]);

  const summary = useMemo(() => summarize(filtered), [filtered]);
  const breakdown = useMemo(() => spendingByCategory(filtered), [filtered]);
  const peak = Math.max(summary.income, summary.expense) || 1;

  // Group the filtered log by day (input is already most-recent first).
  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of filtered) {
      const arr = map.get(t.date);
      if (arr) arr.push(t);
      else map.set(t.date, [t]);
    }
    return [...map.entries()];
  }, [filtered]);

  // Close any open menu on Escape.
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  function toggleCat(name: string) {
    setCats((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function addCat(name: string) {
    const clean = name.trim();
    if (!clean || allCats.includes(clean)) return;
    setExtraCats((prev) => [...prev, clean]);
    toggleCat(clean);
  }

  // Hysteresis so the collapse doesn't flicker around the threshold.
  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const y = e.currentTarget.scrollTop;
    setCollapsed((prev) => (prev ? y > 16 : y > 56));
  }

  const dateLabel = dateFilterLabel(dateFilter);
  const catButtonLabel = cats.size === 0 ? "Categories" : `Categories · ${cats.size}`;
  const typeLabel = TYPES.find((t) => t.key === type)!.label;

  return (
    <div className="flex h-full flex-col">
      {/* Pinned summary + filters */}
      <div className="shrink-0 border-b border-app-border">
        {collapsed ? (
          <div className="flex items-baseline justify-between px-5 py-3">
            <span className="text-sm font-medium">Activity</span>
            <span className="font-mono text-sm tabular-nums">
              <span className="text-foreground/45">net</span>{" "}
              <span className={summary.net >= 0 ? "text-money-in" : "text-money-out"}>{signed(summary.net)}</span>
              <span className="ml-3 text-foreground/45">out</span> {amount(summary.expense)}
            </span>
          </div>
        ) : (
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-baseline justify-between">
              <h1 className="text-sm font-medium">Activity</h1>
              <span className="font-mono text-xs tabular-nums text-foreground/45">
                {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
              </span>
            </div>

            <div className={`mt-3 font-mono text-3xl tabular-nums tracking-tight ${summary.net >= 0 ? "text-money-in" : "text-money-out"}`}>
              {signed(summary.net)}
            </div>
            <div className="mt-0.5 text-xs text-foreground/45">{dateLabel} · net</div>

            <div className="mt-4 space-y-1">
              <SplitRow label="in" value={summary.income} ratio={summary.income / peak} />
              <SplitRow label="out" value={summary.expense} ratio={summary.expense / peak} />
            </div>

            {breakdown.length > 0 && (
              <div className="mt-4">
                <div className="text-xs text-foreground/45">Top spending</div>
                <div className="mt-2 space-y-1">
                  {breakdown.slice(0, 4).map((c) => (
                    <div key={c.name} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 truncate text-sm">{c.name}</span>
                      <span className="font-mono text-xs text-foreground/55">
                        {bar(c.amount / breakdown[0].amount, 12)}
                      </span>
                      <span className="ml-auto font-mono text-xs tabular-nums text-foreground/70">
                        {amount(c.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filters — three dropdown buttons, divided by hairlines like the cards */}
        <div className="relative border-t border-app-border">
          <div className="relative z-40 grid grid-cols-3 divide-x divide-app-border [&>*:first-child]:pl-5 [&>*:last-child]:pr-5">
            <MenuButton
              label={catButtonLabel}
              active={cats.size > 0}
              open={menu === "cat"}
              onClick={() => setMenu((m) => (m === "cat" ? null : "cat"))}
            />
            <MenuButton
              label={dateLabel}
              active={dateFilter.kind !== "all"}
              open={menu === "month"}
              onClick={() => {
                if (menu === "month") {
                  setMenu(null);
                } else {
                  setDraftDate(dateFilter);
                  setMenu("month");
                }
              }}
            />
            <MenuButton
              label={typeLabel}
              active={type !== "all"}
              open={menu === "type"}
              onClick={() => setMenu((m) => (m === "type" ? null : "type"))}
            />
          </div>

          {menu === "cat" && (
            <Dropdown>
              <CategoryMenu
                all={allCats}
                selected={cats}
                onToggle={toggleCat}
                onAdd={addCat}
              />
            </Dropdown>
          )}
          {menu === "month" && (
            <Dropdown>
              <OptionRow
                label="Past week"
                selected={draftDate.kind === "week"}
                onClick={() => setDraftDate({ kind: "week" })}
              />
              <OptionRow
                label="Past 3 months"
                selected={draftDate.kind === "3mo"}
                onClick={() => setDraftDate({ kind: "3mo" })}
              />
              <OptionRow
                label="All time"
                selected={draftDate.kind === "all"}
                onClick={() => setDraftDate({ kind: "all" })}
              />
              <div className="border-t border-app-border">
                <MonthPicker
                  value={draftDate.kind === "month" ? draftDate.key : ""}
                  onPick={(key) => setDraftDate({ kind: "month", key })}
                />
              </div>
              <div className="flex divide-x divide-app-border border-t border-app-border">
                <button
                  type="button"
                  onClick={() => setMenu(null)}
                  className="flex-1 py-2.5 text-sm text-foreground/55"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDateFilter(draftDate);
                    setMenu(null);
                  }}
                  className="flex-1 py-2.5 text-sm font-medium text-foreground"
                >
                  OK
                </button>
              </div>
            </Dropdown>
          )}
          {menu === "type" && (
            <Dropdown>
              {TYPES.map((t) => (
                <OptionRow
                  key={t.key}
                  label={t.label}
                  selected={type === t.key}
                  onClick={() => {
                    setType(t.key);
                    setMenu(null);
                  }}
                />
              ))}
            </Dropdown>
          )}
        </div>
      </div>

      {/* Click-away layer for any open menu */}
      {menu && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 cursor-default"
          onClick={() => setMenu(null)}
        />
      )}

      {/* Scrolling transaction log */}
      <div className="flex-1 overflow-y-auto scrollbar-none" onScroll={onScroll}>
        {groups.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-foreground/45">
            No transactions match these filters.
          </p>
        ) : (
          <div>
            {groups.map(([date, items]) => (
              <section key={date}>
                <div className="sticky top-0 bg-app-surface px-5 py-1.5 text-xs text-foreground/40">
                  {dayLabel(date)}
                </div>
                <ul className="divide-y divide-app-border">
                  {items.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-baseline justify-between gap-4 px-5 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm">{t.description}</div>
                        <div className="text-xs text-foreground/40">{t.category}</div>
                      </div>
                      <span
                        className={`shrink-0 font-mono text-sm tabular-nums ${
                          t.amount >= 0 ? "text-money-in" : "text-money-out"
                        }`}
                      >
                        {signed(t.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SplitRow({
  label,
  value,
  ratio,
}: {
  label: string;
  value: number;
  ratio: number;
}) {
  return (
    <div className="flex items-center gap-2 font-mono text-xs tabular-nums">
      <span className="w-6 text-foreground/45">{label}</span>
      <span className="text-foreground/70">{bar(ratio, 18)}</span>
      <span className="ml-auto text-foreground/70">{amount(value)}</span>
    </div>
  );
}

function MenuButton({
  label,
  active,
  open,
  onClick,
}: {
  label: string;
  active: boolean;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between gap-1 px-3 py-2.5 text-sm ${
        open
          ? "bg-foreground/[0.03] text-foreground"
          : active
            ? "text-foreground"
            : "text-foreground/55"
      }`}
    >
      <span className="truncate">{label}</span>
      <svg
        width="9"
        height="9"
        viewBox="0 0 10 10"
        fill="none"
        aria-hidden="true"
        className={`shrink-0 text-foreground/40 transition-transform ${open ? "rotate-180" : ""}`}
      >
        <path
          d="M2 4l3 3 3-3"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function Dropdown({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute left-0 right-0 top-full z-40 border-b border-app-border bg-app-raised">
      {children}
    </div>
  );
}

function OptionRow({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
        selected ? "text-foreground" : "text-foreground/60"
      }`}
    >
      {label}
      {selected && (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path
            d="M2 6.5l2.5 2.5L10 3"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

function CategoryMenu({
  all,
  selected,
  onToggle,
  onAdd,
}: {
  all: string[];
  selected: Set<string>;
  onToggle: (name: string) => void;
  onAdd: (name: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onAdd(name);
    setName("");
    setAdding(false);
  }

  return (
    <div className="p-3">
      {adding ? (
        <form onSubmit={submit}>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => !name && setAdding(false)}
            placeholder="New category"
            className="w-full border-b border-app-border bg-transparent pb-1 text-sm outline-none placeholder:text-foreground/35"
          />
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-sm text-foreground/55"
        >
          + new
        </button>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {all.map((c) => {
          const on = selected.has(c);
          return (
            <button
              key={c}
              type="button"
              onClick={() => onToggle(c)}
              className={`rounded-full border px-2.5 py-1 text-xs ${
                on
                  ? "border-foreground bg-foreground text-app-surface"
                  : "border-app-border text-foreground/60"
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function MonthPicker({
  value,
  onPick,
}: {
  value: string;
  onPick: (key: string) => void;
}) {
  const [year, setYear] = useState(() => {
    const parsed = Number(value.slice(0, 4));
    return parsed >= 1970 ? parsed : new Date().getFullYear();
  });

  return (
    <div className="p-3">
      <div className="flex items-center justify-between">
        <YearArrow dir="prev" onClick={() => setYear((y) => y - 1)} />
        <span className="font-mono text-sm tabular-nums">{year}</span>
        <YearArrow dir="next" onClick={() => setYear((y) => y + 1)} />
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1">
        {MONTHS_SHORT.map((m, i) => {
          const key = `${year}-${String(i + 1).padStart(2, "0")}`;
          const on = value === key;
          return (
            <button
              key={m}
              type="button"
              onClick={() => onPick(key)}
              className={`border py-1.5 text-sm ${
                on
                  ? "border-foreground text-foreground"
                  : "border-transparent text-foreground/60"
              }`}
            >
              {m}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function YearArrow({ dir, onClick }: { dir: "prev" | "next"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === "prev" ? "Previous year" : "Next year"}
      className="flex h-7 w-7 items-center justify-center text-foreground/55"
    >
      <svg
        width="9"
        height="9"
        viewBox="0 0 10 10"
        fill="none"
        aria-hidden="true"
        className={dir === "prev" ? "rotate-90" : "-rotate-90"}
      >
        <path
          d="M2 4l3 3 3-3"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
