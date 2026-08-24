import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, '..', 'data.sqlite'));

db.pragma('journal_mode = WAL');

// One row per Telegram user: chosen language + linked wallet address (once connected)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    telegram_id INTEGER PRIMARY KEY,
    language TEXT,
    wallet_address TEXT,
    connected_at TEXT
  )
`);

// Generic key/value store used as the persistence layer for the TON Connect SDK
// (the SDK expects a browser-like storage; this gives it one backed by SQLite).
db.exec(`
  CREATE TABLE IF NOT EXISTS tonconnect_storage (
    key TEXT PRIMARY KEY,
    value TEXT
  )
`);

export default db;

export function upsertUserLanguage(telegramId, language) {
  db.prepare(
    `INSERT INTO users (telegram_id, language) VALUES (?, ?)
     ON CONFLICT(telegram_id) DO UPDATE SET language = excluded.language`
  ).run(telegramId, language);
}

export function getUser(telegramId) {
  return db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
}

export function saveWalletAddress(telegramId, address) {
  db.prepare(
    `UPDATE users SET wallet_address = ?, connected_at = datetime('now') WHERE telegram_id = ?`
  ).run(address, telegramId);
}

export function clearWallet(telegramId) {
  db.prepare(
    `UPDATE users SET wallet_address = NULL, connected_at = NULL WHERE telegram_id = ?`
  ).run(telegramId);
}
