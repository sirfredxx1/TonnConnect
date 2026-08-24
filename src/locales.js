export const locales = {
  en: {
    chooseLanguage: '👋 Welcome! Please choose your language:',
    languageSet: 'Language set to English ✅',
    connectTitle: '🔗 *Connect your wallet*',
    connectBody:
      "Tap your wallet below to link it with TON Connect.\n\nYou'll be redirected to your wallet app to approve the connection — nothing is shared until you approve it there.",
    noWallets: 'No wallets available right now. Please try again in a moment.',
    connecting: 'Waiting for approval in your wallet…',
    connected: (addr) => `✅ Wallet connected!\n\n\`${addr}\``,
    alreadyConnected: (addr) => `You already have a wallet linked:\n\n\`${addr}\`\n\nUse /disconnect to unlink it.`,
    disconnected: 'Wallet disconnected. Use /connect to link a new one.',
    notConnected: 'No wallet is linked yet. Use /connect to link one.',
    expired: 'That connection request expired. Use /connect to try again.',
    error: 'Something went wrong connecting your wallet. Please try again.',
  },
  ru: {
    chooseLanguage: '👋 Добро пожаловать! Выберите язык:',
    languageSet: 'Язык установлен: Русский ✅',
    connectTitle: '🔗 *Подключите кошелёк*',
    connectBody:
      'Нажмите на свой кошелёк ниже, чтобы подключить его через TON Connect.\n\nВы будете перенаправлены в приложение кошелька для подтверждения — ничего не передаётся, пока вы не подтвердите там.',
    noWallets: 'Кошельки сейчас недоступны. Попробуйте ещё раз через минуту.',
    connecting: 'Ожидание подтверждения в кошельке…',
    connected: (addr) => `✅ Кошелёк подключен!\n\n\`${addr}\``,
    alreadyConnected: (addr) => `У вас уже подключен кошелёк:\n\n\`${addr}\`\n\nИспользуйте /disconnect, чтобы отключить его.`,
    disconnected: 'Кошелёк отключен. Используйте /connect, чтобы подключить новый.',
    notConnected: 'Кошелёк ещё не подключен. Используйте /connect, чтобы подключить.',
    expired: 'Запрос на подключение истёк. Используйте /connect, чтобы попробовать снова.',
    error: 'Не удалось подключить кошелёк. Попробуйте ещё раз.',
  },
};

export function t(language) {
  return locales[language] || locales.en;
}
