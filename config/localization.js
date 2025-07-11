/**
 * Localization Configuration for Global Market Support
 * Phase 3: Support for 20+ languages with cultural adaptations
 */

const languages = {
  'en': {
    name: 'English',
    nativeName: 'English',
    region: 'Global',
    direction: 'ltr',
    currency_position: 'before', // $100
    date_format: 'MM/DD/YYYY',
    time_format: '12h',
    number_format: {
      decimal: '.',
      thousands: ',',
      grouping: [3]
    },
    cultural_adaptations: {
      colors: { primary: '#007bff', success: '#28a745', danger: '#dc3545' },
      icons: 'western',
      layout: 'standard'
    }
  },
  
  'es': {
    name: 'Spanish',
    nativeName: 'Español',
    region: 'Spain, Latin America',
    direction: 'ltr',
    currency_position: 'before',
    date_format: 'DD/MM/YYYY',
    time_format: '24h',
    number_format: {
      decimal: ',',
      thousands: '.',
      grouping: [3]
    },
    cultural_adaptations: {
      colors: { primary: '#c41e3a', success: '#28a745', danger: '#dc3545' },
      icons: 'western',
      layout: 'standard'
    }
  },
  
  'fr': {
    name: 'French',
    nativeName: 'Français',
    region: 'France, Canada, Africa',
    direction: 'ltr',
    currency_position: 'after', // 100€
    date_format: 'DD/MM/YYYY',
    time_format: '24h',
    number_format: {
      decimal: ',',
      thousands: ' ',
      grouping: [3]
    },
    cultural_adaptations: {
      colors: { primary: '#0055a4', success: '#28a745', danger: '#ef4135' },
      icons: 'western',
      layout: 'standard'
    }
  },
  
  'de': {
    name: 'German',
    nativeName: 'Deutsch',
    region: 'Germany, Austria, Switzerland',
    direction: 'ltr',
    currency_position: 'after',
    date_format: 'DD.MM.YYYY',
    time_format: '24h',
    number_format: {
      decimal: ',',
      thousands: '.',
      grouping: [3]
    },
    cultural_adaptations: {
      colors: { primary: '#000000', success: '#28a745', danger: '#dd0000' },
      icons: 'western',
      layout: 'standard'
    }
  },
  
  'it': {
    name: 'Italian',
    nativeName: 'Italiano',
    region: 'Italy',
    direction: 'ltr',
    currency_position: 'after',
    date_format: 'DD/MM/YYYY',
    time_format: '24h',
    number_format: {
      decimal: ',',
      thousands: '.',
      grouping: [3]
    },
    cultural_adaptations: {
      colors: { primary: '#009246', success: '#28a745', danger: '#ce2b37' },
      icons: 'western',
      layout: 'standard'
    }
  },
  
  'pt': {
    name: 'Portuguese',
    nativeName: 'Português',
    region: 'Brazil, Portugal',
    direction: 'ltr',
    currency_position: 'before',
    date_format: 'DD/MM/YYYY',
    time_format: '24h',
    number_format: {
      decimal: ',',
      thousands: '.',
      grouping: [3]
    },
    cultural_adaptations: {
      colors: { primary: '#009639', success: '#28a745', danger: '#ffdf00' },
      icons: 'western',
      layout: 'standard'
    }
  },
  
  'zh': {
    name: 'Chinese Simplified',
    nativeName: '简体中文',
    region: 'China',
    direction: 'ltr',
    currency_position: 'before', // ¥100
    date_format: 'YYYY-MM-DD',
    time_format: '24h',
    number_format: {
      decimal: '.',
      thousands: ',',
      grouping: [4] // Chinese grouping by 10,000
    },
    cultural_adaptations: {
      colors: { primary: '#de2910', success: '#52c41a', danger: '#ff4d4f', gold: '#faad14' },
      icons: 'chinese',
      layout: 'compact',
      lucky_numbers: [6, 8, 9],
      unlucky_numbers: [4]
    }
  },
  
  'zh-TW': {
    name: 'Chinese Traditional',
    nativeName: '繁體中文',
    region: 'Taiwan, Hong Kong',
    direction: 'ltr',
    currency_position: 'before',
    date_format: 'YYYY/MM/DD',
    time_format: '24h',
    number_format: {
      decimal: '.',
      thousands: ',',
      grouping: [4]
    },
    cultural_adaptations: {
      colors: { primary: '#fe0000', success: '#52c41a', danger: '#ff4d4f' },
      icons: 'chinese',
      layout: 'compact'
    }
  },
  
  'ja': {
    name: 'Japanese',
    nativeName: '日本語',
    region: 'Japan',
    direction: 'ltr',
    currency_position: 'before', // ¥100
    date_format: 'YYYY/MM/DD',
    time_format: '24h',
    number_format: {
      decimal: '.',
      thousands: ',',
      grouping: [4]
    },
    cultural_adaptations: {
      colors: { primary: '#bc002d', success: '#389e0d', danger: '#cf1322' },
      icons: 'japanese',
      layout: 'clean_minimal'
    }
  },
  
  'ko': {
    name: 'Korean',
    nativeName: '한국어',
    region: 'South Korea',
    direction: 'ltr',
    currency_position: 'before', // ₩100
    date_format: 'YYYY.MM.DD',
    time_format: '24h',
    number_format: {
      decimal: '.',
      thousands: ',',
      grouping: [4]
    },
    cultural_adaptations: {
      colors: { primary: '#003478', success: '#52c41a', danger: '#cd212a' },
      icons: 'korean',
      layout: 'modern'
    }
  },
  
  'ar': {
    name: 'Arabic',
    nativeName: 'العربية',
    region: 'Middle East, North Africa',
    direction: 'rtl',
    currency_position: 'after', // 100 ر.س
    date_format: 'DD/MM/YYYY',
    time_format: '12h',
    number_format: {
      decimal: '.',
      thousands: ',',
      grouping: [3]
    },
    cultural_adaptations: {
      colors: { primary: '#006233', success: '#52c41a', danger: '#ce2029' },
      icons: 'arabic',
      layout: 'rtl_optimized'
    }
  },
  
  'ru': {
    name: 'Russian',
    nativeName: 'Русский',
    region: 'Russia, CIS',
    direction: 'ltr',
    currency_position: 'after', // 100₽
    date_format: 'DD.MM.YYYY',
    time_format: '24h',
    number_format: {
      decimal: ',',
      thousands: ' ',
      grouping: [3]
    },
    cultural_adaptations: {
      colors: { primary: '#0039a6', success: '#52c41a', danger: '#d52b1e' },
      icons: 'cyrillic',
      layout: 'standard'
    }
  },
  
  'hi': {
    name: 'Hindi',
    nativeName: 'हिन्दी',
    region: 'India',
    direction: 'ltr',
    currency_position: 'before', // ₹100
    date_format: 'DD/MM/YYYY',
    time_format: '12h',
    number_format: {
      decimal: '.',
      thousands: ',',
      grouping: [3, 2] // Indian numbering system
    },
    cultural_adaptations: {
      colors: { primary: '#ff9933', success: '#138808', danger: '#ff0000' },
      icons: 'indian',
      layout: 'standard'
    }
  },
  
  'th': {
    name: 'Thai',
    nativeName: 'ไทย',
    region: 'Thailand',
    direction: 'ltr',
    currency_position: 'before', // ฿100
    date_format: 'DD/MM/YYYY',
    time_format: '24h',
    number_format: {
      decimal: '.',
      thousands: ',',
      grouping: [3]
    },
    cultural_adaptations: {
      colors: { primary: '#ed1c24', success: '#52c41a', danger: '#ff4d4f' },
      icons: 'thai',
      layout: 'standard'
    }
  },
  
  'vi': {
    name: 'Vietnamese',
    nativeName: 'Tiếng Việt',
    region: 'Vietnam',
    direction: 'ltr',
    currency_position: 'after', // 100₫
    date_format: 'DD/MM/YYYY',
    time_format: '24h',
    number_format: {
      decimal: ',',
      thousands: '.',
      grouping: [3]
    },
    cultural_adaptations: {
      colors: { primary: '#da020e', success: '#52c41a', danger: '#ff4d4f' },
      icons: 'vietnamese',
      layout: 'standard'
    }
  },
  
  'id': {
    name: 'Indonesian',
    nativeName: 'Bahasa Indonesia',
    region: 'Indonesia',
    direction: 'ltr',
    currency_position: 'before', // Rp100
    date_format: 'DD/MM/YYYY',
    time_format: '24h',
    number_format: {
      decimal: ',',
      thousands: '.',
      grouping: [3]
    },
    cultural_adaptations: {
      colors: { primary: '#ff0000', success: '#52c41a', danger: '#ff4d4f' },
      icons: 'indonesian',
      layout: 'standard'
    }
  },
  
  'ms': {
    name: 'Malay',
    nativeName: 'Bahasa Melayu',
    region: 'Malaysia',
    direction: 'ltr',
    currency_position: 'before', // RM100
    date_format: 'DD/MM/YYYY',
    time_format: '12h',
    number_format: {
      decimal: '.',
      thousands: ',',
      grouping: [3]
    },
    cultural_adaptations: {
      colors: { primary: '#010066', success: '#52c41a', danger: '#cc0001' },
      icons: 'malay',
      layout: 'standard'
    }
  },
  
  'tr': {
    name: 'Turkish',
    nativeName: 'Türkçe',
    region: 'Turkey',
    direction: 'ltr',
    currency_position: 'after', // 100₺
    date_format: 'DD.MM.YYYY',
    time_format: '24h',
    number_format: {
      decimal: ',',
      thousands: '.',
      grouping: [3]
    },
    cultural_adaptations: {
      colors: { primary: '#e30a17', success: '#52c41a', danger: '#ff4d4f' },
      icons: 'turkish',
      layout: 'standard'
    }
  },
  
  'nl': {
    name: 'Dutch',
    nativeName: 'Nederlands',
    region: 'Netherlands',
    direction: 'ltr',
    currency_position: 'after', // €100
    date_format: 'DD-MM-YYYY',
    time_format: '24h',
    number_format: {
      decimal: ',',
      thousands: '.',
      grouping: [3]
    },
    cultural_adaptations: {
      colors: { primary: '#21468b', success: '#52c41a', danger: '#ae1c28' },
      icons: 'western',
      layout: 'standard'
    }
  },
  
  'sv': {
    name: 'Swedish',
    nativeName: 'Svenska',
    region: 'Sweden',
    direction: 'ltr',
    currency_position: 'after', // 100 kr
    date_format: 'YYYY-MM-DD',
    time_format: '24h',
    number_format: {
      decimal: ',',
      thousands: ' ',
      grouping: [3]
    },
    cultural_adaptations: {
      colors: { primary: '#006aa7', success: '#52c41a', danger: '#fecc00' },
      icons: 'nordic',
      layout: 'minimal'
    }
  }
};

const timezone_mapping = {
  'us-east-1': ['America/New_York', 'America/Toronto'],
  'eu-west-1': ['Europe/London', 'Europe/Dublin', 'Europe/Paris', 'Europe/Berlin'],
  'ap-southeast-1': ['Asia/Singapore', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Seoul']
};

const market_hours = {
  'NYSE': { open: '09:30', close: '16:00', timezone: 'America/New_York', days: [1,2,3,4,5] },
  'LSE': { open: '08:00', close: '16:30', timezone: 'Europe/London', days: [1,2,3,4,5] },
  'TSE': { open: '09:00', close: '15:00', timezone: 'Asia/Tokyo', days: [1,2,3,4,5] },
  'CRYPTO': { open: '00:00', close: '23:59', timezone: 'UTC', days: [0,1,2,3,4,5,6] } // 24/7
};

module.exports = {
  languages,
  timezone_mapping,
  market_hours,
  
  getSupportedLanguages: () => Object.keys(languages),
  
  getLanguageInfo: (languageCode) => languages[languageCode],
  
  getLanguagesByRegion: (region) => {
    return Object.entries(languages)
      .filter(([code, info]) => info.region.includes(region))
      .map(([code]) => code);
  },
  
  formatNumber: (number, languageCode) => {
    const lang = languages[languageCode] || languages['en'];
    const { decimal, thousands, grouping } = lang.number_format;
    
    // Simple number formatting
    const parts = number.toString().split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1] || '';
    
    // Add thousands separators
    let formatted = '';
    for (let i = integerPart.length; i > 0; i -= grouping[0]) {
      const start = Math.max(0, i - grouping[0]);
      const chunk = integerPart.slice(start, i);
      formatted = thousands + chunk + formatted;
    }
    formatted = formatted.slice(thousands.length); // Remove leading separator
    
    if (decimalPart) {
      formatted += decimal + decimalPart;
    }
    
    return formatted;
  },
  
  formatDate: (date, languageCode) => {
    const lang = languages[languageCode] || languages['en'];
    const format = lang.date_format;
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return format
      .replace('DD', day)
      .replace('MM', month)
      .replace('YYYY', year);
  },
  
  isRTL: (languageCode) => {
    const lang = languages[languageCode];
    return lang ? lang.direction === 'rtl' : false;
  },
  
  getCulturalAdaptations: (languageCode) => {
    const lang = languages[languageCode];
    return lang ? lang.cultural_adaptations : languages['en'].cultural_adaptations;
  }
};