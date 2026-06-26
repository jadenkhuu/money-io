import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import {
  currentMonth,
  spendingByCategory,
  summarize,
  type Category,
  type MonthSummary,
  type Transaction,
} from "@/lib/data";

// Server-side reads against Supabase. Importing `next/headers` makes this module
// server-only — never import it from a Client Component. RLS scopes every query
// to the signed-in user, so no explicit user filter is needed here.

// Row shape as returned by the `transactions` table (snake_case + string
// numerics from PostgREST).
type Row = {
  id: string;
  amount: number | string;
  title: string;
  note: string;
  category: string;
  date: string;
  created_at: string;
  split_owed: number | string | null;
  split_settled: boolean;
};

function rowToTransaction(r: Row): Transaction {
  return {
    id: r.id,
    amount: Number(r.amount),
    title: r.title ?? "",
    note: r.note ?? "",
    category: r.category ?? "",
    date: r.date,
    createdAt: r.created_at,
    ...(r.split_owed != null
      ? { split: { owed: Number(r.split_owed), settled: r.split_settled } }
      : {}),
  };
}

// All of the user's transactions, newest first.
export async function getTransactions(): Promise<Transaction[]> {
  const supabase = createClient(await cookies());
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToTransaction);
}

export async function getMonthSummary(): Promise<MonthSummary> {
  const txns = await getTransactions();
  const month = currentMonth();
  return summarize(txns.filter((t) => t.date.startsWith(month)));
}

export async function getRecentTransactions(limit = 3): Promise<Transaction[]> {
  const txns = await getTransactions();
  return txns.slice(0, limit);
}

export async function getTopCategories(limit = 3): Promise<Category[]> {
  const txns = await getTransactions();
  const month = currentMonth();
  return spendingByCategory(txns.filter((t) => t.date.startsWith(month))).slice(
    0,
    limit
  );
}
