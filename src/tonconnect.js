import { TonConnect, isWalletInfoRemote } from '@tonconnect/sdk';
import { SqliteStorage } from './storage.js';

const MANIFEST_URL = process.env.TONCONNECT_MANIFEST_URL;

if (!MANIFEST_URL) {
  console.warn(
    '⚠️  TONCONNECT_MANIFEST_URL is not set in .env — TON Connect will not work until it is.'
  );
}

// Keep one TonConnect instance per Telegram user for the lifetime of the process.
const connectors = new Map();

export function getConnector(telegramId) {
  if (!connectors.has(telegramId)) {
    const connector = new TonConnect({
      manifestUrl: MANIFEST_URL,
      storage: new SqliteStorage(telegramId),
    });
    connectors.set(telegramId, connector);
  }
  return connectors.get(telegramId);
}

// Fetch the list of wallets that support TON Connect and can be opened via a link
// (i.e. skip browser-extension-only wallets, which are irrelevant inside Telegram).
export async function getLinkableWallets() {
  const connector = new TonConnect({ manifestUrl: MANIFEST_URL });
  const wallets = await connector.getWallets();
  return wallets.filter(isWalletInfoRemote);
}

// Build a per-wallet universal connect link for a given user.
export function buildConnectLink(telegramId, walletInfo) {
  const connector = getConnector(telegramId);
  return connector.connect({
    bridgeUrl: walletInfo.bridgeUrl,
    universalLink: walletInfo.universalLink,
  });
}

// Restore a previously saved connection on startup / reconnect.
export async function restoreConnection(telegramId) {
  const connector = getConnector(telegramId);
  await connector.restoreConnection();
  return connector.connected ? connector.account : null;
}

export function disconnect(telegramId) {
  const connector = getConnector(telegramId);
  return connector.disconnect();
}
