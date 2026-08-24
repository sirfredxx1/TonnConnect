import 'dotenv/config';
import bot from './bot.js';
import { startServer, attachBotApi } from './server.js';

if (!process.env.BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is missing from your .env file.');
  process.exit(1);
}
if (!process.env.WEBAPP_URL) {
  console.warn('⚠️  WEBAPP_URL is not set — the /connect button will not work until it is.');
}
if (!process.env.TONCONNECT_MANIFEST_URL) {
  console.warn('⚠️  TONCONNECT_MANIFEST_URL is not set — TON Connect will not work until it is.');
}

startServer();
attachBotApi(bot.api);

bot.start();
console.log('🤖 Bot is running.');
