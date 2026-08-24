import { Bot, InlineKeyboard } from 'grammy';
import { t } from './locales.js';
import { upsertUserLanguage, getUser, clearWallet } from './db.js';

const bot = new Bot(process.env.BOT_TOKEN);
const WEBAPP_URL = process.env.WEBAPP_URL;

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

export default bot;
