const logger = require('../utils/logger'); // Assuming logger exists
const cache = require('../utils/cache');

class ExchangeRateService {
    constructor() {
        // Rates are defined from the perspective of 1 unit of the 'base' currency in the pair.
        // e.g., for 'AED/IRR':
        // 'buy': This is the rate at which the Exchange BUYS the BASE currency (AED) from a customer,
        //        meaning the customer is SELLING AED and receiving IRR.
        // 'sell': This is the rate at which the Exchange SELLS the BASE currency (AED) to a customer,
        //         meaning the customer is BUYING AED and paying IRR.
        this.rates = {
            'AED/IRR': {
                buy: 21540,  // Exchange buys 1 AED for 21540 IRR (Customer sells AED, gets 21540 IRR)
                sell: 21600  // Exchange sells 1 AED for 21600 IRR (Customer buys AED, pays 21600 IRR)
            },
            // We can add other pairs or derive them. For now, focus on AED/IRR.
        };
        this.lastUpdated = new Date();
    }

    /**
     * Get the rate for a specific currency pair, based on whether the customer is buying or selling the 'from' currency.
     * @param {string} fromCurrency - The currency the customer is providing (e.g., 'IRR' when buying AED, or 'AED' when selling AED).
     * @param {string} toCurrency - The currency the customer wants to receive (e.g., 'AED' when buying AED, or 'IRR' when selling AED).
     * @param {string} transactionType - The type of transaction from the customer's perspective ('buy_aed', 'sell_aed', 'exchange_irr_aed', etc.).
     * @returns {number|null} The appropriate exchange rate.
     */
    async getApplicableRate(fromCurrency, toCurrency, transactionType) {
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate API call delay

        if (fromCurrency === toCurrency) {
            return 1; // No conversion needed
        }

        const pair_AED_IRR = this.rates['AED/IRR'];

        if (!pair_AED_IRR) {
            logger.warn(`Rates for AED/IRR not found.`);
            return null;
        }

        // Logic for common Hawala operations (IRR <-> AED)
        if ((fromCurrency === 'IRR' && toCurrency === 'AED') || (transactionType === 'buy_aed' || transactionType === 'exchange_irr_aed')) {
            // Customer is giving IRR to BUY AED from the exchange.
            // Exchange is SELLING AED. So use the 'sell' rate for AED/IRR.
            return pair_AED_IRR.sell; // Rate: IRR per 1 AED
        } else if ((fromCurrency === 'AED' && toCurrency === 'IRR') || (transactionType === 'sell_aed' || transactionType === 'exchange_aed_irr')) {
            // Customer is giving AED to SELL AED to the exchange, and receive IRR.
            // Exchange is BUYING AED. So use the 'buy' rate for AED/IRR.
            return pair_AED_IRR.buy; // Rate: IRR per 1 AED
        }
        
        logger.warn(`No applicable rate found for transaction: ${fromCurrency} -> ${toCurrency}, Type: ${transactionType}`);
        return null; // No specific rate found for this combination
    }

    /**
     * Get the latest rates for display.
     * @returns {Object} An object containing the latest buying and selling rates for key pairs.
     */
    async getCurrentDisplayRates() {
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate API call delay
        const aedIrrRates = this.rates['AED/IRR'];
        return {
            'AED_to_IRR_Sell': aedIrrRates ? aedIrrRates.sell : null, // Customer buys AED, pays IRR (Exchange sells AED)
            'AED_to_IRR_Buy': aedIrrRates ? aedIrrRates.buy : null,   // Customer sells AED, gets IRR (Exchange buys AED)
            'lastUpdated': this.lastUpdated
        };
    }

    /**
     * Manually update a specific rate. For admin use.
     * @param {string} pair - The currency pair (e.g., 'AED/IRR').
     * @param {string} rateType - 'buy' or 'sell'.
     * @param {number} value - The new rate value.
     */
    async updateSpecificRate(pair, rateType, value) {
        if (this.rates[pair] && (rateType === 'buy' || rateType === 'sell')) {
            this.rates[pair][rateType] = value;
            this.lastUpdated = new Date();
            logger.info(`Updated rate for ${pair} (${rateType}): ${value}`);
            return true;
        }
        logger.error(`Failed to update rate for ${pair} (${rateType}). Invalid pair or rate type.`);
        return false;
    }
}

// نمونه تابع کش نرخ ارز
async function getCachedRate(currencyPair) {
    const cacheKey = `rate:${currencyPair}`;
    let rate = await cache.get(cacheKey);
    if (rate) return rate;
    // اگر نبود، از دیتابیس بخوان
    rate = await ExchangeRate.findOne({ pair: currencyPair });
    if (rate) await cache.set(cacheKey, rate, 60); // کش ۶۰ ثانیه
    return rate;
}

module.exports = new ExchangeRateService(); 