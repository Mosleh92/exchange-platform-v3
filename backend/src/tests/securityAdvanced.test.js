require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
const request = require("supertest");
const app = require("../server");
const mongoose = require("mongoose");
const User = require("../models/User");
const Customer = require("../models/Customer");

describe("Advanced Security Tests: NoSQL Injection & XSS", () => {
  let token, admin, customer;

  beforeAll(async () => {
    admin = await User.create({
      username: "adminx",
      email: "adminx@example.com",
      password: "Test@1234",
      fullName: "Admin X",
      role: "admin",
      status: "active",
      tenantId: new mongoose.Types.ObjectId(),
    });
    customer = await Customer.create({
      name: "Safe User",
      phone: "+989111111111",
      tenant_id: admin.tenantId,
    });
    token = "JWT_TOKEN_ADMINX"; // مقدار واقعی جایگزین شود
  });

  afterAll(async () => {
    await Customer.deleteMany({});
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  it("should prevent NoSQL injection in customerId param", async () => {
    const res = await request(app)
      .get("/api/customers/{$ne:null}")
      .set("Authorization", `Bearer ${token}`);
    expect([400, 404]).toContain(res.statusCode);
  });

  it("should store and escape XSS in customer name", async () => {
    // ثبت مشتری با نام مخرب
    const xssName = "<script>alert(1)</script>";
    await Customer.create({
      name: xssName,
      phone: "+989122222222",
      tenant_id: admin.tenantId,
    });
    const res = await request(app)
      .get("/api/customers")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    // داده باید به صورت string ذخیره شود و در فرانت‌اند escape شود
    const found = res.body.data.find((c) => c.name === xssName);
    expect(found).toBeDefined();
  });
});
