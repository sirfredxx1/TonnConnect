# TON Connect Telegram Bot

A Telegram bot with two onboarding pages:

1. **Language selection** — English / Русский
2. **Wallet connect** — lets the user pick their wallet (Tonkeeper, MyTonWallet, Tonhub, etc.) and link it via [TON Connect](https://docs.ton.org/develop/dapps/ton-connect/overview).

## Stack

- **[grammY](https://grammy.dev/)** — Telegram bot framework
- **[@tonconnect/sdk](https://github.com/ton-connect/sdk)** — official TON Connect client
- **better-sqlite3** — stores each user's language + linked wallet address in a local `data.sqlite` file
- **express** — hosts `manifest.json`, which TON Connect requires to be public

## 1. Install

```bash
npm install
```

## 2. Configure

```bash
cp .env.example .env
```

Fill in `.env`:

| Variable | How to get it |
|---|---|
| `BOT_TOKEN` | Message [@BotFather](https://t.me/BotFather) on Telegram → `/newbot` |
| `PORT` | Leave as `3000` unless your host requires otherwise |
| `TONCONNECT_MANIFEST_URL` | The public URL where `manifest.json` will be reachable once deployed (see below) |

## 3. About `manifest.json`

TON wallets fetch this file to show your bot's name/icon when a user approves a connection. **It must be served over public HTTPS** — this is a TON Connect requirement, not optional.

- This project already serves it for you at `/manifest.json` via the built-in Express server.
- Locally, you can test with a tunnel like `ngrok http 3000`, then set `TONCONNECT_MANIFEST_URL` to the ngrok HTTPS URL + `/manifest.json`.
- In production, deploy this whole app (e.g. to Render, Railway, Fly.io, or a VPS) and point `TONCONNECT_MANIFEST_URL` at `https://<your-deployed-domain>/manifest.json`.
- Update the placeholder fields inside `manifest.json` itself (`url`, `name`, `iconUrl`) to match your bot.

## 4. Run

```bash
npm start
```

## How it works

- `/start` → shows the language keyboard (Page 1).
- Choosing a language saves it to SQLite and immediately shows the wallet-connect keyboard (Page 2), with one button per supported wallet.
- Tapping a wallet opens a TON Connect universal link → the wallet app asks the user to approve → the bot is notified automatically (`connector.onStatusChange`) and confirms the linked address back in chat.
- `/connect` — re-open the wallet connect page any time.
- `/wallet` — check current connection status.
- `/disconnect` — unlink the wallet.

## Project structure

```
src/
  index.js       entry point
  bot.js         bot commands + the two onboarding pages
  tonconnect.js  TON Connect connector management
  storage.js     SQLite-backed storage adapter for the TON Connect SDK
  db.js          SQLite schema + user queries
  locales.js     English / Russian strings
  server.js      hosts manifest.json publicly
manifest.json    your app's TON Connect identity (edit before deploying)
```

## Notes for going further

- Right now wallet connections are held in memory (`Map` in `tonconnect.js`) plus persisted to SQLite — fine for a single bot instance. If you ever scale to multiple processes, you'd move that in-memory map to something shared (e.g. Redis).
- `restoreAllConnections()` runs on boot so already-linked users stay linked across restarts.
- To request a signed proof of wallet ownership (`ton_proof`) rather than just the address, pass a `tonProof` payload into `connector.connect()` — happy to add that if you need it.
