/**
 * Multi-Currency Configuration for Global Exchange
 * Phase 3: Support for 50+ fiat currencies with real-time conversion
 */

const currencies = {
  // Major Fiat Currencies
  'USD': { name: 'US Dollar', symbol: '$', decimal_places: 2, region: 'North America' },
  'EUR': { name: 'Euro', symbol: '€', decimal_places: 2, region: 'Europe' },
  'GBP': { name: 'British Pound', symbol: '£', decimal_places: 2, region: 'Europe' },
  'JPY': { name: 'Japanese Yen', symbol: '¥', decimal_places: 0, region: 'Asia' },
  'CAD': { name: 'Canadian Dollar', symbol: 'C$', decimal_places: 2, region: 'North America' },
  'AUD': { name: 'Australian Dollar', symbol: 'A$', decimal_places: 2, region: 'Asia Pacific' },
  'CHF': { name: 'Swiss Franc', symbol: 'CHF', decimal_places: 2, region: 'Europe' },
  'CNY': { name: 'Chinese Yuan', symbol: '¥', decimal_places: 2, region: 'Asia' },
  'SEK': { name: 'Swedish Krona', symbol: 'kr', decimal_places: 2, region: 'Europe' },
  'NZD': { name: 'New Zealand Dollar', symbol: 'NZ$', decimal_places: 2, region: 'Asia Pacific' },
  
  // European Currencies
  'NOK': { name: 'Norwegian Krone', symbol: 'kr', decimal_places: 2, region: 'Europe' },
  'DKK': { name: 'Danish Krone', symbol: 'kr', decimal_places: 2, region: 'Europe' },
  'PLN': { name: 'Polish Zloty', symbol: 'zł', decimal_places: 2, region: 'Europe' },
  'CZK': { name: 'Czech Koruna', symbol: 'Kč', decimal_places: 2, region: 'Europe' },
  'HUF': { name: 'Hungarian Forint', symbol: 'Ft', decimal_places: 0, region: 'Europe' },
  'RON': { name: 'Romanian Leu', symbol: 'lei', decimal_places: 2, region: 'Europe' },
  'BGN': { name: 'Bulgarian Lev', symbol: 'лв', decimal_places: 2, region: 'Europe' },
  'HRK': { name: 'Croatian Kuna', symbol: 'kn', decimal_places: 2, region: 'Europe' },
  
  // Asian Currencies
  'SGD': { name: 'Singapore Dollar', symbol: 'S$', decimal_places: 2, region: 'Asia' },
  'HKD': { name: 'Hong Kong Dollar', symbol: 'HK$', decimal_places: 2, region: 'Asia' },
  'KRW': { name: 'South Korean Won', symbol: '₩', decimal_places: 0, region: 'Asia' },
  'INR': { name: 'Indian Rupee', symbol: '₹', decimal_places: 2, region: 'Asia' },
  'THB': { name: 'Thai Baht', symbol: '฿', decimal_places: 2, region: 'Asia' },
  'MYR': { name: 'Malaysian Ringgit', symbol: 'RM', decimal_places: 2, region: 'Asia' },
  'IDR': { name: 'Indonesian Rupiah', symbol: 'Rp', decimal_places: 0, region: 'Asia' },
  'PHP': { name: 'Philippine Peso', symbol: '₱', decimal_places: 2, region: 'Asia' },
  'VND': { name: 'Vietnamese Dong', symbol: '₫', decimal_places: 0, region: 'Asia' },
  'TWD': { name: 'Taiwan Dollar', symbol: 'NT$', decimal_places: 2, region: 'Asia' },
  
  // Americas
  'MXN': { name: 'Mexican Peso', symbol: '$', decimal_places: 2, region: 'North America' },
  'BRL': { name: 'Brazilian Real', symbol: 'R$', decimal_places: 2, region: 'South America' },
  'ARS': { name: 'Argentine Peso', symbol: '$', decimal_places: 2, region: 'South America' },
  'CLP': { name: 'Chilean Peso', symbol: '$', decimal_places: 0, region: 'South America' },
  'COP': { name: 'Colombian Peso', symbol: '$', decimal_places: 2, region: 'South America' },
  'PEN': { name: 'Peruvian Sol', symbol: 'S/', decimal_places: 2, region: 'South America' },
  
  // Middle East & Africa
  'AED': { name: 'UAE Dirham', symbol: 'د.إ', decimal_places: 2, region: 'Middle East' },
  'SAR': { name: 'Saudi Riyal', symbol: '﷼', decimal_places: 2, region: 'Middle East' },
  'QAR': { name: 'Qatari Riyal', symbol: '﷼', decimal_places: 2, region: 'Middle East' },
  'KWD': { name: 'Kuwaiti Dinar', symbol: 'د.ك', decimal_places: 3, region: 'Middle East' },
  'BHD': { name: 'Bahraini Dinar', symbol: '.د.ب', decimal_places: 3, region: 'Middle East' },
  'ILS': { name: 'Israeli Shekel', symbol: '₪', decimal_places: 2, region: 'Middle East' },
  'TRY': { name: 'Turkish Lira', symbol: '₺', decimal_places: 2, region: 'Middle East' },
  'ZAR': { name: 'South African Rand', symbol: 'R', decimal_places: 2, region: 'Africa' },
  'EGP': { name: 'Egyptian Pound', symbol: '£', decimal_places: 2, region: 'Africa' },
  'NGN': { name: 'Nigerian Naira', symbol: '₦', decimal_places: 2, region: 'Africa' },
  
  // Russia & CIS
  'RUB': { name: 'Russian Ruble', symbol: '₽', decimal_places: 2, region: 'Europe' },
  'UAH': { name: 'Ukrainian Hryvnia', symbol: '₴', decimal_places: 2, region: 'Europe' },
  'KZT': { name: 'Kazakhstani Tenge', symbol: '₸', decimal_places: 2, region: 'Asia' },
  
  // Major Cryptocurrencies
  'BTC': { name: 'Bitcoin', symbol: '₿', decimal_places: 8, region: 'Global' },
  'ETH': { name: 'Ethereum', symbol: 'Ξ', decimal_places: 8, region: 'Global' },
  'USDT': { name: 'Tether', symbol: '₮', decimal_places: 6, region: 'Global' },
  'USDC': { name: 'USD Coin', symbol: '$', decimal_places: 6, region: 'Global' },
  'BNB': { name: 'Binance Coin', symbol: 'BNB', decimal_places: 8, region: 'Global' },
  'ADA': { name: 'Cardano', symbol: '₳', decimal_places: 6, region: 'Global' },
  'SOL': { name: 'Solana', symbol: 'SOL', decimal_places: 9, region: 'Global' },
  'DOT': { name: 'Polkadot', symbol: 'DOT', decimal_places: 10, region: 'Global' }
};

const exchange_rate_providers = {
  primary: 'fixer.io',
  secondary: 'exchangerate-api.com',
  crypto: 'coinmarketcap.com',
  fallback: 'currencylayer.com',
  update_interval: 60, // seconds
  cache_duration: 300, // 5 minutes
};

const regional_payment_methods = {
  'us-east-1': {
    fiat: ['credit_card', 'debit_card', 'bank_transfer', 'wire_transfer', 'paypal'],
    crypto: ['bitcoin', 'ethereum', 'usdc', 'usdt'],
    instant_settlement: ['stripe', 'paypal'],
    settlement_time: {
      credit_card: 'instant',
      bank_transfer: '1-3 business days',
      wire_transfer: '1-2 business days',
      crypto: '10-60 minutes'
    }
  },
  'eu-west-1': {
    fiat: ['credit_card', 'debit_card', 'sepa_transfer', 'wire_transfer', 'ideal', 'sofort'],
    crypto: ['bitcoin', 'ethereum', 'usdc', 'usdt'],
    instant_settlement: ['adyen', 'stripe'],
    settlement_time: {
      credit_card: 'instant',
      sepa_transfer: '1-2 business days',
      wire_transfer: '1-2 business days',
      crypto: '10-60 minutes'
    }
  },
  'ap-southeast-1': {
    fiat: ['credit_card', 'debit_card', 'bank_transfer', 'alipay', 'wechat_pay'],
    crypto: ['bitcoin', 'ethereum', 'usdc', 'usdt'],
    instant_settlement: ['stripe', 'adyen'],
    settlement_time: {
      credit_card: 'instant',
      bank_transfer: '1-3 business days',
      alipay: 'instant',
      crypto: '10-60 minutes'
    }
  }
};

const localization_config = {
  date_formats: {
    'en': 'MM/DD/YYYY',
    'de': 'DD.MM.YYYY',
    'fr': 'DD/MM/YYYY',
    'es': 'DD/MM/YYYY',
    'it': 'DD/MM/YYYY',
    'zh': 'YYYY-MM-DD',
    'ja': 'YYYY/MM/DD',
    'ko': 'YYYY.MM.DD'
  },
  number_formats: {
    'en': { decimal: '.', thousands: ',' },
    'de': { decimal: ',', thousands: '.' },
    'fr': { decimal: ',', thousands: ' ' },
    'es': { decimal: ',', thousands: '.' },
    'it': { decimal: ',', thousands: '.' },
    'zh': { decimal: '.', thousands: ',' },
    'ja': { decimal: '.', thousands: ',' },
    'ko': { decimal: '.', thousands: ',' }
  }
};

module.exports = {
  currencies,
  exchange_rate_providers,
  regional_payment_methods,
  localization_config,
  
  getSupportedCurrencies: () => Object.keys(currencies),
  
  getCurrencyInfo: (currencyCode) => currencies[currencyCode],
  
  getCurrenciesByRegion: (region) => {
    return Object.entries(currencies)
      .filter(([code, info]) => info.region === region)
      .map(([code]) => code);
  },
  
  formatCurrency: (amount, currencyCode, locale = 'en') => {
    const currency = currencies[currencyCode];
    if (!currency) return amount.toString();
    
    const localeConfig = localization_config.number_formats[locale] || localization_config.number_formats['en'];
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: currency.decimal_places,
      maximumFractionDigits: currency.decimal_places
    }).format(amount);
  },
  
  getPaymentMethods: (region) => regional_payment_methods[region] || regional_payment_methods['us-east-1']
};