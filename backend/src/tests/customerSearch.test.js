require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
const request = require("supertest");
const app = require("../server");
const mongoose = require("mongoose");
const User = require("../models/User");
const Customer = require("../models/Customer");

// فرض: توکن JWT و setup دیتابیس تستی موجود است

describe("Customer Search & Filter", () => {
  let token, user, tenantId;

  beforeAll(async () => {
    user = await User.create({
      username: "testadmin2",
      email: "testadmin2@example.com",
      password: "Test@1234",
      fullName: "Test Admin2",
      role: "admin",
      status: "active",
      tenantId: new mongoose.Types.ObjectId(),
    });
    tenantId = user.tenantId;
    // ایجاد چند مشتری تستی
    await Customer.create([
      {
        name: "Ali Test",
        phone: "+989111111111",
        email: "ali@test.com",
        tenant_id: tenantId,
        kyc_status: "verified",
      },
      {
        name: "Sara Example",
        phone: "+989122222222",
        email: "sara@example.com",
        tenant_id: tenantId,
        kyc_status: "pending",
      },
      {
        name: "Reza Filter",
        phone: "+989133333333",
        email: "reza@filter.com",
        tenant_id: tenantId,
        kyc_status: "rejected",
      },
    ]);
    // فرض: توکن JWT معتبر برای user ساخته شود
    token = "YOUR_JWT_TOKEN"; // این مقدار باید با توکن واقعی جایگزین شود
  });

  afterAll(async () => {
    await Customer.deleteMany({});
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  it("should search customers by name", async () => {
    const res = await request(app)
      .get("/api/customers?term=Ali")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "Ali Test" })]),
    );
  });

  it("should search customers by email", async () => {
    const res = await request(app)
      .get("/api/customers?term=sara@example.com")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: "sara@example.com" }),
      ]),
    );
  });

  it("should filter customers by status", async () => {
    const res = await request(app)
      .get("/api/customers?filter=active")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kyc_status: "verified" }),
      ]),
    );
  });
});
