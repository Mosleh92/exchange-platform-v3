const { auth, tenantIsolation, authorize } = require("../../middleware/auth");
const User = require("../../models/User");
const Tenant = require("../../models/Tenant");
const jwt = require("jsonwebtoken");

describe("Auth Middleware", () => {
  let req, res, next;
  let testUser, testTenant;

  beforeEach(async () => {
    // Create test tenant
    testTenant = await global.testUtils.createTestTenant();

    // Create test user
    testUser = await global.testUtils.createTestUser({
      tenantId: testTenant._id,
      role: "tenant_admin",
    });

    // Mock request, response, and next
    req = {
      header: jest.fn(),
      user: null,
      tenant: null,
      params: {},
      body: {},
      query: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    next = jest.fn();
  });

  describe("auth middleware", () => {
    it("should authenticate valid JWT token", async () => {
      const token = jwt.sign({ userId: testUser._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      req.header.mockReturnValue(`Bearer ${token}`);

      await auth(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user.userId.toString()).toBe(testUser._id.toString());
      expect(next).toHaveBeenCalled();
    });

    it("should reject request without token", async () => {
      req.header.mockReturnValue(null);

      await auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "توکن احراز هویت ارائه نشده است",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should reject invalid JWT token", async () => {
      req.header.mockReturnValue("Bearer invalid-token");

      await auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "توکن نامعتبر است",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should reject expired JWT token", async () => {
      const expiredToken = jwt.sign(
        { userId: testUser._id },
        process.env.JWT_SECRET,
        { expiresIn: "-1h" }, // Expired
      );

      req.header.mockReturnValue(`Bearer ${expiredToken}`);

      await auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "توکن منقضی شده است",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should reject user with inactive status", async () => {
      // Update user status to inactive
      await User.findByIdAndUpdate(testUser._id, { status: "inactive" });

      const token = jwt.sign({ userId: testUser._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      req.header.mockReturnValue(`Bearer ${token}`);

      await auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "حساب کاربری غیرفعال شده است",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should reject user with inactive tenant", async () => {
      // Update tenant status to inactive
      await Tenant.findByIdAndUpdate(testTenant._id, { status: "inactive" });

      const token = jwt.sign({ userId: testUser._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      req.header.mockReturnValue(`Bearer ${token}`);

      await auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "سازمان شما غیرفعال شده است",
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("tenantIsolation middleware", () => {
    beforeEach(() => {
      req.user = {
        userId: testUser._id,
        tenantId: testTenant._id,
        role: "tenant_admin",
      };
    });

    it("should allow super admin to access any tenant", async () => {
      req.user.role = "super_admin";
      req.params.tenantId = testTenant._id.toString();

      await tenantIsolation(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should allow user to access their own tenant", async () => {
      req.params.tenantId = testTenant._id.toString();

      await tenantIsolation(req, res, next);

      expect(req.tenant).toBeDefined();
      expect(req.tenant._id.toString()).toBe(testTenant._id.toString());
      expect(next).toHaveBeenCalled();
    });

    it("should reject user accessing different tenant", async () => {
      const otherTenant = await global.testUtils.createTestTenant();
      req.params.tenantId = otherTenant._id.toString();

      await tenantIsolation(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "شما دسترسی به این صرافی را ندارید",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should reject request without tenant ID", async () => {
      await tenantIsolation(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "شناسه صرافی ارائه نشده است",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should reject invalid tenant ID format", async () => {
      req.params.tenantId = "invalid-id";

      await tenantIsolation(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "شناسه صرافی نامعتبر است",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle tenant ID from different sources", async () => {
      // Test from body
      req.body.tenantId = testTenant._id.toString();
      await tenantIsolation(req, res, next);
      expect(next).toHaveBeenCalled();

      // Reset
      req.body = {};
      next.mockClear();

      // Test from query
      req.query.tenantId = testTenant._id.toString();
      await tenantIsolation(req, res, next);
      expect(next).toHaveBeenCalled();

      // Reset
      req.query = {};
      next.mockClear();

      // Test from headers
      req.headers = { "x-tenant-id": testTenant._id.toString() };
      await tenantIsolation(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe("authorize middleware", () => {
    beforeEach(() => {
      req.user = {
        userId: testUser._id,
        tenantId: testTenant._id,
        role: "customer",
        permissions: [
          { resource: "transactions", actions: ["create", "read"] },
          { resource: "accounts", actions: ["read"] },
        ],
      };
    });

    it("should allow access with correct role", () => {
      const middleware = authorize("customer", "tenant_admin");

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should allow access with correct permission", () => {
      const middleware = authorize("transactions:create");

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should deny access without correct role or permission", () => {
      const middleware = authorize("super_admin", "transactions:delete");

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "شما دسترسی به این عملیات را ندارید",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should deny access without authentication", () => {
      req.user = null;
      const middleware = authorize("customer");

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "احراز هویت لازم است",
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
