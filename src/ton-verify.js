// Confirms a submitted payment actually landed on-chain before we ever treat
// an order as paid. The client (the Mini App page) telling us "it worked" is
// not sufficient — a compromised or buggy client could claim success for a
// transaction that never happened, was rejected by the wallet, or paid the
// wrong amount. We only trust the chain itself.
//
// Uses TonAPI (https://tonapi.io) — get a free API key at https://tonconsole.com
// and set TONAPI_KEY in your .env. Without a key you're heavily rate-limited.

const TONAPI_BASE = 'https://tonapi.io/v2';

/**
 * Polls the receiver address's recent transactions looking for one that
 * matches this order's amount, arriving after the order was submitted.
 * Returns the transaction hash if found+confirmed, otherwise null.
 *
 * This does basic amount+recency matching, which is enough to catch the
 * common failure modes (client lied, wallet rejected, wrong amount sent).
 * For airtight matching at higher stakes, parse the `boc` we already stored
 * with @ton/core to get its exact hash and match that hash directly instead
 * of matching on amount/time — ask me to add that if you need it.
 */
export async function verifyTonTransaction(order, { attempts = 10, delayMs = 6000 } = {}) {
  if (!process.env.TONAPI_KEY) {
    console.warn(`TONAPI_KEY not set — cannot verify order ${order.id} on-chain. Refusing to auto-confirm.`);
    return null;
  }

  for (let i = 0; i < attempts; i++) {
    await sleep(delayMs);

    try {
      const url = `${TONAPI_BASE}/blockchain/accounts/${order.receiver_address}/transactions?limit=20`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${process.env.TONAPI_KEY}` },
      });
      if (!res.ok) continue;

      const data = await res.json();
      const submittedAtMs = new Date(order.submitted_at + 'Z').getTime();

      const match = (data.transactions || []).find((tx) => {
        const txTimeMs = tx.utime * 1000;
        if (txTimeMs < submittedAtMs - 60_000) return false; // too old, can't be this one
        const inAmount = tx.in_msg?.value;
        return String(inAmount) === String(order.amount_nanoton);
      });

      if (match) return match.hash;
    } catch (err) {
      console.error('TonAPI verification attempt failed:', err.message);
    }
  }

  console.warn(`Order ${order.id} could not be verified on-chain after ${attempts} attempts — left as 'submitted', not confirmed.`);
  return null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
