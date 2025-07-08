const mongoose = require("mongoose");
require("dotenv").config();

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // دادههای اولیه برای نرخهای ارز
    const exchangeRates = [
      {
        fromCurrency: "IRR",
        toCurrency: "AED",
        rate: 0.000087,
        date: new Date(),
      },
      {
        fromCurrency: "AED",
        toCurrency: "IRR",
        rate: 11494.25,
        date: new Date(),
      },
    ];

    await mongoose.connection.db
      .collection("exchangerates")
      .insertMany(exchangeRates);
    console.log("Exchange rates seeded");

    // دادههای اولیه برای طرحهای اشتراک
    const plans = [
      {
        name: "basic",
        features: [
          { name: "users", limit: 5 },
          { name: "transactions", limit: 1000 },
        ],
        price: 100,
      },
      {
        name: "professional",
        features: [
          { name: "users", limit: 20 },
          { name: "transactions", limit: 10000 },
        ],
        price: 300,
      },
    ];

    await mongoose.connection.db.collection("plans").insertMany(plans);
    console.log("Plans seeded");

    console.log("All seed data inserted successfully");
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
