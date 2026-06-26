import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Auth routes own the full screen and must stay reachable while signed out.
const AUTH_ROUTES = ["/login", "/signup"];

// Runs on every matched request (wired in via src/proxy.ts). Two jobs:
//   1. Refresh the Supabase auth token and sync the cookie onto the response —
//      this MUST happen on every request or sessions silently expire.
//   2. Gate the app: send signed-out visitors to /login, and bounce signed-in
//      visitors away from the auth screens.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: do not run code between creating the client and getUser() — it
  // refreshes the token and any work in between can desync the session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const onAuthRoute = AUTH_ROUTES.some((r) => path.startsWith(r));

  // --- Auth gating. Comment this block out to browse the app while signed out
  // during frontend work. ---
  if (!user && !onAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (user && onAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
