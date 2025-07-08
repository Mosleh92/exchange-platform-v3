const axios = require("axios");

async function getExternalRate(pair) {
  // pair: 'usd-irr' یا 'eur-usd' و ...
  // مثال ساده با CoinGecko
  const [from, to] = pair.toLowerCase().split("-");
  const res = await axios.get(
    `https://api.coingecko.com/api/v3/simple/price?ids=${from}&vs_currencies=${to}`,
  );
  return res.data[from][to];
}

module.exports = { getExternalRate };
