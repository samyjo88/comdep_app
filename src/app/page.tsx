import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (user) redirect('/dashboard')
  } catch { /* env not configured */ }

  redirect('/login')
}
