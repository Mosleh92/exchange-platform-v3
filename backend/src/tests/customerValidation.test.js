require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
const request = require("supertest");
const app = require("../server");
const mongoose = require("mongoose");
const User = require("../models/User");

// فرض: توکن JWT و setup دیتابیس تستی موجود است

describe("Customer Email & Phone Validation", () => {
  let token, user;

  beforeAll(async () => {
    user = await User.create({
      username: "testadmin",
      email: "testadmin@example.com",
      password: "Test@1234",
      fullName: "Test Admin",
      role: "admin",
      status: "active",
      tenantId: new mongoose.Types.ObjectId(),
    });
    // فرض: توکن JWT معتبر برای user ساخته شود
    token = "YOUR_JWT_TOKEN"; // این مقدار باید با توکن واقعی جایگزین شود
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  it("should reject invalid email", async () => {
    const res = await request(app)
      .post("/api/customers")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Ali",
        phone: "+989123456789",
        email: "invalid-email",
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          msg: expect.stringMatching(/ایمیل معتبر نیست/),
        }),
      ]),
    );
  });

  it("should reject invalid phone", async () => {
    const res = await request(app)
      .post("/api/customers")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Ali",
        phone: "123",
        email: "ali@example.com",
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          msg: expect.stringMatching(/فرمت شماره تلفن نامعتبر است/),
        }),
      ]),
    );
  });
});
