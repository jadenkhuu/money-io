import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client, for use inside Client Components. Reads only the
// public URL + publishable key, which are safe to ship to the browser (Row
// Level Security is what protects the data — never put the secret key here).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const createClient = () =>
  createBrowserClient(supabaseUrl!, supabaseKey!);
