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

// bot.start() rejects on things like a 409 "another getUpdates request" conflict
// — this happens briefly during every redeploy, while the OLD instance is still
// polling as the NEW one comes up. Without this retry wrapper, that rejection
// was unhandled and crashed the entire process (web server included), which is
// what caused the crash-loop you saw in the Render logs. Now we just wait and
// retry until the old instance actually stops (normally within a few seconds).
async function startBotWithRetry() {
  for (;;) {
    try {
      console.log('🤖 Starting bot polling…');
      await bot.start({
        onStart: () => console.log('🤖 Bot is running.'),
      });
      break; // bot.start() only resolves after a clean bot.stop() — normal exit
    } catch (err) {
      console.error('Bot polling failed, retrying in 5s:', err.message);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

startBotWithRetry();
