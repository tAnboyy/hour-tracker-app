import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

let _client: SupabaseClient | null | undefined;

/** Null when Supabase env vars are not configured — the app then runs local-only. */
export function supabase(): SupabaseClient | null {
  if (_client !== undefined) return _client;
  if (!url || !anonKey) {
    _client = null;
    return null;
  }
  _client = createClient(url, anonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return _client;
}
