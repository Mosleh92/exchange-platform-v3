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

// Export for global use
window.PersianUtils = PersianUtils;