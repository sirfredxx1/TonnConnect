import { Bot, InlineKeyboard } from 'grammy';
import { t } from './locales.js';
import { upsertUserLanguage, getUser, clearWallet, createOrder } from './db.js';

const bot = new Bot(process.env.BOT_TOKEN);
const WEBAPP_URL = process.env.WEBAPP_URL;
const RECEIVER_ADDRESS = process.env.RECEIVER_ADDRESS;
// Comma-separated Telegram IDs allowed to issue invoices, e.g. "123456,789012"
const ADMIN_IDS = new Set((process.env.ADMIN_TELEGRAM_IDS || '').split(',').filter(Boolean));

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

// ---------- Page 2: wallet connect (now a Mini App) ----------

async function sendConnectPage(ctx, telegramId, language) {
  const strings = t(language);
  const user = getUser(telegramId);

  if (user?.wallet_address) {
    await ctx.reply(strings.alreadyConnected(user.wallet_address), { parse_mode: 'Markdown' });
    return;
  }

  if (!WEBAPP_URL) {
    console.error('WEBAPP_URL is not set in .env — cannot open the Mini App.');
    await ctx.reply(strings.error);
    return;
  }

  const keyboard = new InlineKeyboard().webApp(strings.openApp, WEBAPP_URL);

  await ctx.reply(`${strings.connectTitle}\n\n${strings.connectBody}`, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
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
  // Clears our record. The wallet stays linked in the Mini App's own TonConnect
  // session until the user disconnects it there too — we only track our copy.
  clearWallet(ctx.from.id);
  await ctx.reply(strings.disconnected);
});

// ---------- Issuing a contract-signing fee (admin only) ----------
// Usage: /invoice <telegram_id> <amount_in_ton> <description...>
// This is the ONLY place an order gets created in this bot. In a real deployment
// you'd more likely call createOrder() directly from wherever your contract
// system finalizes a deal, rather than typing this by hand — this command is
// here so you can test the payment flow end-to-end right now.
bot.command('invoice', async (ctx) => {
  if (!ADMIN_IDS.has(String(ctx.from.id))) {
    return ctx.reply('Not authorized.');
  }
  if (!RECEIVER_ADDRESS) {
    return ctx.reply('RECEIVER_ADDRESS is not set in your environment.');
  }

  const parts = (ctx.match || '').trim().split(/\s+/);
  const [targetIdRaw, amountTonRaw, ...descParts] = parts;
  const targetId = Number(targetIdRaw);
  const amountTon = Number(amountTonRaw);
  const description = descParts.join(' ');

  if (!targetId || !amountTon || amountTon <= 0 || !description) {
    return ctx.reply('Usage: /invoice <telegram_id> <amount_in_ton> <description>');
  }

  const amountNanoton = BigInt(Math.round(amountTon * 1e9)).toString();
  const order = createOrder({
    telegramId: targetId,
    description,
    amountNanoton,
    receiverAddress: RECEIVER_ADDRESS,
  });

  await ctx.reply(`Invoice #${order.id} created for user ${targetId}: ${amountTon} TON — "${description}"`);

  const targetUser = getUser(targetId);
  const language = targetUser?.language || 'en';
  const strings = t(language);
  if (WEBAPP_URL) {
    const keyboard = new InlineKeyboard().webApp(strings.openApp, WEBAPP_URL);
    await bot.api.sendMessage(
      targetId,
      `📄 A contract signing fee is ready for your review: *${description}* — ${amountTon} TON.\n\nOpen the app below to review and pay.`,
      { parse_mode: 'Markdown', reply_markup: keyboard }
    ).catch(() => {});
  }
});

export default bot;
