const express = require('express');
const router = express.Router();

const currencies = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'BTC', name: 'Bitcoin' },
  { code: 'ETH', name: 'Ethereum' },
];

const exchangeRates = {
  'USD-EUR': 0.92,
  'USD-GBP': 0.79,
  'USD-JPY': 148.0,
  'USD-BTC': 0.000023,
  'USD-ETH': 0.00045,
  'EUR-USD': 1.09,
  'EUR-GBP': 0.86,
  'EUR-JPY': 161.0,
  'EUR-BTC': 0.000025,
  'EUR-ETH': 0.00049,
  'GBP-USD': 1.27,
  'GBP-EUR': 1.16,
  'GBP-JPY': 188.0,
  'GBP-BTC': 0.000029,
  'GBP-ETH': 0.00057,
  'JPY-USD': 0.0068,
  'JPY-EUR': 0.0062,
  'JPY-GBP': 0.0053,
  'JPY-BTC': 0.00000016,
  'JPY-ETH': 0.000003,
  'BTC-USD': 43500.0,
  'BTC-EUR': 40000.0,
  'BTC-GBP': 34500.0,
  'BTC-JPY': 6450000.0,
  'BTC-ETH': 20.0,
  'ETH-USD': 2200.0,
  'ETH-EUR': 2000.0,
  'ETH-GBP': 1750.0,
  'ETH-JPY': 325000.0,
  'ETH-BTC': 0.05,
};

// Get all currencies
router.get('/currencies', (req, res) => {
  res.json(currencies);
});

// Get exchange rate between two currencies
router.get('/rate/:from/:to', (req, res) => {
  const { from, to } = req.params;
  const rate = exchangeRates[`${from.toUpperCase()}-${to.toUpperCase()}`];

  if (rate) {
    res.json({ from, to, rate });
  } else {
    res.status(404).json({ message: 'Exchange rate not found' });
  }
});

module.exports = router;
