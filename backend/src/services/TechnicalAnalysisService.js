const axios = require('axios');
const Redis = require('redis');

class TechnicalAnalysisService {
  constructor() {
    this.redis = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    this.redis.connect();
    
    // Technical indicators cache
    this.cacheExpiry = 300; // 5 minutes
  }

  /**
   * Calculate Simple Moving Average (SMA)
   */
  calculateSMA(prices, period) {
    if (prices.length < period) return null;
    
    const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
    return sum / period;
  }

  /**
   * Calculate Exponential Moving Average (EMA)
   */
  calculateEMA(prices, period) {
    if (prices.length < period) return null;
    
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  /**
   * Calculate Relative Strength Index (RSI)
   */
  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return null;
    
    let gains = 0;
    let losses = 0;
    
    // Calculate initial average gain and loss
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }
    
    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    // Calculate RSI for remaining periods
    for (let i = period + 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      let currentGain = 0;
      let currentLoss = 0;
      
      if (change > 0) {
        currentGain = change;
      } else {
        currentLoss = Math.abs(change);
      }
      
      avgGain = (avgGain * (period - 1) + currentGain) / period;
      avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
    }
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * Calculate Bollinger Bands
   */
  calculateBollingerBands(prices, period = 20, stdDev = 2) {
    if (prices.length < period) return null;
    
    const sma = this.calculateSMA(prices, period);
    const recentPrices = prices.slice(-period);
    
    const variance = recentPrices.reduce((sum, price) => {
      return sum + Math.pow(price - sma, 2);
    }, 0) / period;
    
    const standardDeviation = Math.sqrt(variance);
    
    return {
      upper: sma + (standardDeviation * stdDev),
      middle: sma,
      lower: sma - (standardDeviation * stdDev)
    };
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   */
  calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (prices.length < slowPeriod) return null;
    
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);
    
    const macdLine = fastEMA - slowEMA;
    
    // Calculate signal line (EMA of MACD line)
    const macdValues = [];
    for (let i = slowPeriod; i < prices.length; i++) {
      const fastEMA = this.calculateEMA(prices.slice(0, i + 1), fastPeriod);
      const slowEMA = this.calculateEMA(prices.slice(0, i + 1), slowPeriod);
      macdValues.push(fastEMA - slowEMA);
    }
    
    const signalLine = this.calculateEMA(macdValues, signalPeriod);
    const histogram = macdLine - signalLine;
    
    return {
      macd: macdLine,
      signal: signalLine,
      histogram: histogram
    };
  }

  /**
   * Calculate Stochastic Oscillator
   */
  calculateStochastic(prices, period = 14, kPeriod = 3, dPeriod = 3) {
    if (prices.length < period) return null;
    
    const recentPrices = prices.slice(-period);
    const highestHigh = Math.max(...recentPrices);
    const lowestLow = Math.min(...recentPrices);
    const currentPrice = prices[prices.length - 1];
    
    const k = ((currentPrice - lowestLow) / (highestHigh - lowestLow)) * 100;
    
    // Calculate %D (SMA of %K)
    const kValues = [];
    for (let i = period - 1; i < prices.length; i++) {
      const window = prices.slice(i - period + 1, i + 1);
      const hh = Math.max(...window);
      const ll = Math.min(...window);
      const cp = prices[i];
      kValues.push(((cp - ll) / (hh - ll)) * 100);
    }
    
    const d = this.calculateSMA(kValues, dPeriod);
    
    return {
      k: k,
      d: d
    };
  }

  /**
   * Calculate Average True Range (ATR)
   */
  calculateATR(highs, lows, closes, period = 14) {
    if (highs.length < period + 1) return null;
    
    const trueRanges = [];
    
    for (let i = 1; i < highs.length; i++) {
      const high = highs[i];
      const low = lows[i];
      const prevClose = closes[i - 1];
      
      const tr1 = high - low;
      const tr2 = Math.abs(high - prevClose);
      const tr3 = Math.abs(low - prevClose);
      
      trueRanges.push(Math.max(tr1, tr2, tr3));
    }
    
    return this.calculateSMA(trueRanges, period);
  }

  /**
   * Get real-time price data with technical indicators
   */
  async getTechnicalAnalysis(currency, baseCurrency, timeframe = '1h') {
    const cacheKey = `technical_analysis:${currency}:${baseCurrency}:${timeframe}`;
    
    try {
      // Check cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
      
      // Fetch price data
      const priceData = await this.fetchPriceData(currency, baseCurrency, timeframe);
      
      if (!priceData || priceData.length < 50) {
        throw new Error('Insufficient price data for technical analysis');
      }
      
      const prices = priceData.map(d => d.close);
      const highs = priceData.map(d => d.high);
      const lows = priceData.map(d => d.low);
      const volumes = priceData.map(d => d.volume);
      
      // Calculate technical indicators
      const analysis = {
        currency,
        baseCurrency,
        timeframe,
        timestamp: new Date(),
        price: prices[prices.length - 1],
        indicators: {
          sma: {
            '20': this.calculateSMA(prices, 20),
            '50': this.calculateSMA(prices, 50),
            '200': this.calculateSMA(prices, 200)
          },
          ema: {
            '12': this.calculateEMA(prices, 12),
            '26': this.calculateEMA(prices, 26)
          },
          rsi: this.calculateRSI(prices, 14),
          bollingerBands: this.calculateBollingerBands(prices, 20, 2),
          macd: this.calculateMACD(prices, 12, 26, 9),
          stochastic: this.calculateStochastic(prices, 14, 3, 3),
          atr: this.calculateATR(highs, lows, prices, 14),
          volume: {
            average: this.calculateSMA(volumes, 20),
            current: volumes[volumes.length - 1]
          }
        },
        signals: this.generateSignals(prices, volumes),
        support: this.findSupportLevels(prices),
        resistance: this.findResistanceLevels(prices)
      };
      
      // Cache the result
      await this.redis.setex(cacheKey, this.cacheExpiry, JSON.stringify(analysis));
      
      return analysis;
    } catch (error) {
      console.error('Error in technical analysis:', error);
      throw error;
    }
  }

  /**
   * Generate trading signals based on technical indicators
   */
  generateSignals(prices, volumes) {
    const signals = {
      overall: 'neutral',
      strength: 0,
      recommendations: []
    };
    
    try {
      const rsi = this.calculateRSI(prices, 14);
      const macd = this.calculateMACD(prices);
      const stochastic = this.calculateStochastic(prices);
      const bb = this.calculateBollingerBands(prices);
      
      let bullishSignals = 0;
      let bearishSignals = 0;
      
      // RSI signals
      if (rsi < 30) {
        bullishSignals += 2;
        signals.recommendations.push('RSI oversold - potential buy signal');
      } else if (rsi > 70) {
        bearishSignals += 2;
        signals.recommendations.push('RSI overbought - potential sell signal');
      }
      
      // MACD signals
      if (macd && macd.histogram > 0 && macd.macd > macd.signal) {
        bullishSignals += 1;
        signals.recommendations.push('MACD bullish crossover');
      } else if (macd && macd.histogram < 0 && macd.macd < macd.signal) {
        bearishSignals += 1;
        signals.recommendations.push('MACD bearish crossover');
      }
      
      // Stochastic signals
      if (stochastic && stochastic.k < 20) {
        bullishSignals += 1;
        signals.recommendations.push('Stochastic oversold');
      } else if (stochastic && stochastic.k > 80) {
        bearishSignals += 1;
        signals.recommendations.push('Stochastic overbought');
      }
      
      // Bollinger Bands signals
      const currentPrice = prices[prices.length - 1];
      if (bb && currentPrice < bb.lower) {
        bullishSignals += 1;
        signals.recommendations.push('Price below lower Bollinger Band');
      } else if (bb && currentPrice > bb.upper) {
        bearishSignals += 1;
        signals.recommendations.push('Price above upper Bollinger Band');
      }
      
      // Determine overall signal
      if (bullishSignals > bearishSignals) {
        signals.overall = 'bullish';
        signals.strength = bullishSignals;
      } else if (bearishSignals > bullishSignals) {
        signals.overall = 'bearish';
        signals.strength = bearishSignals;
      } else {
        signals.overall = 'neutral';
        signals.strength = 0;
      }
      
    } catch (error) {
      console.error('Error generating signals:', error);
    }
    
    return signals;
  }

  /**
   * Find support levels
   */
  findSupportLevels(prices) {
    const supports = [];
    const window = 10;
    
    for (let i = window; i < prices.length - window; i++) {
      const current = prices[i];
      const left = prices.slice(i - window, i);
      const right = prices.slice(i + 1, i + window + 1);
      
      const leftMin = Math.min(...left);
      const rightMin = Math.min(...right);
      
      if (current <= leftMin && current <= rightMin) {
        supports.push({
          price: current,
          strength: this.calculateSupportStrength(prices, i),
          timestamp: new Date()
        });
      }
    }
    
    return supports.sort((a, b) => b.strength - a.strength).slice(0, 3);
  }

  /**
   * Find resistance levels
   */
  findResistanceLevels(prices) {
    const resistances = [];
    const window = 10;
    
    for (let i = window; i < prices.length - window; i++) {
      const current = prices[i];
      const left = prices.slice(i - window, i);
      const right = prices.slice(i + 1, i + window + 1);
      
      const leftMax = Math.max(...left);
      const rightMax = Math.max(...right);
      
      if (current >= leftMax && current >= rightMax) {
        resistances.push({
          price: current,
          strength: this.calculateResistanceStrength(prices, i),
          timestamp: new Date()
        });
      }
    }
    
    return resistances.sort((a, b) => b.strength - a.strength).slice(0, 3);
  }

  /**
   * Calculate support strength
   */
  calculateSupportStrength(prices, index) {
    let touches = 0;
    const tolerance = 0.02; // 2% tolerance
    
    for (let i = 0; i < prices.length; i++) {
      if (Math.abs(prices[i] - prices[index]) / prices[index] < tolerance) {
        touches++;
      }
    }
    
    return touches;
  }

  /**
   * Calculate resistance strength
   */
  calculateResistanceStrength(prices, index) {
    return this.calculateSupportStrength(prices, index);
  }

  /**
   * Fetch price data from external API
   */
  async fetchPriceData(currency, baseCurrency, timeframe) {
    try {
      // This would integrate with your preferred price data provider
      // Examples: Binance API, CoinGecko, Alpha Vantage, etc.
      const response = await axios.get(`${process.env.PRICE_API_URL}/klines`, {
        params: {
          symbol: `${currency}${baseCurrency}`,
          interval: timeframe,
          limit: 200
        }
      });
      
      return response.data.map(candle => ({
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5]),
        timestamp: new Date(candle[0])
      }));
    } catch (error) {
      console.error('Error fetching price data:', error);
      throw error;
    }
  }

  /**
   * Get real-time chart data
   */
  async getChartData(currency, baseCurrency, timeframe = '1h', limit = 100) {
    const cacheKey = `chart_data:${currency}:${baseCurrency}:${timeframe}:${limit}`;
    
    try {
      // Check cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
      
      const priceData = await this.fetchPriceData(currency, baseCurrency, timeframe);
      const chartData = priceData.slice(-limit).map(candle => ({
        time: candle.timestamp.getTime(),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume
      }));
      
      // Cache the result
      await this.redis.setex(cacheKey, this.cacheExpiry, JSON.stringify(chartData));
      
      return chartData;
    } catch (error) {
      console.error('Error getting chart data:', error);
      throw error;
    }
  }
}

module.exports = new TechnicalAnalysisService(); 
