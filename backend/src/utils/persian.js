// A self-contained utility for Persian-related functions

const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
const englishDigits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

const PersianUtils = {
  /**
   * Converts English digits in a string to Persian digits.
   * @param {string | number} input The string or number to convert.
   * @returns {string} String with Persian digits.
   */
  toPersianDigits(input) {
    if (input === null || input === undefined) return "";
    let str = String(input);
    for (let i = 0; i < 10; i++) {
      str = str.replace(new RegExp(englishDigits[i], "g"), persianDigits[i]);
    }
    return str;
  },

  /**
   * Converts Persian or Arabic digits in a string to English digits.
   * @param {string} input The string to convert.
   * @returns {string} String with English digits.
   */
  toEnglishDigits(input) {
    if (input === null || input === undefined) return "";
    let str = String(input);
    for (let i = 0; i < 10; i++) {
      str = str.replace(new RegExp(persianDigits[i], "g"), englishDigits[i]);
    }
    // Also handle Arabic digits
    return str.replace(/[\u0660-\u0669]/g, (c) => c.charCodeAt(0) - 0x0660);
  },

  /**
   * Adds commas to a number string for better readability.
   * @param {string | number} input The number to format.
   * @returns {string} Formatted number with commas.
   */
  addCommas(input) {
    if (input === null || input === undefined) return "";
    const num = this.toEnglishDigits(String(input)).replace(/,/g, "");
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  },

  /**
   * A simple placeholder for national code validation.
   * Replace with a proper algorithm if needed.
   * @param {string} code The national code.
   * @returns {boolean} True if potentially valid, otherwise false.
   */
  isValidNationalCode(code) {
    const strCode = this.toEnglishDigits(String(code));
    return /^\d{10}$/.test(strCode);
  },
};

module.exports = PersianUtils;
