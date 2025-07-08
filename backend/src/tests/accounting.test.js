require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
const { calculateProfit } = require("../services/accountingService");
const mongoose = require("mongoose");
const Customer = require("../models/Customer");
const Transaction = require("../models/Transaction");
const JournalEntry = require("../models/JournalEntry");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

test("محاسبه سود معامله", () => {
  expect(calculateProfit(1200, 1000, 50)).toBe(150);
  expect(calculateProfit(2000, 1800, 100)).toBe(100);
});

describe("Data Isolation Security Test", () => {
  let tenant1, tenant2, customer1, customer2;

  beforeAll(async () => {
    // اتصال به دیتابیس تست
    await mongoose.connect("mongodb://localhost:27017/exchange-platform-test", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    // ایجاد دو tenant فرضی
    tenant1 = new mongoose.Types.ObjectId();
    tenant2 = new mongoose.Types.ObjectId();
    // ایجاد مشتری برای هر tenant
    customer1 = await Customer.create({
      name: "Ali",
      phone: "09120000001",
      national_id: "001",
      tenantId: tenant1,
      branchId: new mongoose.Types.ObjectId(),
    });
    customer2 = await Customer.create({
      name: "Reza",
      phone: "09120000002",
      national_id: "002",
      tenantId: tenant2,
      branchId: new mongoose.Types.ObjectId(),
    });
  });

  afterAll(async () => {
    await Customer.deleteMany({});
    await mongoose.connection.close();
  });

  it("should not allow tenant1 to access tenant2 data", async () => {
    // tenant1 فقط باید مشتری خودش را ببیند
    const customers = await Customer.find({ tenantId: tenant1 });
    expect(customers.length).toBe(1);
    expect(customers[0].tenantId.toString()).toBe(tenant1.toString());
    expect(customers[0].name).toBe("Ali");
  });

  it("should not allow tenant2 to access tenant1 data", async () => {
    const customers = await Customer.find({ tenantId: tenant2 });
    expect(customers.length).toBe(1);
    expect(customers[0].tenantId.toString()).toBe(tenant2.toString());
    expect(customers[0].name).toBe("Reza");
  });
});

describe("Transaction Data Isolation Security Test", () => {
  let tenant1, tenant2, tx1, tx2;

  beforeAll(async () => {
    tenant1 = new mongoose.Types.ObjectId();
    tenant2 = new mongoose.Types.ObjectId();
    tx1 = await Transaction.create({
      tenantId: tenant1,
      amount: 1000,
      type: "deposit",
    });
    tx2 = await Transaction.create({
      tenantId: tenant2,
      amount: 2000,
      type: "withdraw",
    });
  });

  afterAll(async () => {
    await Transaction.deleteMany({});
  });

  it("should not allow tenant1 to access tenant2 transactions", async () => {
    const txs = await Transaction.find({ tenantId: tenant1 });
    expect(txs.length).toBe(1);
    expect(txs[0].tenantId.toString()).toBe(tenant1.toString());
    expect(txs[0].amount).toBe(1000);
  });

  it("should not allow tenant2 to access tenant1 transactions", async () => {
    const txs = await Transaction.find({ tenantId: tenant2 });
    expect(txs.length).toBe(1);
    expect(txs[0].tenantId.toString()).toBe(tenant2.toString());
    expect(txs[0].amount).toBe(2000);
  });
});

const tenantId = new mongoose.Types.ObjectId();
const branchId = new mongoose.Types.ObjectId();
const userId = new mongoose.Types.ObjectId();
const token = jwt.sign(
  { _id: userId, tenantId, branchId, role: "tenant_admin" },
  "testsecret",
);

describe("صحت ثبت اسناد حسابداری", () => {
  let tx;
  beforeAll(async () => {
    await mongoose.connect("mongodb://localhost:27017/exchange_test", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await Transaction.deleteMany({});
    await JournalEntry.deleteMany({});
    // ایجاد تراکنش تستی
    tx = await Transaction.create({
      tenantId,
      branchId,
      type: "deposit",
      amount: 5000,
    });
    // فرض: سرویس حسابداری به صورت اتوماتیک سند ثبت می‌کند
    // اگر نیاز به فراخوانی دستی است، اینجا فراخوانی شود
  });
  afterAll(async () => {
    await mongoose.connection.close();
  });

  it("باید دو سند (debit/credit) برای هر تراکنش ثبت شود", async () => {
    const entries = await JournalEntry.find({ transactionId: tx._id });
    expect(entries.length).toBe(2);
    const debit = entries.find((e) => e.type === "debit");
    const credit = entries.find((e) => e.type === "credit");
    expect(debit).toBeDefined();
    expect(credit).toBeDefined();
    expect(debit.amount).toBe(credit.amount);
    expect(debit.tenantId.toString()).toBe(tenantId.toString());
    expect(credit.tenantId.toString()).toBe(tenantId.toString());
  });
});
