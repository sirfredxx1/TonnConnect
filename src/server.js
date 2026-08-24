import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { saveWalletAddress, getUser, getOrder, getPendingOrderForUser, recordConsent, markOrderSubmitted, markOrderConfirmed } from './db.js';
import { verifyInitData } from './telegram-auth.js';
import { t } from './locales.js';
import { verifyTonTransaction } from './ton-verify.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());

// Serves manifest.json (at /manifest.json) and the Mini App front end (at /)
app.use(express.static(path.join(__dirname, '..')));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (_req, res) => res.send('ok'));

// The Mini App page fetches this to learn where the TonConnect manifest lives,
// so that value only has to be set once, in .env.
app.get('/config.json', (_req, res) => {
  res.json({ manifestUrl: process.env.TONCONNECT_MANIFEST_URL || '' });
});

let botApiRef = null;
export function attachBotApi(api) {
  botApiRef = api;
}

function notify(telegramId, key, ...args) {
  if (!botApiRef) return;
  const dbUser = getUser(telegramId);
  const strings = t(dbUser?.language || 'en');
  const text = typeof strings[key] === 'function' ? strings[key](...args) : strings[key];
  botApiRef.sendMessage(telegramId, text, { parse_mode: 'Markdown' }).catch(() => {});
}

app.post('/api/save-wallet', async (req, res) => {
  const { initData, address } = req.body || {};

  const user = verifyInitData(initData);
  if (!user) {
    return res.status(401).json({ error: 'invalid_init_data' });
  }
  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'missing_address' });
  }

  saveWalletAddress(user.id, address);
  notify(user.id, 'connected', address);

  res.json({ ok: true });
});

// ---------- Contract-signing payment flow ----------
// The amount and description ALWAYS come from a row already created in the
// `orders` table by your own backend logic — this endpoint only ever reads
// it back for display, it never accepts an amount from the client.
app.get('/api/order/pending', (req, res) => {
  const user = verifyInitData(req.query.initData);
  if (!user) return res.status(401).json({ error: 'invalid_init_data' });

  const order = getPendingOrderForUser(user.id);
  if (!order) return res.status(404).json({ error: 'no_pending_order' });

  res.json({
    id: order.id,
    description: order.description,
    amountNanoton: order.amount_nanoton,
    receiverAddress: order.receiver_address,
    status: order.status,
  });
});

// Records that the user reviewed the terms and explicitly ticked "I agree",
// before they're shown the wallet's payment confirmation. This is your
// consent audit trail, not a legal determination of enforceability.
app.post('/api/order/:id/consent', (req, res) => {
  const user = verifyInitData(req.body?.initData);
  if (!user) return res.status(401).json({ error: 'invalid_init_data' });

  const order = getOrder(req.params.id);
  if (!order || order.telegram_id !== user.id) {
    return res.status(404).json({ error: 'order_not_found' });
  }
  if (order.status !== 'pending') {
    return res.status(409).json({ error: 'not_pending', status: order.status });
  }

  const { walletAddress } = req.body || {};
  if (!walletAddress || typeof walletAddress !== 'string') {
    return res.status(400).json({ error: 'missing_wallet_address' });
  }

  const updated = recordConsent(order.id, walletAddress);
  res.json({ ok: true, status: updated.status });
});

// Called once the wallet has broadcast the transaction (tonConnectUI.sendTransaction
// resolved). We do NOT mark the order paid here — only "submitted" — and then
// verify on-chain asynchronously before ever calling it confirmed.
app.post('/api/order/:id/submitted', async (req, res) => {
  const user = verifyInitData(req.body?.initData);
  if (!user) return res.status(401).json({ error: 'invalid_init_data' });

  const order = getOrder(req.params.id);
  if (!order || order.telegram_id !== user.id) {
    return res.status(404).json({ error: 'order_not_found' });
  }
  if (order.status !== 'consented') {
    return res.status(409).json({ error: 'not_consented', status: order.status });
  }

  const { boc } = req.body || {};
  const updated = markOrderSubmitted(order.id, { txBoc: boc });
  res.json({ ok: true, status: updated.status });

  // Fire-and-forget on-chain verification — never trust the client alone for
  // something this sensitive. See ton-verify.js for how this actually checks.
  verifyTonTransaction(order).then((txHash) => {
    if (txHash) {
      markOrderConfirmed(order.id, txHash);
      notify(user.id, 'paymentConfirmed', order.description);
    }
  }).catch((err) => console.error('verification error for order', order.id, err));
});

export function startServer() {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}
