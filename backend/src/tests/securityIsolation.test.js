require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
const request = require("supertest");
const app = require("../server");
const mongoose = require("mongoose");
const User = require("../models/User");
const Customer = require("../models/Customer");

// فرض: توکن JWT و setup دیتابیس تستی موجود است

describe("Security: Tenant Isolation & RBAC", () => {
  let token1, token2, admin1, admin2, customer1, customer2;

  beforeAll(async () => {
    // ایجاد دو tenant و دو کاربر admin برای هرکدام
    admin1 = await User.create({
      username: "admin1",
      email: "admin1@example.com",
      password: "Test@1234",
      fullName: "Admin One",
      role: "admin",
      status: "active",
      tenantId: new mongoose.Types.ObjectId(),
    });
    admin2 = await User.create({
      username: "admin2",
      email: "admin2@example.com",
      password: "Test@1234",
      fullName: "Admin Two",
      role: "admin",
      status: "active",
      tenantId: new mongoose.Types.ObjectId(),
    });
    // ایجاد مشتری برای هر tenant
    customer1 = await Customer.create({
      name: "Ali",
      phone: "+989111111111",
      tenant_id: admin1.tenantId,
    });
    customer2 = await Customer.create({
      name: "Sara",
      phone: "+989122222222",
      tenant_id: admin2.tenantId,
    });
    // فرض: توکن JWT معتبر برای هر admin ساخته شود
    token1 = "JWT_TOKEN_ADMIN1";
    token2 = "JWT_TOKEN_ADMIN2";
  });

  afterAll(async () => {
    await Customer.deleteMany({});
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  it("should NOT allow admin1 to access customer2 of tenant2", async () => {
    const res = await request(app)
      .get(`/api/customers/${customer2._id}`)
      .set("Authorization", `Bearer ${token1}`);
    expect(res.statusCode).toBe(404);
  });

  it("should NOT allow admin2 to delete customer1 of tenant1", async () => {
    const res = await request(app)
      .delete(`/api/customers/${customer1._id}`)
      .set("Authorization", `Bearer ${token2}`);
    expect(res.statusCode).toBe(404);
  });

  it("should NOT allow staff to delete a plan (RBAC)", async () => {
    const staff = await User.create({
      username: "staff1",
      email: "staff1@example.com",
      password: "Test@1234",
      fullName: "Staff",
      role: "staff",
      status: "active",
      tenantId: admin1.tenantId,
    });
    const staffToken = "JWT_TOKEN_STAFF";
    const res = await request(app)
      .delete("/api/plans/123456789012")
      .set("Authorization", `Bearer ${staffToken}`);
    expect(res.statusCode).toBe(403);
  });
});
