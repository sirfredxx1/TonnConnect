import crypto from 'crypto';

// Verifies that `initData` really came from Telegram for this bot, per
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
// Every endpoint that acts on behalf of a user (saving a wallet, paying an
// order) MUST go through this — never trust a telegram_id sent as plain JSON,
// since anyone could otherwise submit actions as if they were someone else.
export function verifyInitData(initData) {
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

  // initData also carries an auth_date — reject if stale (>1hr old) so a
  // leaked/replayed initData string can't be reused indefinitely.
  const authDate = Number(params.get('auth_date') || 0);
  if (!authDate || Date.now() / 1000 - authDate > 3600) return null;

  return JSON.parse(params.get('user') || 'null');
}
