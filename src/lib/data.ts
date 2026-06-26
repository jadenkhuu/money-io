// Shared data types and pure helpers. This module is import-safe from both
// Server and Client Components — it holds no data access. Reads live in
// `src/lib/transactions.ts` (server) and the write in
// `src/app/actions/transactions.ts` (Server Action). Nothing here connects to a
// bank or external account: entries are manual-input only.

// A split records money others owe you for a shared payment. `amount` on the
// transaction is always YOUR real share (what actually left your pocket), so
// every spending aggregation stays correct without knowing about splits. The
// reimbursement lives here and is what the Owed ledger reads.
export type Split = {
  owed: number; // positive — amount expected back from others
  from?: string; // optional person the money is owed by (links to Owed ledger)
  settled?: boolean; // collected yet?
};

export type Transaction = {
  id: string;
  amount: number; // signed: + income, − expense. For splits this is your share.
  title: string; // optional label, "" when blank
  note: string; // optional longer description, "" when blank
  category: string; // "" = uncategorised
  date: string; // ISO yyyy-mm-dd — the day the entry is attributed to
  createdAt: string; // ISO timestamp — when the entry was logged
  split?: Split; // present only when you paid for others
};

export type MonthSummary = {
  income: number;
  expense: number;
  net: number;
};

export type Category = { name: string; amount: number };

// What the entry form submits. Direction (income vs expense) and any split are
// already resolved into a signed `amount` + optional `split` before this point.
export type NewEntry = {
  amount: number; // signed: your real share
  title?: string;
  note?: string;
  category?: string; // omit / "" for uncategorised
  date?: string; // yyyy-mm-dd, defaults to today
  split?: Split;
};

// Spending categories. "Income" is the bucket for positive entries; the
// spending breakdown ignores it.
export const CATEGORIES = [
  "Income",
  "Housing",
  "Food",
  "Transport",
  "Shopping",
  "Health",
  "Entertainment",
  "Utilities",
] as const;

// Label shown for an entry in lists. Title and note are both optional, so fall
// back to the category, then a neutral placeholder.
export function entryLabel(t: Transaction): string {
  return t.title || t.category || "Untitled";
}

// --- Pure aggregation helpers (run anywhere, incl. client-side over a filtered
// set so the Activity summary tracks the active filters live). ---

export function summarize(txns: Transaction[]): MonthSummary {
  let income = 0;
  let expense = 0;
  for (const t of txns) {
    if (t.amount >= 0) income += t.amount;
    else expense += -t.amount;
  }
  return { income, expense, net: income - expense };
}

// Spending (expenses only) grouped by category, largest first.
export function spendingByCategory(txns: Transaction[]): Category[] {
  const totals = new Map<string, number>();
  for (const t of txns) {
    if (t.amount >= 0) continue;
    const name = t.category || "Uncategorised";
    totals.set(name, (totals.get(name) ?? 0) + -t.amount);
  }
  return [...totals]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
}

// Current calendar month as "yyyy-mm". Used to scope the home "This month" view.
export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}
