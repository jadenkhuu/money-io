"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

// Result surfaced back to the form via useActionState. `error` shows an inline
// message; `message` is for non-error states (e.g. "check your email").
export type AuthState = { error?: string; message?: string } | undefined;

export async function login(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = createClient(await cookies());
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signup(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }
  if (password !== confirm) {
    return { error: "Passwords don't match." };
  }

  const supabase = createClient(await cookies());
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) return { error: error.message };

  // If the project requires email confirmation, no session is created yet.
  if (!data.session) {
    return { message: "Check your email to confirm your account." };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut() {
  const supabase = createClient(await cookies());
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
