"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, type Transaction } from "@/lib/data";
import { createTransaction, updateTransaction } from "./actions/transactions";
import { amount as fmt } from "@/lib/format";

// The `+` entry sheet. Slides up over the current tab; the tab stays mounted
// behind it (see nav.tsx). Manual entry is the canonical input method — the
// method switcher reserves space for the future AI / screenshot path without
// committing to it now.
//
// The headline amount is driven by an on-screen keypad (the signature
// interaction from docs/screens.md); secondary fields use native inputs. The
// keypad value is "what you paid". "I paid for others" reveals a split: you
// enter what you actually spent, and the app derives what others owe you
// (paid − spent). Only your real spend is stored as the transaction amount, so
// every spending aggregation stays correct without knowing about splits.

type Direction = "expense" | "income";

const UNCATEGORISED = "Uncategorised";

export function EntrySheet({
  onClose,
  editing,
}: {
  onClose: () => void;
  editing?: Transaction;
}) {
  const router = useRouter();

  // When editing, rebuild the form inputs from the stored row. The stored
  // `amount` is the real share (negative for expenses); for a split, the keypad
  // "paid" = share + owed-back, and "spent" = the share.
  const shareAbs = editing ? Math.abs(editing.amount) : 0;
  const owedBack = editing?.split?.owed ?? 0;

  const [direction, setDirection] = useState<Direction>(
    editing ? (editing.amount >= 0 ? "income" : "expense") : "expense"
  );
  const [paid, setPaid] = useState(editing ? rawAmount(shareAbs + owedBack) : "");
  const [category, setCategory] = useState(editing?.category ?? ""); // "" = uncategorised
  const [note, setNote] = useState(editing?.note ?? "");
  const [date, setDate] = useState(
    editing?.date ?? new Date().toISOString().slice(0, 10)
  );
  const [splitOpen, setSplitOpen] = useState(Boolean(editing?.split));
  const [spent, setSpent] = useState(editing?.split ? rawAmount(shareAbs) : "");
  const [saving, setSaving] = useState(false);

  const paidNum = parseAmount(paid);
  const spentNum = Math.min(parseAmount(spent), paidNum); // your share can't exceed what you paid
  const owedToYou = round2(paidNum - spentNum);
  const usingSplit = direction === "expense" && splitOpen && owedToYou > 0;
  const share = usingSplit ? spentNum : paidNum;

  const canSave = paidNum > 0 && !saving;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    const payload = {
      amount: direction === "income" ? share : -share,
      category: category || undefined,
      note: note || undefined,
      date,
      split: usingSplit
        ? { owed: owedToYou, settled: editing?.split?.settled ?? false }
        : undefined,
    };
    if (editing) await updateTransaction(editing.id, payload);
    else await createTransaction(payload);
    router.refresh();
    onClose();
  }

  // Hardware keyboard support on desktop — type straight into the keypad.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return; // let native fields type
      if (e.key === "Escape") return onClose();
      if (e.key === "Enter") {
        if (canSave) void save();
        return;
      }
      if (e.key === "Backspace") return setPaid(press(paid, "back"));
      if (/^[0-9]$/.test(e.key)) return setPaid(press(paid, e.key));
      if (e.key === ".") return setPaid(press(paid, "."));
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paid, canSave]);

  const tone = direction === "income" ? "text-money-in" : "text-money-out";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/30" aria-hidden="true" />
      <div className="app-column relative" onClick={(e) => e.stopPropagation()}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label={editing ? "Edit entry" : "New entry"}
          className="max-h-[92dvh] overflow-y-auto scrollbar-none border-t border-foreground/10 bg-app-surface px-5 pt-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
        >
          {/* header */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium">
              {editing ? "Edit entry" : "New entry"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center text-foreground/60"
            >
              <span className="text-lg leading-none">×</span>
            </button>
          </div>

          {/* input-method switcher — Manual now, Screenshot later */}
          <div className="mt-3 grid grid-cols-2 gap-1 bg-app-raised p-1 text-xs">
            <span className="bg-app-surface py-1.5 text-center font-medium">
              Manual
            </span>
            <span className="flex items-center justify-center gap-1 py-1.5 text-center text-foreground/35">
              Screenshot
              <span className="border border-foreground/20 px-1 text-[9px] uppercase tracking-wide">
                soon
              </span>
            </span>
          </div>

          {/* amount */}
          <div className="mt-4 flex flex-col items-center">
            <div className={`font-mono text-4xl tabular-nums tracking-tight ${tone}`}>
              {direction === "income" ? "+" : "−"}
              {displayAmount(paid)}
            </div>
            {usingSplit && (
              <div className="mt-1 font-mono text-xs tabular-nums text-foreground/50">
                you paid {fmt(paidNum)} · owed to you {fmt(owedToYou)}
              </div>
            )}
          </div>

          {/* direction toggle */}
          <div className="mt-3 grid grid-cols-2 gap-1 bg-app-raised p-1 text-sm">
            <Toggle
              on={direction === "expense"}
              onClick={() => setDirection("expense")}
            >
              Expense
            </Toggle>
            <Toggle
              on={direction === "income"}
              onClick={() => {
                setDirection("income");
                setSplitOpen(false);
              }}
            >
              Income
            </Toggle>
          </div>

          {/* fields — one connected block, no gaps. Category + Date sit side by
              side to save height. The split stays always-rendered (fixed height
              across income/expense + checked/unchecked) and inert for income. */}
          <div className="mt-3 border border-app-border">
            <div className="flex">
              <CategoryRow value={category} onChange={setCategory} />
              <label className="flex min-w-0 flex-1 flex-col gap-0.5 border-l border-app-border px-3 py-2">
                <span className="text-[10px] uppercase tracking-wide text-foreground/40">
                  Date
                </span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full min-w-0 bg-transparent font-mono text-base tabular-nums outline-none"
                />
              </label>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-app-border px-3 py-2">
              <span className="shrink-0 text-sm text-foreground/70">Note</span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="optional"
                className="w-full bg-transparent text-right text-base outline-none placeholder:text-foreground/30"
              />
            </div>

            <div
              className={`bg-app-raised ${
                direction === "expense" ? "" : "pointer-events-none opacity-40"
              }`}
            >
              <button
                type="button"
                onClick={() => setSplitOpen((s) => !s)}
                aria-pressed={splitOpen}
                disabled={direction !== "expense"}
                className="flex w-full items-center gap-2.5 border-t border-app-border px-3 py-2 text-left text-sm"
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center border text-[10px] leading-none ${
                    splitOpen
                      ? "border-foreground bg-foreground text-app-surface"
                      : "border-foreground/40"
                  }`}
                >
                  {splitOpen ? "✓" : ""}
                </span>
                <span className={splitOpen ? "font-medium" : "text-foreground/70"}>
                  I paid for others
                </span>
              </button>
              <div className={`transition-opacity ${splitOpen ? "" : "opacity-40"}`}>
                <div className="flex items-center justify-between border-t border-app-border px-3 py-2">
                  <span className="text-sm text-foreground/70">What I spent</span>
                  <input
                    inputMode="decimal"
                    value={spent}
                    disabled={!splitOpen}
                    onChange={(e) =>
                      setSpent(e.target.value.replace(/[^0-9.]/g, ""))
                    }
                    placeholder="0"
                    className="w-24 bg-transparent text-right font-mono text-base tabular-nums outline-none placeholder:text-foreground/30"
                  />
                </div>
                <div className="flex items-center justify-between border-t border-app-border px-3 py-2">
                  <span className="text-sm text-foreground/70">Owed to you</span>
                  <span className="font-mono text-base tabular-nums text-money-in">
                    {fmt(splitOpen ? owedToYou : 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* keypad */}
          <div className="mt-3 grid grid-cols-3 gap-1">
            {["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "back"].map(
              (k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setPaid(press(paid, k))}
                  className="bg-app-raised py-2.5 font-mono text-xl tabular-nums text-foreground active:bg-foreground/10"
                  aria-label={k === "back" ? "Delete" : k}
                >
                  {k === "back" ? "⌫" : k}
                </button>
              )
            )}
          </div>

          {/* save */}
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="mt-3 w-full bg-foreground py-3 text-sm font-medium text-app-surface transition-opacity disabled:opacity-30"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-1.5 text-center transition-colors ${
        on ? "bg-app-surface font-medium" : "text-foreground/55"
      }`}
    >
      {children}
    </button>
  );
}

// Category picker. The list is a floating overlay so opening it never changes
// the form's height. Categories live here for now (the future shared store /
// Supabase table is the swap point); add and remove are session-local.
function CategoryRow({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [cats, setCats] = useState<string[]>([...CATEGORIES]);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  // Close the overlay when clicking outside it.
  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setEditing(false);
        setPendingDelete(null);
      }
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  function choose(name: string) {
    onChange(name);
    setOpen(false);
    setEditing(false);
  }

  function addNew(e: React.FormEvent) {
    e.preventDefault();
    const name = draft.trim();
    if (name && !cats.includes(name)) setCats((p) => [...p, name]);
    if (name) onChange(name);
    setDraft("");
    setAdding(false);
  }

  function removeCat(name: string) {
    setCats((p) => p.filter((c) => c !== name));
    if (value === name) onChange("");
    setPendingDelete(null);
  }

  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full flex-col gap-0.5 px-3 py-2 text-left"
      >
        <span className="text-[10px] uppercase tracking-wide text-foreground/40">
          Category
        </span>
        <span className="flex items-center justify-between gap-1 text-sm">
          <span className={`truncate ${value ? "" : "text-foreground/40"}`}>
            {value || UNCATEGORISED}
          </span>
          <span className="font-mono text-foreground/40">{open ? "▴" : "▾"}</span>
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 w-72 max-w-[calc(100vw-2.5rem)] border border-foreground/15 bg-app-surface">
          <div className="flex gap-2 border-b border-app-border p-3">
            {adding ? (
              <form onSubmit={addNew} className="flex flex-1 items-center gap-2">
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => !draft && setAdding(false)}
                  placeholder="New category"
                  className="min-w-0 flex-1 border-b border-app-border bg-transparent pb-0.5 text-base outline-none placeholder:text-foreground/35"
                />
                <button
                  type="submit"
                  className="shrink-0 text-sm font-bold text-foreground/55 hover:text-foreground"
                >
                  add
                </button>
              </form>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setAdding(true);
                    setEditing(false);
                  }}
                  className="border border-dashed border-foreground/30 px-2.5 py-1 text-xs text-foreground/50 hover:text-foreground/70"
                >
                  + new
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing((x) => !x);
                    setPendingDelete(null);
                  }}
                  className={`border border-dashed px-2.5 py-1 text-xs ${
                    editing
                      ? "border-foreground/60 text-foreground/70"
                      : "border-foreground/30 text-foreground/50 hover:text-foreground/70"
                  }`}
                >
                  {editing ? "done" : "edit"}
                </button>
              </>
            )}
          </div>

          {pendingDelete && (
            <div className="flex items-center justify-between border-b border-app-border px-3 py-2">
              <span className="text-xs text-foreground/70">
                Remove{" "}
                <span className="font-medium text-foreground">
                  &ldquo;{pendingDelete}&rdquo;
                </span>
                ?
              </span>
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
                  onClick={() => removeCat(pendingDelete)}
                  className="text-xs font-medium text-money-out"
                >
                  remove
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 p-3">
            <Pill on={!value} onClick={() => choose("")}>
              {UNCATEGORISED}
            </Pill>
            {cats.map((c) => (
              <div key={c} className="flex items-center gap-1">
                <Pill
                  on={value === c}
                  onClick={() => (editing ? undefined : choose(c))}
                >
                  {c}
                </Pill>
                {editing && (
                  <button
                    type="button"
                    onClick={() => setPendingDelete(c)}
                    aria-label={`Remove ${c}`}
                    className="flex h-4 w-4 items-center justify-center bg-foreground/15 text-[10px] leading-none text-foreground/60 hover:bg-foreground/25"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Pill({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border px-2.5 py-1 text-xs ${
        on
          ? "border-foreground/75 bg-foreground/75 text-app-surface"
          : "border-app-border text-foreground/60"
      }`}
    >
      {children}
    </button>
  );
}

// --- keypad string helpers ---

// Apply a keypress to the raw amount string. Guards against multiple dots,
// leading zeros, and more than two decimal places.
function press(raw: string, key: string): string {
  if (key === "back") return raw.slice(0, -1);
  if (key === ".") {
    if (raw.includes(".")) return raw;
    return (raw === "" ? "0" : raw) + ".";
  }
  // digit
  if (raw === "0") return key; // replace a lone leading zero
  const dot = raw.indexOf(".");
  if (dot !== -1 && raw.length - dot > 2) return raw; // already 2 decimals
  return raw + key;
}

function parseAmount(raw: string): number {
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Number → keypad raw string (e.g. 20.5 -> "20.5"), for seeding the edit form.
function rawAmount(n: number): string {
  return n > 0 ? String(round2(n)) : "";
}

// Grouped display of the in-progress keypad value, preserving a trailing dot or
// partial decimals the user is mid-typing.
function displayAmount(raw: string): string {
  if (raw === "") return "0";
  const [int, dec] = raw.split(".");
  const grouped = int === "" ? "0" : Number(int).toLocaleString("en-US");
  if (raw.includes(".")) return `${grouped}.${dec ?? ""}`;
  return grouped;
}
