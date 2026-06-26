import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

// `proxy` is this Next version's replacement for the deprecated `middleware`
// convention. It refreshes the Supabase session (and gates the app) on every
// request that isn't a static asset.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Run on everything except Next internals and any path with a file extension
  // (public assets: the coin .glb / frames .json, icons, sw.js, the manifest).
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
