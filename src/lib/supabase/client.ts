import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  // Use a syntactically-valid fallback during build/SSR when env vars are not configured
  const safeUrl = (() => { try { new URL(url); return url } catch { return 'https://placeholder.supabase.co' } })()
  const safeKey = key || 'placeholder'
  return createBrowserClient<Database>(safeUrl, safeKey)
}
