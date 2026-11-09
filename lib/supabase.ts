import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createSupabaseClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
)

// Every page shares the one client above. Separate clients each tried to
// renew the same login; once one renewed it, the others' refresh token was
// gone ("Invalid Refresh Token: Refresh Token Not Found").
export function createClient() {
  return supabase
}

// A saved login that can't be renewed (expired, signed out elsewhere, or
// replaced): forget it on this browser so the login page shows cleanly.
export function isExpiredLoginError(error: unknown): boolean {
  const message = String((error as { message?: unknown } | null)?.message ?? '')
  return /refresh token/i.test(message)
}

export async function clearExpiredLogin(): Promise<void> {
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
}