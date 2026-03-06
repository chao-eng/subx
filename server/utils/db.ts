import Database from 'better-sqlite3'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

let _db: Database.Database | null = null

export function useDb() {
  if (_db) return _db

  const config = useRuntimeConfig()
  const dbPath = process.env.DB_PATH || join(process.cwd(), 'db', 'subx.db')
  const dbDir = join(dbPath, '..')

  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }

  _db = new Database(dbPath)
  _db.pragma('journal_mode = WAL')

  // Initialize tables
  _db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      task_id TEXT PRIMARY KEY,
      file_path TEXT NOT NULL,
      source_type TEXT NOT NULL DEFAULT 'embedded',
      track_index INTEGER,
      model TEXT NOT NULL,
      target_lang TEXT NOT NULL DEFAULT 'zh-CN',
      output_mode TEXT NOT NULL DEFAULT 'translated',
      style_preset TEXT NOT NULL DEFAULT 'default',
      status TEXT NOT NULL DEFAULT 'queued',
      progress INTEGER NOT NULL DEFAULT 0,
      total_chunks INTEGER DEFAULT 0,
      done_chunks INTEGER DEFAULT 0,
      output_path TEXT,
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS translation_cache (
      hash TEXT PRIMARY KEY,
      source_text TEXT NOT NULL,
      translated TEXT NOT NULL,
      model TEXT NOT NULL,
      target_lang TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS task_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL,
      chunk_index INTEGER,
      model TEXT,
      raw_response TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  // Safe migration: add style_preset column to existing databases
  try {
    _db.exec(`ALTER TABLE tasks ADD COLUMN style_preset TEXT NOT NULL DEFAULT 'default'`)
  } catch { /* column already exists */ }

  return _db
}
