import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side Supabase client, for Server Components, Server Actions, and Route
// Handlers. Pass it the request's cookie store so it can read the session and
// (where allowed) refresh it. `cookies()` is async in this Next version, so the
// caller awaits it first and hands the resolved store in.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const createClient = (
  cookieStore: Awaited<ReturnType<typeof cookies>>
) => {
  return createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component, where cookies are read-only. Safe to
          // ignore: the proxy (src/proxy.ts) refreshes the session instead.
        }
      },
    },
  });
};
