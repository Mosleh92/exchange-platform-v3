const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv =require('dotenv');
const User = require('../backend/src/models/User');
const Currency = require('../backend/src/models/Currency');
const ExchangeRate = require('../backend/src/models/ExchangeRate');

dotenv.config({ path: './backend/.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/exchange-platform';

const seedDatabase = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('MongoDB connected');

    // Clear existing data
    await User.deleteMany({});
    await Currency.deleteMany({});
    await ExchangeRate.deleteMany({});

    console.log('Cleared existing data');

    // Create currencies
    const currencies = [
      { code: 'USD', name: 'US Dollar', type: 'fiat' },
      { code: 'EUR', name: 'Euro', type: 'fiat' },
      { code: 'GBP', name: 'British Pound', type: 'fiat' },
      { code: 'JPY', name: 'Japanese Yen', type: 'fiat' },
      { code: 'BTC', name: 'Bitcoin', type: 'crypto' },
      { code: 'ETH', name: 'Ethereum', type: 'crypto' },
    ];
    const createdCurrencies = await Currency.insertMany(currencies);
    console.log('Currencies seeded');

    // Create a user
    const user = new User({
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      phone: '1234567890',
    });
    await user.save();
    console.log('User seeded');

    // Create exchange rates
    const exchangeRates = [
      {
        currency_from: 'USD',
        currency_to: 'EUR',
        buy_rate: 0.91,
        sell_rate: 0.93,
        effective_date: new Date(),
        created_by: user._id,
      },
      {
        currency_from: 'USD',
        currency_to: 'GBP',
        buy_rate: 0.78,
        sell_rate: 0.80,
        effective_date: new Date(),
        created_by: user._id,
      },
      {
        currency_from: 'BTC',
        currency_to: 'USD',
        buy_rate: 43000,
        sell_rate: 44000,
        effective_date: new Date(),
        created_by: user._id,
      },
    ];
    await ExchangeRate.insertMany(exchangeRates);
    console.log('Exchange rates seeded');

    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
