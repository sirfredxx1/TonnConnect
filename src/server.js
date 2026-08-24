import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { saveWalletAddress, getUser } from './db.js';
import { t } from './locales.js';

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

// Verifies that `initData` really came from Telegram for this bot, per
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
function verifyInitData(initData) {
  if (!initData) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(process.env.BOT_TOKEN)
    .digest();

  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (computedHash !== hash) return null;

  return JSON.parse(params.get('user') || 'null');
}

let botApiRef = null;
export function attachBotApi(api) {
  botApiRef = api;
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

  // Also confirm it in the chat, same as the old bot-driven flow did.
  if (botApiRef) {
    const dbUser = getUser(user.id);
    const strings = t(dbUser?.language || 'en');
    botApiRef.sendMessage(user.id, strings.connected(address), { parse_mode: 'Markdown' }).catch(() => {});
  }

  res.json({ ok: true });
});

export function startServer() {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}
