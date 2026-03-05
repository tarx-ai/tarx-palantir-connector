/**
 * OSDK offline-first sync pattern
 * Queue writes locally → sync to Foundry when connected
 */

import Database from "better-sqlite3"

const db = new Database(`${process.env.HOME}/.tarx/palantir-cache.db`)

db.exec(`
  CREATE TABLE IF NOT EXISTS sync_queue (
    id          TEXT PRIMARY KEY,
    object_type TEXT NOT NULL,
    payload     TEXT NOT NULL,
    created_at  INTEGER DEFAULT (unixepoch()),
    synced_at   INTEGER,
    status      TEXT DEFAULT 'pending'
  );
  CREATE TABLE IF NOT EXISTS ontology_cache (
    object_type TEXT NOT NULL,
    object_id   TEXT NOT NULL,
    data        TEXT NOT NULL,
    cached_at   INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (object_type, object_id)
  );
`)

async function isFoundryReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${process.env.FOUNDRY_URL}/health`, {
      signal: AbortSignal.timeout(3_000),
    })
    return res.ok
  } catch {
    return false
  }
}

export function queueWrite(
  objectType: string,
  payload: Record<string, unknown>
): string {
  const id = crypto.randomUUID()
  db.prepare(
    "INSERT INTO sync_queue (id, object_type, payload) VALUES (?, ?, ?)"
  ).run(id, objectType, JSON.stringify(payload))
  syncQueue().catch(() => {})
  return id
}

export async function syncQueue() {
  if (!(await isFoundryReachable())) return

  const pending = db
    .prepare("SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC")
    .all() as Array<{ id: string; object_type: string; payload: string }>

  for (const item of pending) {
    try {
      // Replace with actual OSDK write for your object types
      console.log(`[TARX] Syncing ${item.object_type}: ${item.id}`)
      db.prepare(
        "UPDATE sync_queue SET status = 'synced', synced_at = unixepoch() WHERE id = ?"
      ).run(item.id)
    } catch {
      db.prepare("UPDATE sync_queue SET status = 'failed' WHERE id = ?").run(item.id)
    }
  }
}

// Auto-sync every 30s when Foundry becomes reachable
setInterval(async () => {
  const { count } = db
    .prepare("SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending'")
    .get() as { count: number }
  if (count > 0) await syncQueue()
}, 30_000)
