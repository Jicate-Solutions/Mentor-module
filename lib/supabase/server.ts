import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Create a Supabase client for server-side use with cookies
 * Use this in Server Components and Route Handlers
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: {
        getItem: (key: string) => {
          return cookieStore.get(key)?.value ?? null;
        },
        setItem: (key: string, value: string) => {
          cookieStore.set(key, value, {
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: '/',
          });
        },
        removeItem: (key: string) => {
          cookieStore.delete(key);
        },
      },
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Create a Supabase admin client with service role key
 * Use this for admin operations that bypass RLS
 */
export function createAdminClient() {
  if (!supabaseServiceKey) {
    console.error(
      '[createAdminClient] SUPABASE_SERVICE_ROLE_KEY is not set. ' +
      'Database writes via admin client will fail RLS checks.'
    );
  }
  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
