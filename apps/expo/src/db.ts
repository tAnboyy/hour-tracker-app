import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

/**
 * Singleton sync database handle. Sync API so the same code path works from
 * React screens and from Notifee's headless background handler.
 */
export function db(): SQLite.SQLiteDatabase {
  if (_db) return _db;
  _db = SQLite.openDatabaseSync('hourtracker.db');
  migrate(_db);
  return _db;
}

function migrate(d: SQLite.SQLiteDatabase) {
  const row = d.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;
  if (version < 1) {
    d.execSync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS hour_logs (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        hour INTEGER NOT NULL,
        did TEXT NOT NULL DEFAULT '',
        next TEXT NOT NULL DEFAULT '',
        goal TEXT NOT NULL DEFAULT '',
        tags TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'logged',
        backfilled INTEGER NOT NULL DEFAULT 0,
        logged_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at TEXT,
        UNIQUE(date, hour)
      );
      CREATE INDEX IF NOT EXISTS idx_hour_logs_date ON hour_logs(date);
      CREATE TABLE IF NOT EXISTS kv (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      PRAGMA user_version = 1;
    `);
  }
}

export function kvGet(key: string): string | null {
  const row = db().getFirstSync<{ value: string }>('SELECT value FROM kv WHERE key = ?', [key]);
  return row?.value ?? null;
}

export function kvSet(key: string, value: string) {
  db().runSync(
    'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value]
  );
}

export function kvDelete(key: string) {
  db().runSync('DELETE FROM kv WHERE key = ?', [key]);
}
