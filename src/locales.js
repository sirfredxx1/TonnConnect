export const locales = {
  en: {
    chooseLanguage: '👋 Welcome! Please choose your language:',
    languageSet: 'Language set to English ✅',
    connectTitle: '🔗 *Connect your wallet*',
    connectBody:
      "Tap the button below to open the app and connect your wallet with TON Connect.",
    openApp: '🔗 Connect Wallet',
    connected: (addr) => `✅ Wallet connected!\n\n\`${addr}\``,
    paymentConfirmed: (desc) => `✅ Payment confirmed on-chain for: *${desc}*`,
    alreadyConnected: (addr) => `You already have a wallet linked:\n\n\`${addr}\`\n\nUse /disconnect to unlink it.`,
    disconnected: 'Wallet disconnected. Use /connect to link a new one.',
    notConnected: 'No wallet is linked yet. Use /connect to link one.',
    error: 'Something went wrong. Please try again.',
  },
  ru: {
    chooseLanguage: '👋 Добро пожаловать! Выберите язык:',
    languageSet: 'Язык установлен: Русский ✅',
    connectTitle: '🔗 *Подключите кошелёк*',
    connectBody:
      'Нажмите кнопку ниже, чтобы открыть приложение и подключить кошелёк через TON Connect.',
    openApp: '🔗 Подключить кошелёк',
    connected: (addr) => `✅ Кошелёк подключен!\n\n\`${addr}\``,
    paymentConfirmed: (desc) => `✅ Оплата подтверждена в блокчейне: *${desc}*`,
    alreadyConnected: (addr) => `У вас уже подключен кошелёк:\n\n\`${addr}\`\n\nИспользуйте /disconnect, чтобы отключить его.`,
    disconnected: 'Кошелёк отключен. Используйте /connect, чтобы подключить новый.',
    notConnected: 'Кошелёк ещё не подключен. Используйте /connect, чтобы подключить.',
    error: 'Не удалось выполнить действие. Попробуйте ещё раз.',
  },
};

export function t(language) {
  return locales[language] || locales.en;
}
