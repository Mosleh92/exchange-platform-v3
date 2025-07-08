require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
const request = require("supertest");
const app = require("../server");
const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const jwt = require("jsonwebtoken");

const tenant1 = new mongoose.Types.ObjectId();
const tenant2 = new mongoose.Types.ObjectId();
const branch1 = new mongoose.Types.ObjectId();
const branch2 = new mongoose.Types.ObjectId();
const user1 = new mongoose.Types.ObjectId();
const user2 = new mongoose.Types.ObjectId();
const token1 = jwt.sign(
  {
    _id: user1,
    tenantId: tenant1,
    branchId: branch1,
    role: "tenant_admin",
    tenantAccess: [tenant1],
  },
  "testsecret",
);
const token2 = jwt.sign(
  {
    _id: user2,
    tenantId: tenant2,
    branchId: branch2,
    role: "tenant_admin",
    tenantAccess: [tenant2],
  },
  "testsecret",
);

describe("ایزولاسیون داده بین tenantها", () => {
  let tx1, tx2;
  beforeAll(async () => {
    await mongoose.connect("mongodb://localhost:27017/exchange_test", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await Transaction.deleteMany({});
    tx1 = await Transaction.create({
      tenantId: tenant1,
      branchId: branch1,
      type: "payment",
      amount: 1000,
    });
    tx2 = await Transaction.create({
      tenantId: tenant2,
      branchId: branch2,
      type: "payment",
      amount: 2000,
    });
  });
  afterAll(async () => {
    await mongoose.connection.close();
  });

  it("کاربر tenant1 نباید به تراکنش tenant2 دسترسی داشته باشد حتی با تغییر پارامتر", async () => {
    const res = await request(app)
      .get(`/api/transactions/${tx2._id}`)
      .set("Authorization", `Bearer ${token1}`)
      .set("x-tenant-id", tenant2.toString()); // تلاش برای دور زدن
    expect([403, 404]).toContain(res.statusCode);
  });

  it("کاربر tenant2 نباید به تراکنش tenant1 دسترسی داشته باشد حتی با تغییر header", async () => {
    const res = await request(app)
      .get(`/api/transactions/${tx1._id}`)
      .set("Authorization", `Bearer ${token2}`)
      .set("x-tenant-id", tenant1.toString()); // تلاش برای دور زدن
    expect([403, 404]).toContain(res.statusCode);
  });

  it("کاربر tenant1 فقط باید به تراکنش خودش دسترسی داشته باشد", async () => {
    const res = await request(app)
      .get(`/api/transactions/${tx1._id}`)
      .set("Authorization", `Bearer ${token1}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.tenantId).toBe(tenant1.toString());
  });
});
