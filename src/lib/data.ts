// Mock data layer. Functions are async so this interface matches a future
// Supabase-backed implementation — swapping the internals later won't touch any
// UI. Nothing here connects to a bank or any external account: entries are
// manual-input only.

export type Transaction = {
  id: string;
  description: string;
  amount: number; // + income, − expense
  date: string; // ISO yyyy-mm-dd
  category: string;
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

// Most-recent first. ~3 months of manual entries so date/category filters on
// the Activity screen have something to chew on.
const TRANSACTIONS: Transaction[] = [
  { id: "t01", description: "Freelance", amount: 340, date: "2026-06-25", category: "Income" },
  { id: "t02", description: "Lunch", amount: -18, date: "2026-06-24", category: "Food" },
  { id: "t03", description: "Groceries", amount: -54, date: "2026-06-23", category: "Food" },
  { id: "t04", description: "Coffee", amount: -6, date: "2026-06-23", category: "Food" },
  { id: "t05", description: "Transport", amount: -42, date: "2026-06-20", category: "Transport" },
  { id: "t06", description: "Pharmacy", amount: -23, date: "2026-06-18", category: "Health" },
  { id: "t07", description: "Cinema", amount: -16, date: "2026-06-16", category: "Entertainment" },
  { id: "t08", description: "Salary", amount: 900, date: "2026-06-15", category: "Income" },
  { id: "t09", description: "Internet", amount: -45, date: "2026-06-12", category: "Utilities" },
  { id: "t10", description: "Shoes", amount: -68, date: "2026-06-10", category: "Shopping" },
  { id: "t11", description: "Groceries", amount: -61, date: "2026-06-08", category: "Food" },
  { id: "t12", description: "Electricity", amount: -52, date: "2026-06-05", category: "Utilities" },
  { id: "t13", description: "Rent", amount: -700, date: "2026-06-01", category: "Housing" },

  { id: "t14", description: "Freelance", amount: 220, date: "2026-05-28", category: "Income" },
  { id: "t15", description: "Dinner", amount: -38, date: "2026-05-26", category: "Food" },
  { id: "t16", description: "Transport", amount: -42, date: "2026-05-22", category: "Transport" },
  { id: "t17", description: "Gym", amount: -30, date: "2026-05-20", category: "Health" },
  { id: "t18", description: "Salary", amount: 900, date: "2026-05-15", category: "Income" },
  { id: "t19", description: "Internet", amount: -45, date: "2026-05-12", category: "Utilities" },
  { id: "t20", description: "Books", amount: -27, date: "2026-05-12", category: "Shopping" },
  { id: "t21", description: "Groceries", amount: -58, date: "2026-05-09", category: "Food" },
  { id: "t22", description: "Concert", amount: -55, date: "2026-05-07", category: "Entertainment" },
  { id: "t23", description: "Rent", amount: -700, date: "2026-05-01", category: "Housing" },

  { id: "t24", description: "Salary", amount: 900, date: "2026-04-15", category: "Income" },
  { id: "t25", description: "Groceries", amount: -49, date: "2026-04-20", category: "Food" },
  { id: "t26", description: "Transport", amount: -42, date: "2026-04-18", category: "Transport" },
  { id: "t27", description: "Dentist", amount: -85, date: "2026-04-10", category: "Health" },
  { id: "t28", description: "Jacket", amount: -120, date: "2026-04-05", category: "Shopping" },
  { id: "t29", description: "Rent", amount: -700, date: "2026-04-01", category: "Housing" },
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
    totals.set(t.category, (totals.get(t.category) ?? 0) + -t.amount);
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
