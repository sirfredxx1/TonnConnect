import db from './db.js';

const getStmt = db.prepare('SELECT value FROM tonconnect_storage WHERE key = ?');
const setStmt = db.prepare(
  `INSERT INTO tonconnect_storage (key, value) VALUES (?, ?)
   ON CONFLICT(key) DO UPDATE SET value = excluded.value`
);
const delStmt = db.prepare('DELETE FROM tonconnect_storage WHERE key = ?');

/**
 * The TON Connect SDK needs an IStorage implementation: { getItem, setItem, removeItem }.
 * Every Telegram user needs their own isolated connection state, so we namespace
 * every key with their telegram_id.
 */
export class SqliteStorage {
  constructor(telegramId) {
    this.prefix = `user:${telegramId}:`;
  }

  async getItem(key) {
    const row = getStmt.get(this.prefix + key);
    return row ? row.value : null;
  }

  async setItem(key, value) {
    setStmt.run(this.prefix + key, value);
  }

  async removeItem(key) {
    delStmt.run(this.prefix + key);
  }
}
