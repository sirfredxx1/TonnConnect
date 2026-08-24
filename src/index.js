import 'dotenv/config';
import bot, { restoreAllConnections } from './bot.js';
import { startServer } from './server.js';

if (!process.env.BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is missing from your .env file.');
  process.exit(1);
}

startServer();

await restoreAllConnections();

bot.start();
console.log('🤖 Bot is running.');
