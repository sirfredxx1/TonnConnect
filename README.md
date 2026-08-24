# TON Connect Telegram Mini App

A Telegram bot + Mini App with two onboarding steps:

1. **Language selection** (in-chat) — English / Русский
2. **Wallet connect** (Mini App) — opens a webpage inside Telegram that renders the real [TON Connect UI](https://docs.ton.org/develop/dapps/ton-connect/api/ui) "Connect your TON wallet" sheet, including the built-in **Connect Wallet in Telegram** option.

## Why this changed from a plain bot

The previous version sent inline **URL buttons** straight to wallet apps. That's a valid but different TON Connect flow, and it can't show the native connect sheet — that sheet is drawn by the `@tonconnect/ui` JavaScript widget, which only runs on a real webpage. So now:

- The **bot** only handles chat commands and opens the app (`InlineKeyboard().webApp(...)`).
- A **Mini App page** (`public/index.html`) does the actual connecting, using `@tonconnect/ui` loaded from a CDN — no frontend build step required.
- When a wallet connects, the page posts the address + Telegram's `initData` to `/api/save-wallet`, the server verifies it really came from Telegram (HMAC check against `BOT_TOKEN`), saves it, and the bot sends a confirmation message in chat.

## Stack

- **[grammY](https://grammy.dev/)** — Telegram bot framework
- **[@tonconnect/ui](https://github.com/ton-connect/sdk)** (CDN, client-side) — draws the connect sheet
- **better-sqlite3** — stores each user's language + linked wallet address
- **express** — hosts the Mini App, `manifest.json`, and the save-wallet API

## 1. Install

```bash
npm install
```

## 2. Configure

```bash
cp .env.example .env
```

| Variable | How to get it |
|---|---|
| `BOT_TOKEN` | Message [@BotFather](https://t.me/BotFather) → `/newbot` |
| `PORT` | Leave as `3000` unless your host requires otherwise |
| `TONCONNECT_MANIFEST_URL` | Public HTTPS URL where `manifest.json` will be reachable, e.g. `https://your-app.example.com/manifest.json` |
| `WEBAPP_URL` | Public HTTPS URL of the Mini App itself, e.g. `https://your-app.example.com/` |

Both must be **public HTTPS** — Telegram and TON wallets will not load `http://` or `localhost` URLs. For local development, tunnel port 3000 with something like `ngrok http 3000` and use the ngrok HTTPS URL for both variables.

Also update the placeholder fields in `manifest.json` (`url`, `name`, `iconUrl`) to match your app.

## 3. Register the Mini App with BotFather

This step is what makes the `web_app` button actually open inside Telegram:

1. Message **@BotFather** → `/mybots` → select your bot → **Bot Settings → Menu Button** (or `/newapp` if you want it listed as a full Mini App).
2. Set the URL to your `WEBAPP_URL`.
3. That's it — the inline `web_app` button in `/connect` doesn't need separate registration, but setting the menu button too gives users a persistent way to open it.

## 4. Run

```bash
npm start
```

## How it works

- `/start` → language keyboard.
- Choosing a language saves it and shows a **Connect Wallet** button (a `web_app` button, not a URL).
- Tapping it opens `public/index.html` inside Telegram → `@tonconnect/ui` detects it's running in Telegram and shows the native sheet from your screenshot, including "Connect Wallet in Telegram".
- On connect, the page calls `/api/save-wallet` with the address + Telegram `initData`; the server verifies the signature, saves the address, and the bot confirms it in chat. The page then closes itself.
- `/connect` — reopen the connect button any time.
- `/wallet` — check current connection status.
- `/disconnect` — unlink the wallet on our side (the wallet's own TonConnect session in the Mini App is separate — see Notes below).

## Project structure

```
src/
  index.js       entry point
  bot.js         bot commands + opens the Mini App
  db.js          SQLite schema + user queries
  locales.js     English / Russian strings
  server.js      hosts the Mini App, manifest.json, and /api/save-wallet
public/
  index.html     the Mini App page — TonConnect UI lives here
manifest.json    your app's TON Connect identity (edit before deploying)
```

## Notes for going further

- `/disconnect` currently only clears our saved copy of the address. The wallet connection itself lives in the browser's TonConnect UI session inside the Mini App; if you want a true remote disconnect, add a `tonConnectUI.disconnect()` call reachable from the page (e.g. a "Disconnect" button in `index.html`).
- To request a signed proof of wallet ownership (`ton_proof`) instead of just the address, pass a `tonProofPayload` when constructing `TonConnectUI` in `public/index.html` — happy to add that if you need it.
- If you'd rather build the Mini App with React/Vite instead of a plain HTML file, the same `@tonconnect/ui-react` package and the `/api/save-wallet` contract drop in unchanged.
