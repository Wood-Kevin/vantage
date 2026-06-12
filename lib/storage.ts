import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;

export async function initDB(): Promise<void> {
  if (db) return;
  db = await SQLite.openDatabaseAsync("toolkit.db");
  await db.execAsync(
    "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)"
  );
}

export async function getSetting(key: string): Promise<string | null> {
  if (!db) return null;
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    [key]
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  if (!db) return;
  await db.runAsync(
    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
    [key, value]
  );
}

// Initialize on module load so the DB is ready before any component calls getSetting/setSetting
initDB().catch(console.error);
