import { Bot, InlineKeyboard } from 'grammy';
import { t } from './locales.js';
import { upsertUserLanguage, getUser, saveWalletAddress, clearWallet } from './db.js';
import { getConnector, getLinkableWallets, buildConnectLink, disconnect, restoreConnection } from './tonconnect.js';

const bot = new Bot(process.env.BOT_TOKEN);

// Track which users currently have an active onStatusChange listener,
// so we don't stack duplicate listeners if they hit /connect repeatedly.
const listening = new Set();

// ---------- Page 1: language selection ----------

bot.command('start', async (ctx) => {
  const keyboard = new InlineKeyboard()
    .text('🇬🇧 English', 'lang:en')
    .text('🇷🇺 Русский', 'lang:ru');

  await ctx.reply(
    `${t('en').chooseLanguage}\n${t('ru').chooseLanguage}`,
    { reply_markup: keyboard }
  );
});

bot.callbackQuery(/^lang:(en|ru)$/, async (ctx) => {
  const language = ctx.match[1];
  upsertUserLanguage(ctx.from.id, language);
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(t(language).languageSet);
  await sendConnectPage(ctx, ctx.from.id, language);
});

// ---------- Page 2: wallet connect ----------

async function sendConnectPage(ctx, telegramId, language) {
  const strings = t(language);
  const user = getUser(telegramId);

  if (user?.wallet_address) {
    await ctx.reply(strings.alreadyConnected(user.wallet_address), { parse_mode: 'Markdown' });
    return;
  }

  let wallets;
  try {
    wallets = await getLinkableWallets();
  } catch (err) {
    console.error('Failed to fetch wallet list:', err);
    await ctx.reply(strings.error);
    return;
  }

  if (!wallets.length) {
    await ctx.reply(strings.noWallets);
    return;
  }

  const keyboard = new InlineKeyboard();
  for (const wallet of wallets) {
    const link = buildConnectLink(telegramId, wallet);
    keyboard.url(wallet.name, link).row();
  }

  await ctx.reply(`${strings.connectTitle}\n\n${strings.connectBody}`, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });

  listenForConnection(telegramId, ctx.chat.id, language);
}

function listenForConnection(telegramId, chatId, language) {
  if (listening.has(telegramId)) return;
  listening.add(telegramId);

  const connector = getConnector(telegramId);
  const strings = t(language);

  const unsubscribe = connector.onStatusChange(
    async (walletInfo) => {
      listening.delete(telegramId);
      unsubscribe();

      if (walletInfo) {
        const address = walletInfo.account.address;
        saveWalletAddress(telegramId, address);
        await bot.api.sendMessage(chatId, strings.connected(address), { parse_mode: 'Markdown' });
      }
    },
    (error) => {
      listening.delete(telegramId);
      unsubscribe();
      console.error('TON Connect error:', error);
      bot.api.sendMessage(chatId, strings.error).catch(() => {});
    }
  );
}

// ---------- Utility commands ----------

bot.command('connect', async (ctx) => {
  const user = getUser(ctx.from.id);
  const language = user?.language || 'en';
  await sendConnectPage(ctx, ctx.from.id, language);
});

bot.command('wallet', async (ctx) => {
  const user = getUser(ctx.from.id);
  const language = user?.language || 'en';
  const strings = t(language);
  await ctx.reply(
    user?.wallet_address ? strings.alreadyConnected(user.wallet_address) : strings.notConnected,
    { parse_mode: 'Markdown' }
  );
});

bot.command('disconnect', async (ctx) => {
  const user = getUser(ctx.from.id);
  const language = user?.language || 'en';
  const strings = t(language);
  try {
    await disconnect(ctx.from.id);
  } catch {
    // no active connection — fine, just clear local state
  }
  clearWallet(ctx.from.id);
  await ctx.reply(strings.disconnected);
});

// Try to restore any previously saved connection when the bot boots
// (e.g. after a restart, so we don't lose track of already-linked wallets).
export async function restoreAllConnections() {
  const db = (await import('./db.js')).default;
  const rows = db.prepare('SELECT telegram_id FROM users WHERE wallet_address IS NOT NULL').all();
  for (const { telegram_id } of rows) {
    try {
      await restoreConnection(telegram_id);
    } catch (err) {
      console.warn(`Could not restore connection for user ${telegram_id}:`, err.message);
    }
  }
}

export default bot;
