"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { NewEntry } from "@/lib/data";

// Insert a manual entry. Called from the entry sheet (a Client Component) as a
// Server Action. `user_id` is filled by the table's `auth.uid()` default and
// enforced by RLS, so it isn't sent here. revalidatePath refreshes the Home and
// Activity server components so the new row shows immediately.
export async function createTransaction(input: NewEntry): Promise<void> {
  const supabase = createClient(await cookies());

  const { error } = await supabase.from("transactions").insert({
    amount: input.amount,
    title: input.title?.trim() || "",
    note: input.note?.trim() || "",
    category: input.category?.trim() || "",
    ...(input.date ? { date: input.date } : {}),
    split_owed: input.split ? input.split.owed : null,
    split_settled: input.split?.settled ?? false,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}
