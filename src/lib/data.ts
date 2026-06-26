// Mock data layer. Functions are async so this interface matches a future
// Supabase-backed implementation — swapping the internals later won't touch any
// UI. Nothing here connects to a bank or any external account: entries are
// manual-input only.

export type Transaction = {
  id: string;
  description: string;
  amount: number; // + income, − expense
  date: string; // ISO yyyy-mm-dd
};

export type MonthSummary = {
  income: number;
  expense: number;
  net: number;
};

// Most-recent first.
const TRANSACTIONS: Transaction[] = [
  { id: "t1", description: "Freelance", amount: 340, date: "2026-06-25" },
  { id: "t2", description: "Lunch", amount: -18, date: "2026-06-24" },
  { id: "t3", description: "Groceries", amount: -54, date: "2026-06-23" },
  { id: "t4", description: "Coffee", amount: -6, date: "2026-06-23" },
  { id: "t5", description: "Transport", amount: -42, date: "2026-06-20" },
  { id: "t6", description: "Pay", amount: 900, date: "2026-06-15" },
  { id: "t7", description: "Rent", amount: -700, date: "2026-06-01" },
];

export async function getMonthSummary(): Promise<MonthSummary> {
  let income = 0;
  let expense = 0;
  for (const t of TRANSACTIONS) {
    if (t.amount >= 0) income += t.amount;
    else expense += -t.amount;
  }
  return { income, expense, net: income - expense };
}

export async function getRecentTransactions(limit = 3): Promise<Transaction[]> {
  return TRANSACTIONS.slice(0, limit);
}

export type Category = { name: string; amount: number };

export async function getTopCategories(limit = 3): Promise<Category[]> {
  const cats: Record<string, number> = {
    Housing: 700,
    Food: 78,
    Transport: 42,
  };
  return Object.entries(cats)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

export type User = { name: string };

export async function getUser(): Promise<User> {
  return { name: "Jaden" };
}
