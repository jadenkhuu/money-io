"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Transaction } from "@/lib/data";
import { CATEGORIES, entryLabel, spendingByCategory, summarize } from "@/lib/data";
import { amount, signed } from "@/lib/format";
import { deleteTransaction } from "../actions/transactions";
import { EntrySheet } from "../entry-form";
import { Bar } from "../bar";

// Activity = a pinned summary over a scrolling transaction log. The summary and
// the log both read from the same filtered set, so the ASCII bars at the top
// always describe exactly what's listed below. The summary can be collapsed
// (chevron, next to the hamburger) down to a condensed line — in / out plus the
// filter bar — to give the log more room.
//
// Filters are three dropdown buttons: category tags, a month picker, and an
// all / in / out type switch.

type TypeFilter = "all" | "in" | "out";
type Menu = "cat" | "month" | "type" | null;

// Date filter: relative presets, all-time, or a specific calendar month.
type DateFilter =
  | { kind: "week" }
  | { kind: "1mo" }
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
    case "1mo":
      return "Past month";
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
  const [allCats, setAllCats] = useState<string[]>([...CATEGORIES]);
  const [dateFilter, setDateFilter] = useState<DateFilter>({ kind: "1mo" });
  // The date menu commits only on OK, so its selection is staged here while open.
  const [draftDate, setDraftDate] = useState<DateFilter>({ kind: "1mo" });
  const [menu, setMenu] = useState<Menu>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);

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
    } else if (dateFilter.kind === "1mo") {
      from = new Date(now);
      from.setMonth(from.getMonth() - 1);
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

  // Summary and breakdown always reflect all transactions — filters only affect
  // the log below, not the overview at the top.
  const summary = useMemo(() => summarize(transactions), [transactions]);
  const breakdown = useMemo(() => spendingByCategory(transactions), [transactions]);
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
    setAllCats((prev) => [...prev, clean]);
    toggleCat(clean);
  }

  function removeCat(name: string) {
    setAllCats((prev) => prev.filter((c) => c !== name));
    setCats((prev) => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  }

  const dateLabel = dateFilterLabel(dateFilter);
  const catButtonLabel = cats.size === 0 ? "Categories" : `Categories · ${cats.size}`;
  const typeLabel = TYPES.find((t) => t.key === type)!.label;

  return (
    <div className="flex h-full flex-col">
      {/* Pinned summary + filters */}
      <div className="shrink-0 border-b border-app-border">
          <div className="px-5 pt-7 pb-4">
            <div className="flex items-center justify-between">
              <h1 className="text-sm font-medium">Activity</h1>
              <div className="flex items-center gap-1">
                <CollapseToggle
                  collapsed={collapsed}
                  onClick={() => setCollapsed((c) => !c)}
                />
                <button
                  type="button"
                  aria-label="Customise view"
                  className="flex h-7 w-7 flex-col items-center justify-center gap-[3px] bg-app-raised text-foreground/45"
                >
                  <span className="block h-px w-4 bg-current" />
                  <span className="block h-px w-4 bg-current" />
                  <span className="block h-px w-4 bg-current" />
                </button>
              </div>
            </div>
            <div className="mt-0.5 text-xs text-foreground/40">{dateLabel}</div>

            {!collapsed && (
              <>
                <div className={`mt-3 font-mono text-3xl tabular-nums tracking-tight ${summary.net >= 0 ? "text-money-in" : "text-money-out"}`}>
                  {signed(summary.net)}
                </div>
                <div className="mt-0.5 text-xs text-foreground/45">net</div>
              </>
            )}

            <div className="mt-4 space-y-1">
              <SplitRow label="in" value={summary.income} ratio={summary.income / peak} />
              <SplitRow label="out" value={summary.expense} ratio={summary.expense / peak} />
            </div>

            {!collapsed && breakdown.length > 0 && (
              <div className="mt-4">
                <div className="text-xs text-foreground/45">Top spending</div>
                <div className="mt-2 space-y-2">
                  {breakdown.slice(0, 4).map((c) => (
                    <div key={c.name}>
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm">{c.name}</span>
                        <span className="font-mono text-xs tabular-nums text-foreground/70">
                          {amount(c.amount)}
                        </span>
                      </div>
                      <Bar
                        ratio={c.amount / breakdown[0].amount}
                        className="mt-1 text-xs text-foreground/40"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

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
                onRemove={removeCat}
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
                label="Past month"
                selected={draftDate.kind === "1mo"}
                onClick={() => setDraftDate({ kind: "1mo" })}
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
                  align="right"
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
      <div className="flex-1 overflow-y-auto scrollbar-none">
        {groups.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-foreground/45">
            No transactions match these filters.
          </p>
        ) : (
          <div>
            {groups.map(([date, items]) => (
              <section key={date} className="border-b border-app-border">
                <div className="sticky top-0 border-t border-foreground/20 bg-[#f0f0f0] px-5 py-2 text-sm font-medium text-foreground">
                  {dayLabel(date)}
                </div>
                <ul>
                  {items.map((t) => (
                    <TransactionRow key={t.id} t={t} onEdit={setEditingTxn} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Edit reuses the entry sheet, pre-filled from the transaction. */}
      {editingTxn && (
        <EntrySheet
          editing={editingTxn}
          onClose={() => setEditingTxn(null)}
        />
      )}
    </div>
  );
}

// Collapse the summary to its condensed form. Chevron points up to collapse,
// down to re-expand — matching the dropdown chevrons elsewhere in this view.
function CollapseToggle({
  collapsed,
  onClick,
}: {
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={collapsed ? "Expand summary" : "Collapse summary"}
      aria-expanded={!collapsed}
      className="flex h-7 w-7 items-center justify-center bg-app-raised text-foreground/45"
    >
      <svg
        width="11"
        height="11"
        viewBox="0 0 10 10"
        fill="none"
        aria-hidden="true"
        className={`transition-transform ${collapsed ? "" : "rotate-180"}`}
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

// A transaction in the log. Carries an unobtrusive "note" toggle that only
// appears when the entry has a note, revealing it inline. The row itself stays
// un-tappable so it's free for the future detail/edit sheet (see screens.md).
function TransactionRow({
  t,
  onEdit,
}: {
  t: Transaction;
  onEdit: (t: Transaction) => void;
}) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false); // note expanded
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const hasNote = t.note.trim().length > 0;

  // Close the options menu on an outside tap.
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setConfirming(false);
      }
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [menuOpen]);

  async function remove() {
    setDeleting(true);
    await deleteTransaction(t.id);
    router.refresh();
  }

  return (
    <li className="bg-[#f0f0f0] px-5 py-3">
      <div className="flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <div className="truncate text-sm">{entryLabel(t)}</div>
          <div className="flex items-center gap-2 text-xs text-foreground/40">
            <span className="truncate">
              {t.category || "Uncategorised"}
              {t.split ? ` · ${amount(t.split.owed)} owed back` : ""}
            </span>
            {hasNote && (
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-label={open ? "Hide note" : "Show note"}
                className={`flex shrink-0 items-center gap-0.5 ${
                  open
                    ? "text-foreground/70"
                    : "text-foreground/45 hover:text-foreground/70"
                }`}
              >
                note
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 10 10"
                  fill="none"
                  aria-hidden="true"
                  className={`transition-transform ${open ? "rotate-180" : ""}`}
                >
                  <path
                    d="M2 4l3 3 3-3"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <span
            className={`font-mono text-sm tabular-nums ${
              t.amount >= 0 ? "text-money-in" : "text-money-out"
            }`}
          >
            {signed(t.amount)}
          </span>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setMenuOpen((o) => !o);
                setConfirming(false);
              }}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Transaction options"
              className="-mr-1 flex h-7 w-6 items-center justify-center text-foreground/35 hover:text-foreground/70"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <circle cx="8" cy="3" r="1.4" />
                <circle cx="8" cy="8" r="1.4" />
                <circle cx="8" cy="13" r="1.4" />
              </svg>
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-30 mt-1 w-36 border border-foreground/15 bg-app-surface"
              >
                {confirming ? (
                  <div className="px-3 py-2">
                    <p className="text-xs text-foreground/70">
                      Delete this entry?
                    </p>
                    <div className="mt-2 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setConfirming(false)}
                        className="text-xs text-foreground/45 hover:text-foreground/70"
                      >
                        cancel
                      </button>
                      <button
                        type="button"
                        onClick={remove}
                        disabled={deleting}
                        className="text-xs font-medium text-money-out disabled:opacity-50"
                      >
                        {deleting ? "…" : "delete"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <MenuItem onClick={() => setMenuOpen(false)}>
                      View more
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        setMenuOpen(false);
                        onEdit(t);
                      }}
                    >
                      Edit
                    </MenuItem>
                    <MenuItem danger onClick={() => setConfirming(true)}>
                      Delete
                    </MenuItem>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {hasNote && open && (
        <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-foreground/55">
          {t.note}
        </p>
      )}
    </li>
  );
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      role="menuitem"
      type="button"
      onClick={onClick}
      className={`block w-full px-3 py-2 text-left text-sm hover:bg-foreground/[0.04] ${
        danger ? "text-money-out" : "text-foreground/80"
      }`}
    >
      {children}
    </button>
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
      <span className="w-6 shrink-0 text-foreground/45">{label}</span>
      <Bar ratio={ratio} className="flex-1 text-foreground/70" />
      <span className="shrink-0 text-foreground/70">{amount(value)}</span>
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
    <div className="absolute left-0 right-0 top-full z-40 border-b border-app-border bg-app-surface">
      {children}
    </div>
  );
}

function OptionRow({
  label,
  selected,
  onClick,
  align = "left",
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  align?: "left" | "right";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center px-3 py-2 text-sm ${
        align === "right" ? "justify-end" : "justify-between"
      } ${selected ? "bg-foreground/75 text-app-surface" : "text-foreground/60"}`}
    >
      {align === "left" && label}
      {align === "left" && selected && (
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
      {align === "right" && label}
    </button>
  );
}

function CategoryMenu({
  all,
  selected,
  onToggle,
  onAdd,
  onRemove,
}: {
  all: string[];
  selected: Set<string>;
  onToggle: (name: string) => void;
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onAdd(name);
    setName("");
    setAdding(false);
  }

  function confirmDelete(cat: string) {
    onRemove(cat);
    setPendingDelete(null);
  }

  return (
    <div className="p-3">
      {adding ? (
        <form onSubmit={submit} className="flex items-center gap-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => !name && setAdding(false)}
            placeholder="New category"
            className="min-w-0 flex-1 border-b border-app-border bg-transparent pb-1 text-base outline-none placeholder:text-foreground/35"
          />
          <button
            type="submit"
            className="shrink-0 pb-1 text-sm font-bold text-foreground/55 hover:text-foreground"
          >
            add
          </button>
        </form>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setAdding(true); setEditing(false); }}
            className="rounded-full border border-dashed border-foreground/30 px-2.5 py-1 text-xs text-foreground/50 hover:text-foreground/70"
          >
            + new
          </button>
          <button
            type="button"
            onClick={() => { setEditing((e) => !e); setPendingDelete(null); }}
            className={`rounded-full border border-dashed px-2.5 py-1 text-xs ${
              editing
                ? "border-foreground/60 text-foreground/70"
                : "border-foreground/30 text-foreground/50 hover:text-foreground/70"
            }`}
          >
            {editing ? "done" : "edit categories"}
          </button>
        </div>
      )}

      {pendingDelete && (
        <div className="mt-2.5 flex items-center justify-between rounded border border-app-border bg-app-surface px-3 py-2">
          <span className="text-xs text-foreground/70">Remove <span className="font-medium text-foreground">&ldquo;{pendingDelete}&rdquo;</span>?</span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setPendingDelete(null)}
              className="text-xs text-foreground/45 hover:text-foreground/70"
            >
              cancel
            </button>
            <button
              type="button"
              onClick={() => confirmDelete(pendingDelete)}
              className="text-xs font-medium text-money-out"
            >
              remove
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {all.map((c) => {
          const on = selected.has(c);
          return (
            <div key={c} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => !editing && onToggle(c)}
                className={`rounded-full border px-2.5 py-1 text-xs ${
                  on && !editing
                    ? "border-foreground/75 bg-foreground/75 text-app-surface"
                    : "border-app-border text-foreground/60"
                }`}
              >
                {c}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={() => setPendingDelete(c)}
                  aria-label={`Remove ${c}`}
                  className="flex h-4 w-4 items-center justify-center rounded-full bg-foreground/15 text-[10px] leading-none text-foreground/60 hover:bg-foreground/25"
                >
                  ×
                </button>
              )}
            </div>
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
                  ? "border-foreground/75 bg-foreground/75 text-app-surface"
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
