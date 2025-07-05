const { getExternalRate } = require('../services/rateEngine');

// Minimal placeholder for rate.controller.js
module.exports = {
  getRates: (req, res) => {
    res.json({ rates: [] });
  },
  getRate: async (req, res) => {
    try {
      const { pair } = req.query;
      if (!pair) return res.status(400).json({ error: 'pair is required' });
      const rate = await getExternalRate(pair);
      res.json({ rate });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
};
