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

// One row per contract-signing fee owed by a user. A row is only ever created
// by createOrder() below, called from YOUR OWN backend logic (wherever a
// contract gets finalized) — never by the Mini App page itself. The Mini App
// only ever displays and pays an order that already exists here; it cannot
// invent or change an amount. amount_nanoton is a string, not a number,
// because JS floats lose precision on TON's nanoton-scale integers.
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    amount_nanoton TEXT NOT NULL,
    receiver_address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending -> consented -> submitted -> confirmed / failed
    consented_at TEXT,
    consent_wallet_address TEXT,
    tx_boc TEXT,
    tx_hash TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    submitted_at TEXT,
    confirmed_at TEXT
  )
`);

export default db;

/** Create a new contract-signing-fee order. Call this from wherever your own
 * app decides a user owes a signing fee (e.g. right after a contract is drawn
 * up) — this is the only place a debit gets initiated on your side. The user
 * still has to open the Mini App, see the exact terms, tick "I agree", and
 * approve the exact amount in their own wallet before anything moves. */
export function createOrder({ telegramId, description, amountNanoton, receiverAddress }) {
  const info = db
    .prepare(
      `INSERT INTO orders (telegram_id, description, amount_nanoton, receiver_address)
       VALUES (?, ?, ?, ?)`
    )
    .run(telegramId, description, String(amountNanoton), receiverAddress);
  return getOrder(info.lastInsertRowid);
}

export function getOrder(orderId) {
  return db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
}

/** The most recent order this user still needs to act on, if any. */
export function getPendingOrderForUser(telegramId) {
  return db
    .prepare(
      `SELECT * FROM orders WHERE telegram_id = ? AND status IN ('pending', 'consented')
       ORDER BY created_at DESC LIMIT 1`
    )
    .get(telegramId);
}

/** Records that the user reviewed the terms and ticked "I agree" — this,
 * plus the timestamp and the wallet address it came from, is your audit
 * trail of consent. It is NOT a legal opinion on what makes a contract
 * binding in your jurisdiction — have a lawyer confirm that separately. */
export function recordConsent(orderId, walletAddress) {
  db.prepare(
    `UPDATE orders SET status = 'consented', consented_at = datetime('now'),
       consent_wallet_address = ? WHERE id = ? AND status = 'pending'`
  ).run(walletAddress, orderId);
  return getOrder(orderId);
}

export function markOrderSubmitted(orderId, { txBoc }) {
  db.prepare(
    `UPDATE orders SET status = 'submitted', tx_boc = ?, submitted_at = datetime('now')
     WHERE id = ? AND status = 'consented'`
  ).run(txBoc || null, orderId);
  return getOrder(orderId);
}

export function markOrderConfirmed(orderId, txHash) {
  db.prepare(
    `UPDATE orders SET status = 'confirmed', tx_hash = ?, confirmed_at = datetime('now') WHERE id = ?`
  ).run(txHash || null, orderId);
  return getOrder(orderId);
}

export function markOrderFailed(orderId) {
  db.prepare(`UPDATE orders SET status = 'failed' WHERE id = ?`).run(orderId);
  return getOrder(orderId);
}

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
