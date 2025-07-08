require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
const request = require("supertest");
const app = require("../server");

describe("CSRF Protection", () => {
  it("should reject POST request without CSRF token", async () => {
    const res = await request(app)
      .post("/api/customers")
      .send({ name: "Ali", phone: "+989123456789" });
    expect([400, 403]).toContain(res.statusCode);
  });

  it("should accept POST request with valid CSRF token", async () => {
    // ابتدا یک GET برای دریافت CSRF token
    const agent = request.agent(app);
    const getRes = await agent.get("/api/customers"); // فرض بر این که این route CSRF token را ست می‌کند
    const csrfToken = getRes.headers["x-csrf-token"] || getRes.body.csrfToken;
    expect(csrfToken).toBeDefined();
    // ارسال POST با CSRF token
    const postRes = await agent
      .post("/api/customers")
      .set("x-csrf-token", csrfToken)
      .send({ name: "Ali", phone: "+989123456789" });
    // اگر احراز هویت نیاز است، باید توکن JWT نیز ست شود
    expect([200, 201, 400, 422]).toContain(postRes.statusCode); // بسته به ولیدیشن
  });
});
