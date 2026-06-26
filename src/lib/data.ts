// Mock data layer. Functions are async so this interface matches a future
// Supabase-backed implementation — swapping the internals later won't touch any
// UI. Nothing here connects to a bank or any external account: entries are
// manual-input only.

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

export type User = { name: string };

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

// Mock rows predate split tracking; synthesize a createdAt at midday of the
// attribution date so ordering is stable.
function seed(
  id: string,
  title: string,
  amount: number,
  date: string,
  category: string
): Transaction {
  return {
    id,
    title,
    amount,
    date,
    category,
    note: "",
    createdAt: `${date}T12:00:00.000Z`,
  };
}

// Most-recent first. ~3 months of manual entries so date/category filters on
// the Activity screen have something to chew on.
const TRANSACTIONS: Transaction[] = [
  seed("t01", "Freelance", 340, "2026-06-25", "Income"),
  seed("t02", "Lunch", -18, "2026-06-24", "Food"),
  seed("t03", "Groceries", -54, "2026-06-23", "Food"),
  seed("t04", "Coffee", -6, "2026-06-23", "Food"),
  seed("t05", "Transport", -42, "2026-06-20", "Transport"),
  seed("t06", "Pharmacy", -23, "2026-06-18", "Health"),
  seed("t07", "Cinema", -16, "2026-06-16", "Entertainment"),
  seed("t08", "Salary", 900, "2026-06-15", "Income"),
  seed("t09", "Internet", -45, "2026-06-12", "Utilities"),
  seed("t10", "Shoes", -68, "2026-06-10", "Shopping"),
  seed("t11", "Groceries", -61, "2026-06-08", "Food"),
  seed("t12", "Electricity", -52, "2026-06-05", "Utilities"),
  seed("t13", "Rent", -700, "2026-06-01", "Housing"),

  seed("t14", "Freelance", 220, "2026-05-28", "Income"),
  seed("t15", "Dinner", -38, "2026-05-26", "Food"),
  seed("t16", "Transport", -42, "2026-05-22", "Transport"),
  seed("t17", "Gym", -30, "2026-05-20", "Health"),
  seed("t18", "Salary", 900, "2026-05-15", "Income"),
  seed("t19", "Internet", -45, "2026-05-12", "Utilities"),
  seed("t20", "Books", -27, "2026-05-12", "Shopping"),
  seed("t21", "Groceries", -58, "2026-05-09", "Food"),
  seed("t22", "Concert", -55, "2026-05-07", "Entertainment"),
  seed("t23", "Rent", -700, "2026-05-01", "Housing"),

  seed("t24", "Salary", 900, "2026-04-15", "Income"),
  seed("t25", "Groceries", -49, "2026-04-20", "Food"),
  seed("t26", "Transport", -42, "2026-04-18", "Transport"),
  seed("t27", "Dentist", -85, "2026-04-10", "Health"),
  seed("t28", "Jacket", -120, "2026-04-05", "Shopping"),
  seed("t29", "Rent", -700, "2026-04-01", "Housing"),
];

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

// Latest calendar month present in the data ("yyyy-mm"). The mock's "now".
function latestMonth(): string {
  return TRANSACTIONS.reduce(
    (m, t) => (t.date.slice(0, 7) > m ? t.date.slice(0, 7) : m),
    "0000-00"
  );
}

// --- Async data accessors (the Supabase swap point). ---

export async function getTransactions(): Promise<Transaction[]> {
  return TRANSACTIONS;
}

export async function getMonthSummary(): Promise<MonthSummary> {
  const month = latestMonth();
  return summarize(TRANSACTIONS.filter((t) => t.date.startsWith(month)));
}

export async function getRecentTransactions(limit = 3): Promise<Transaction[]> {
  return TRANSACTIONS.slice(0, limit);
}

export async function getTopCategories(limit = 3): Promise<Category[]> {
  const month = latestMonth();
  return spendingByCategory(
    TRANSACTIONS.filter((t) => t.date.startsWith(month))
  ).slice(0, limit);
}

export async function getUser(): Promise<User> {
  return { name: "Jaden" };
}

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

// Write path — the Supabase insert swaps in here. Prepends so the new row shows
// at the top of recent/activity lists immediately on refresh.
export async function createTransaction(input: NewEntry): Promise<Transaction> {
  const now = new Date();
  const txn: Transaction = {
    id: `t${now.getTime()}`,
    amount: input.amount,
    title: input.title?.trim() || "",
    note: input.note?.trim() || "",
    category: input.category?.trim() || "",
    date: input.date || now.toISOString().slice(0, 10),
    createdAt: now.toISOString(),
    ...(input.split ? { split: input.split } : {}),
  };
  TRANSACTIONS.unshift(txn);
  return txn;
}
