// Persian Number Utilities
const PersianUtils = {
    // تبدیل اعداد انگلیسی به فارسی
    toPersianNumbers: function(str) {
        const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return str.toString().replace(/\d/g, x => persianNumbers[parseInt(x)]);
    },

    // تبدیل اعداد فارسی به انگلیسی
    toEnglishNumbers: function(str) {
        const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
        
        let result = str.toString();
        
        for (let i = 0; i < 10; i++) {
            result = result.replace(new RegExp(persianNumbers[i], 'g'), i);
            result = result.replace(new RegExp(arabicNumbers[i], 'g'), i);
        }
        
        return result;
    },

    // فرمت کردن اعداد با جداکننده هزارگان
    formatNumber: function(num, usePersian = true) {
        if (!num && num !== 0) return '';
        
        const formatted = new Intl.NumberFormat('fa-IR').format(num);
        return usePersian ? this.toPersianNumbers(formatted) : formatted;
    },

    // فرمت کردن ارز
    formatCurrency: function(amount, currency = 'IRR', usePersian = true) {
        if (!amount && amount !== 0) return '';
        
        const currencySymbols = {
            USD: '$',
            EUR: '€',
            GBP: '£',
            AED: 'د.إ',
            IRR: 'ریال',
            BTC: '₿',
            ETH: 'Ξ',
            USDT: '₮'
        };
        
        const formatted = this.formatNumber(amount, usePersian);
        const symbol = currencySymbols[currency] || currency;
        
        return `${formatted} ${symbol}`;
    },

    // تبدیل تاریخ میلادی به شمسی
    toJalaliDate: function(date) {
        if (!date) return '';
        
        const d = new Date(date);
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            calendar: 'persian',
            numberingSystem: 'persian'
        };
        
        return new Intl.DateTimeFormat('fa-IR-u-ca-persian', options).format(d);
    },

    // تبدیل زمان به فارسی
    toJalaliDateTime: function(date) {
        if (!date) return '';
        
        const d = new Date(date);
        const dateOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            calendar: 'persian',
            numberingSystem: 'persian'
        };
        
        const timeOptions = {
            hour: '2-digit',
            minute: '2-digit',
            numberingSystem: 'persian'
        };
        
        const jalaliDate = new Intl.DateTimeFormat('fa-IR-u-ca-persian', dateOptions).format(d);
        const time = new Intl.DateTimeFormat('fa-IR', timeOptions).format(d);
        
        return `${jalaliDate} - ${time}`;
    },

    // محاسبه زمان گذشته به فارسی
    timeAgo: function(date) {
        if (!date) return '';
        
        const now = new Date();
        const diffMs = now - new Date(date);
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffMins < 1) return 'همین الان';
        if (diffMins < 60) return `${this.toPersianNumbers(diffMins)} دقیقه پیش`;
        if (diffHours < 24) return `${this.toPersianNumbers(diffHours)} ساعت پیش`;
        if (diffDays < 30) return `${this.toPersianNumbers(diffDays)} روز پیش`;
        
        return this.toJalaliDate(date);
    },

    // تنظیم متن بر اساس جنسیت
    genderText: function(male, female, gender = 'male') {
        return gender === 'female' ? female : male;
    },

    // جمع و مفرد فارسی
    pluralize: function(count, singular, plural) {
        return count === 1 ? singular : plural;
    },

    // تبدیل متن به slug فارسی
    slugify: function(text) {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\u0600-\u06FF\u0590-\u05FF\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
    },

    // اعتبارسنجی کد ملی ایرانی
    validateNationalId: function(code) {
        if (!code || code.length !== 10) return false;
        
        const numericCode = this.toEnglishNumbers(code);
        if (!/^\d{10}$/.test(numericCode)) return false;
        
        // بررسی کدهای غیرمعتبر
        const invalidCodes = [
            '0000000000', '1111111111', '2222222222', '3333333333',
            '4444444444', '5555555555', '6666666666', '7777777777',
            '8888888888', '9999999999'
        ];
        
        if (invalidCodes.includes(numericCode)) return false;
        
        // الگوریتم تعیین رقم کنترل
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(numericCode[i]) * (10 - i);
        }
        
        const remainder = sum % 11;
        const checkDigit = parseInt(numericCode[9]);
        
        return (remainder < 2 && checkDigit === remainder) || 
               (remainder >= 2 && checkDigit === 11 - remainder);
    },

    // اعتبارسنجی شماره تلفن ایرانی
    validatePhoneNumber: function(phone) {
        const cleaned = this.toEnglishNumbers(phone).replace(/\D/g, '');
        const iranMobileRegex = /^(?:98|\+98|0098|0)?9\d{9}$/;
        return iranMobileRegex.test(cleaned);
    },

    // فرمت کردن شماره تلفن
    formatPhoneNumber: function(phone) {
        if (!phone) return '';
        
        const cleaned = this.toEnglishNumbers(phone).replace(/\D/g, '');
        
        if (cleaned.length === 11 && cleaned.startsWith('09')) {
            return this.toPersianNumbers(
                `${cleaned.slice(0, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
            );
        }
        
        return phone;
    },

    // تبدیل عدد به حروف فارسی
    numberToWords: function(num) {
        const ones = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
        const tens = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
        const teens = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
        const hundreds = ['', 'یکصد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
        const scales = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون'];
        
        if (num === 0) return 'صفر';
        if (num < 0) return 'منفی ' + this.numberToWords(-num);
        
        let result = '';
        let scaleIndex = 0;
        
        while (num > 0) {
            let chunk = num % 1000;
            if (chunk !== 0) {
                let chunkText = '';
                
                // صدها
                if (chunk >= 100) {
                    chunkText += hundreds[Math.floor(chunk / 100)] + ' ';
                    chunk %= 100;
                }
                
                // دهها و یکان
                if (chunk >= 10 && chunk < 20) {
                    chunkText += teens[chunk - 10];
                } else {
                    if (chunk >= 20) {
                        chunkText += tens[Math.floor(chunk / 10)] + ' ';
                        chunk %= 10;
                    }
                    if (chunk > 0) {
                        chunkText += ones[chunk];
                    }
                }
                
                chunkText = chunkText.trim();
                if (scaleIndex > 0) {
                    chunkText += ' ' + scales[scaleIndex];
                }
                
                result = chunkText + (result ? ' ' + result : '');
            }
            
            num = Math.floor(num / 1000);
            scaleIndex++;
        }
        
        return result.trim();
    }
};

// RTL Support utilities
PersianUtils.rtl = {
    // Apply RTL direction to element
    applyRTL: function(element) {
        if (element) {
            element.dir = 'rtl';
            element.style.direction = 'rtl';
            element.style.textAlign = 'right';
        }
    },

    // Remove RTL direction from element
    removeRTL: function(element) {
        if (element) {
            element.dir = 'ltr';
            element.style.direction = 'ltr';
            element.style.textAlign = 'left';
        }
    },

    // Check if current document is RTL
    isRTL: function() {
        return document.documentElement.dir === 'rtl' || 
               document.body.dir === 'rtl' ||
               document.documentElement.getAttribute('lang') === 'fa';
    },

    // Toggle RTL/LTR
    toggle: function() {
        const isCurrentlyRTL = this.isRTL();
        const newDir = isCurrentlyRTL ? 'ltr' : 'rtl';
        document.documentElement.dir = newDir;
        document.body.dir = newDir;
        
        // Update CSS classes
        if (newDir === 'rtl') {
            document.body.classList.add('rtl-container');
            document.body.classList.remove('ltr-container');
        } else {
            document.body.classList.add('ltr-container');
            document.body.classList.remove('rtl-container');
        }
        
        return newDir;
    },

    // Set language and direction
    setLanguage: function(lang) {
        const isRTL = ['fa', 'ar', 'he', 'ur'].includes(lang);
        
        document.documentElement.lang = lang;
        document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
        document.body.dir = isRTL ? 'rtl' : 'ltr';
        
        if (isRTL) {
            document.body.classList.add('rtl-container');
            document.body.classList.remove('ltr-container');
        } else {
            document.body.classList.add('ltr-container');
            document.body.classList.remove('rtl-container');
        }
        
        return isRTL;
    }
};

// Enhanced date formatting with Persian calendar support
PersianUtils.calendar = {
    // Format date with Persian calendar
    formatPersianDate: function(date, includeTime = false) {
        if (!date) return '';
        
        try {
            const d = new Date(date);
            const options = {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                calendar: 'persian',
                numberingSystem: 'persian'
            };
            
            if (includeTime) {
                options.hour = '2-digit';
                options.minute = '2-digit';
            }
            
            return new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-persian', options).format(d);
        } catch (error) {
            console.warn('Persian date formatting error:', error);
            return this.toJalaliDate(date);
        }
    },

    // Get Persian weekday name
    getPersianWeekday: function(date) {
        const weekdays = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];
        const d = new Date(date);
        return weekdays[d.getDay()];
    },

    // Get Persian month name
    getPersianMonth: function(monthNumber) {
        const months = [
            'فروردین', 'اردیبهشت', 'خرداد', 'تیر',
            'مرداد', 'شهریور', 'مهر', 'آبان',
            'آذر', 'دی', 'بهمن', 'اسفند'
        ];
        return months[monthNumber - 1] || '';
    }
};

// Enhanced currency formatting
PersianUtils.currency = {
    // Format currency with better Persian support
    formatAdvanced: function(amount, currency = 'IRR', options = {}) {
        if (!amount && amount !== 0) return '';
        
        const {
            usePersianDigits = true,
            showCurrencySymbol = true,
            showCurrencyName = false,
            abbreviated = false
        } = options;
        
        const currencyInfo = {
            USD: { symbol: '$', name: 'دلار آمریکا', abbr: 'دلار' },
            EUR: { symbol: '€', name: 'یورو', abbr: 'یورو' },
            GBP: { symbol: '£', name: 'پوند انگلیس', abbr: 'پوند' },
            AED: { symbol: 'د.إ', name: 'درهم امارات', abbr: 'درهم' },
            IRR: { symbol: '﷼', name: 'ریال ایران', abbr: 'ریال' },
            BTC: { symbol: '₿', name: 'بیت کوین', abbr: 'بیت کوین' },
            ETH: { symbol: 'Ξ', name: 'اتریوم', abbr: 'اتریوم' },
            USDT: { symbol: '₮', name: 'تتر', abbr: 'تتر' }
        };
        
        const info = currencyInfo[currency] || { symbol: currency, name: currency, abbr: currency };
        
        // Abbreviate large numbers
        let formattedAmount = amount;
        let suffix = '';
        
        if (abbreviated && amount >= 1000000000) {
            formattedAmount = amount / 1000000000;
            suffix = ' میلیارد';
        } else if (abbreviated && amount >= 1000000) {
            formattedAmount = amount / 1000000;
            suffix = ' میلیون';
        } else if (abbreviated && amount >= 1000) {
            formattedAmount = amount / 1000;
            suffix = ' هزار';
        }
        
        const formatted = PersianUtils.formatNumber(formattedAmount, usePersianDigits);
        
        let result = formatted + suffix;
        
        if (showCurrencySymbol && info.symbol) {
            result += ` ${info.symbol}`;
        }
        
        if (showCurrencyName) {
            result += ` ${abbreviated ? info.abbr : info.name}`;
        }
        
        return result;
    }
};

// Export for global use
if (typeof window !== 'undefined') {
    window.PersianUtils = PersianUtils;
}

export default PersianUtils;