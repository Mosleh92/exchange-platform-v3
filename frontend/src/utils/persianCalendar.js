import moment from 'moment-jalaali';

// Configure moment-jalaali
moment.loadPersian({
  usePersianDigits: true,
  dialect: 'persian-modern'
});

export class PersianCalendar {
  /**
   * Get current Persian date
   */
  static now() {
    return moment();
  }

  /**
   * Convert Gregorian date to Persian
   * @param {Date|string} date 
   */
  static toPersian(date) {
    return moment(date);
  }

  /**
   * Format Persian date
   * @param {Date|string|moment} date 
   * @param {string} format 
   */
  static format(date, format = 'jYYYY/jMM/jDD') {
    return moment(date).format(format);
  }

  /**
   * Format Persian date with time
   * @param {Date|string|moment} date 
   */
  static formatWithTime(date) {
    return moment(date).format('jYYYY/jMM/jDD - HH:mm');
  }

  /**
   * Get Persian month names
   */
  static getMonthNames() {
    return [
      'فروردین', 'اردیبهشت', 'خرداد', 'تیر',
      'مرداد', 'شهریور', 'مهر', 'آبان',
      'آذر', 'دی', 'بهمن', 'اسفند'
    ];
  }

  /**
   * Get Persian day names
   */
  static getDayNames() {
    return [
      'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه',
      'پنج‌شنبه', 'جمعه', 'شنبه'
    ];
  }

  /**
   * Get relative time in Persian
   * @param {Date|string|moment} date 
   */
  static fromNow(date) {
    return moment(date).fromNow();
  }

  /**
   * Check if date is today
   * @param {Date|string|moment} date 
   */
  static isToday(date) {
    return moment(date).isSame(moment(), 'day');
  }

  /**
   * Check if date is this week
   * @param {Date|string|moment} date 
   */
  static isThisWeek(date) {
    return moment(date).isSame(moment(), 'week');
  }

  /**
   * Check if date is this month
   * @param {Date|string|moment} date 
   */
  static isThisMonth(date) {
    return moment(date).isSame(moment(), 'jMonth');
  }

  /**
   * Get start of Persian year
   * @param {number} year - Persian year
   */
  static startOfYear(year) {
    return moment().jYear(year).startOf('jYear');
  }

  /**
   * Get end of Persian year
   * @param {number} year - Persian year
   */
  static endOfYear(year) {
    return moment().jYear(year).endOf('jYear');
  }

  /**
   * Get current Persian year
   */
  static getCurrentYear() {
    return moment().jYear();
  }

  /**
   * Get current Persian month
   */
  static getCurrentMonth() {
    return moment().jMonth() + 1; // moment uses 0-based months
  }

  /**
   * Get current Persian day
   */
  static getCurrentDay() {
    return moment().jDate();
  }

  /**
   * Create date picker options for Persian calendar
   */
  static getDatePickerConfig() {
    return {
      calendar: 'persian',
      locale: 'fa',
      format: 'jYYYY/jMM/jDD',
      monthNames: this.getMonthNames(),
      dayNames: this.getDayNames(),
      rtl: true
    };
  }

  /**
   * Parse Persian date string
   * @param {string} dateString - Persian date string (e.g., "1402/05/15")
   */
  static parse(dateString) {
    return moment(dateString, 'jYYYY/jMM/jDD');
  }

  /**
   * Get date range for reports
   * @param {string} period - 'today', 'week', 'month', 'year'
   */
  static getDateRange(period) {
    const now = moment();
    
    switch (period) {
      case 'today':
        return {
          start: now.clone().startOf('day'),
          end: now.clone().endOf('day')
        };
      case 'week':
        return {
          start: now.clone().startOf('week'),
          end: now.clone().endOf('week')
        };
      case 'month':
        return {
          start: now.clone().startOf('jMonth'),
          end: now.clone().endOf('jMonth')
        };
      case 'year':
        return {
          start: now.clone().startOf('jYear'),
          end: now.clone().endOf('jYear')
        };
      default:
        return {
          start: now.clone().startOf('day'),
          end: now.clone().endOf('day')
        };
    }
  }

  /**
   * Format duration in Persian
   * @param {number} milliseconds 
   */
  static formatDuration(milliseconds) {
    const duration = moment.duration(milliseconds);
    
    if (duration.days() > 0) {
      return `${duration.days()} روز`;
    } else if (duration.hours() > 0) {
      return `${duration.hours()} ساعت`;
    } else if (duration.minutes() > 0) {
      return `${duration.minutes()} دقیقه`;
    } else {
      return 'کمتر از یک دقیقه';
    }
  }

  /**
   * Get business days between two dates
   * @param {Date|string|moment} start 
   * @param {Date|string|moment} end 
   */
  static getBusinessDays(start, end) {
    const startDate = moment(start);
    const endDate = moment(end);
    let businessDays = 0;
    
    while (startDate.isSameOrBefore(endDate)) {
      const dayOfWeek = startDate.day();
      // In Iran, Friday is weekend (day 5 in moment.js)
      if (dayOfWeek !== 5) {
        businessDays++;
      }
      startDate.add(1, 'day');
    }
    
    return businessDays;
  }

  /**
   * Check if date is a Persian holiday
   * @param {Date|string|moment} date 
   */
  static isPersianHoliday(date) {
    const momentDate = moment(date);
    const month = momentDate.jMonth() + 1;
    const day = momentDate.jDate();
    
    // Some major Persian holidays
    const holidays = [
      { month: 1, day: 1 },   // نوروز
      { month: 1, day: 2 },   // نوروز
      { month: 1, day: 3 },   // نوروز
      { month: 1, day: 4 },   // نوروز
      { month: 1, day: 12 },  // روز جمهوری اسلامی
      { month: 1, day: 13 },  // سیزده بدر
      { month: 3, day: 14 },  // رحلت امام خمینی
      { month: 3, day: 15 },  // قیام 15 خرداد
      { month: 11, day: 22 }, // پیروزی انقلاب اسلامی
    ];
    
    return holidays.some(holiday => 
      holiday.month === month && holiday.day === day
    );
  }

  /**
   * Get week number in Persian year
   * @param {Date|string|moment} date 
   */
  static getWeekOfYear(date) {
    return moment(date).jWeek();
  }

  /**
   * Format time in Persian
   * @param {Date|string|moment} date 
   */
  static formatTime(date) {
    return moment(date).format('HH:mm');
  }

  /**
   * Format date for input fields
   * @param {Date|string|moment} date 
   */
  static formatForInput(date) {
    return moment(date).format('jYYYY-jMM-jDD');
  }

  /**
   * Create calendar widget data
   * @param {Date|string|moment} date 
   */
  static getCalendarData(date) {
    const momentDate = moment(date);
    const startOfMonth = momentDate.clone().startOf('jMonth');
    const endOfMonth = momentDate.clone().endOf('jMonth');
    const startOfCalendar = startOfMonth.clone().startOf('week');
    const endOfCalendar = endOfMonth.clone().endOf('week');

    const days = [];
    const current = startOfCalendar.clone();

    while (current.isSameOrBefore(endOfCalendar)) {
      days.push({
        date: current.clone(),
        day: current.jDate(),
        isCurrentMonth: current.jMonth() === momentDate.jMonth(),
        isToday: current.isSame(moment(), 'day'),
        isWeekend: current.day() === 5, // Friday in Iran
        isHoliday: this.isPersianHoliday(current),
        formatted: current.format('jYYYY/jMM/jDD')
      });
      current.add(1, 'day');
    }

    return {
      days,
      monthName: this.getMonthNames()[momentDate.jMonth()],
      year: momentDate.jYear(),
      month: momentDate.jMonth() + 1
    };
  }
}

export default PersianCalendar;