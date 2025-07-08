const mongoose = require("mongoose");
require("dotenv").config();

const migrations = [
  {
    version: 1,
    up: async (db) => {
      // ایجاد ایندکسها
      await db.collection("accounts").createIndex({ tenantId: 1 });
      await db.collection("transactions").createIndex({ tenantId: 1, date: 1 });
      await db
        .collection("exchangerates")
        .createIndex({ date: 1, fromCurrency: 1, toCurrency: 1 });
    },
  },
  {
    version: 2,
    up: async (db) => {
      // بهروزرسانی ساختار حسابها
      await db.collection("accounts").updateMany(
        {},
        {
          $set: {
            features: [],
            limits: {
              dailyWithdrawal: 0,
              monthlyWithdrawal: 0,
            },
          },
        },
      );
    },
  },
];

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;

    // بررسی و اجرای مایگریشنها
    const appliedMigrations = await db
      .collection("migrations")
      .find()
      .toArray();
    const appliedVersions = new Set(appliedMigrations.map((m) => m.version));

    for (const migration of migrations) {
      if (!appliedVersions.has(migration.version)) {
        console.log(`Applying migration version ${migration.version}...`);
        await migration.up(db);
        await db.collection("migrations").insertOne({
          version: migration.version,
          appliedAt: new Date(),
        });
        console.log(`Migration version ${migration.version} completed`);
      }
    }

    console.log("All migrations completed successfully");
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

migrate();
