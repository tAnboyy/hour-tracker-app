import { kvGet, kvSet } from './db';
import { applyRemote, getUnsynced, markSynced } from './repo';
import { supabase } from './supabase';
import type { HourLog } from './types';

let syncing = false;

/**
 * Offline-first sync: push local rows that changed since last sync, pull
 * remote rows newer than our last pull. Last-write-wins on updated_at.
 * No-op (returns false) when Supabase isn't configured or nobody is signed in.
 * Returns true when remote changes were applied locally.
 */
export async function trySync(): Promise<boolean> {
  const client = supabase();
  if (!client || syncing) return false;
  const { data } = await client.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return false;

  syncing = true;
  try {
    const now = new Date().toISOString();

    const pending = getUnsynced();
    if (pending.length > 0) {
      const { error } = await client.from('hour_logs').upsert(
        pending.map((r) => ({
          user_id: userId,
          id: r.id,
          date: r.date,
          hour: r.hour,
          did: r.did,
          next: r.next,
          goal: r.goal,
          tags: r.tags,
          status: r.status,
          backfilled: r.backfilled,
          logged_at: r.logged_at,
          updated_at: r.updated_at,
        })),
        { onConflict: 'user_id,date,hour' }
      );
      if (!error) markSynced(pending.map((r) => r.id), now);
    }

    const since = kvGet('lastPull') ?? '1970-01-01T00:00:00Z';
    const { data: remote, error: pullError } = await client
      .from('hour_logs')
      .select('*')
      .gt('updated_at', since)
      .order('updated_at', { ascending: true })
      .limit(1000);
    if (pullError || !remote) return false;

    let changed = false;
    for (const row of remote) {
      applyRemote({ ...(row as unknown as HourLog), synced_at: now });
      changed = true;
    }
    kvSet('lastPull', now);
    return changed;
  } catch {
    return false; // offline — try again next foreground
  } finally {
    syncing = false;
  }
}
