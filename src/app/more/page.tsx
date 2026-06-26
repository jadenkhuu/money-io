import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { signOut } from "../actions/auth";

export default async function MorePage() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="px-5 py-6">
      <h1 className="text-base font-medium">More</h1>

      <div className="-mx-5 mt-6 border-y border-app-border">
        <div className="px-5 py-3">
          <div className="text-xs text-foreground/45">Logged in as</div>
          <div className="mt-0.5 truncate font-mono text-sm">
            {user?.email ?? "—"}
          </div>
        </div>
        <form action={signOut} className="border-t border-app-border">
          <button
            type="submit"
            className="flex w-full items-center justify-between px-5 py-3 text-left text-sm text-money-out"
          >
            Sign out
            <span aria-hidden="true" className="font-mono text-foreground/40">
              ›
            </span>
          </button>
        </form>
      </div>
    </main>
  );
}
