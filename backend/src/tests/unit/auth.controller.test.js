const authController = require("../../controllers/auth.controller");
const User = require("../../models/User");
const Tenant = require("../../models/Tenant");
const RefreshToken = require("../../models/RefreshToken");
const jwt = require("jsonwebtoken");

describe("Auth Controller", () => {
  let req, res;
  let testTenant;

  beforeEach(async () => {
    testTenant = await global.testUtils.createTestTenant();

    req = {
      body: {},
      user: null,
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe("register", () => {
    it("should register new user successfully", async () => {
      req.body = {
        username: "newuser123",
        email: "newuser@example.com",
        password: "SecurePass@123",
        fullName: "New User",
        phone: "09123456789",
        nationalId: "1234567890",
        role: "customer",
        tenantId: testTenant._id,
      };

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            user: expect.objectContaining({
              username: "newuser123",
              email: "newuser@example.com",
              role: "customer",
            }),
          }),
        }),
      );

      // Verify user was created in database
      const user = await User.findOne({ email: "newuser@example.com" });
      expect(user).toBeTruthy();
      expect(user.status).toBe("pending");
    });

    it("should reject registration with existing email", async () => {
      // Create user first
      await global.testUtils.createTestUser({
        email: "existing@example.com",
        tenantId: testTenant._id,
      });

      req.body = {
        username: "newuser123",
        email: "existing@example.com",
        password: "SecurePass@123",
        fullName: "New User",
        phone: "09123456789",
        nationalId: "1234567890",
        tenantId: testTenant._id,
      };

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        }),
      );
    });

    it("should reject registration with invalid email", async () => {
      req.body = {
        username: "newuser123",
        email: "invalid-email",
        password: "SecurePass@123",
        fullName: "New User",
        phone: "09123456789",
        nationalId: "1234567890",
        tenantId: testTenant._id,
      };

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "آدرس ایمیل نامعتبر است",
        }),
      );
    });

    it("should sanitize user input", async () => {
      req.body = {
        username: '<script>alert("xss")</script>',
        email: "test@example.com",
        password: "SecurePass@123",
        fullName: "<b>Bold Name</b>",
        phone: "09123456789",
        nationalId: "1234567890",
        tenantId: testTenant._id,
      };

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(201);

      const user = await User.findOne({ email: "test@example.com" });
      expect(user.username).not.toContain("<script>");
      expect(user.fullName).not.toContain("<b>");
    });
  });

  describe("login", () => {
    let testUser;

    beforeEach(async () => {
      testUser = await global.testUtils.createTestUser({
        email: "testuser@example.com",
        password: "SecurePass@123",
        tenantId: testTenant._id,
        status: "active",
      });
    });

    it("should login successfully with valid credentials", async () => {
      req.body = {
        email: "testuser@example.com",
        password: "SecurePass@123",
      };

      await authController.login(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
            user: expect.objectContaining({
              email: "testuser@example.com",
            }),
          }),
        }),
      );

      // Verify refresh token was stored
      const refreshToken = await RefreshToken.findOne({ userId: testUser._id });
      expect(refreshToken).toBeTruthy();
    });

    it("should reject login with invalid email", async () => {
      req.body = {
        email: "nonexistent@example.com",
        password: "SecurePass@123",
      };

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        }),
      );
    });

    it("should reject login with invalid password", async () => {
      req.body = {
        email: "testuser@example.com",
        password: "WrongPassword",
      };

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        }),
      );
    });

    it("should reject login for inactive user", async () => {
      await User.findByIdAndUpdate(testUser._id, { status: "inactive" });

      req.body = {
        email: "testuser@example.com",
        password: "SecurePass@123",
      };

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        }),
      );
    });

    it("should reject login for locked account", async () => {
      // Simulate locked account
      await User.findByIdAndUpdate(testUser._id, {
        loginAttempts: 5,
        lockUntil: new Date(Date.now() + 60000), // 1 minute
      });

      req.body = {
        email: "testuser@example.com",
        password: "SecurePass@123",
      };

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(423);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        }),
      );
    });

    it("should reject login for inactive tenant", async () => {
      await Tenant.findByIdAndUpdate(testTenant._id, { status: "inactive" });

      req.body = {
        email: "testuser@example.com",
        password: "SecurePass@123",
      };

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        }),
      );
    });

    it("should increment login attempts on failed password", async () => {
      req.body = {
        email: "testuser@example.com",
        password: "WrongPassword",
      };

      await authController.login(req, res);

      const user = await User.findById(testUser._id);
      expect(user.loginAttempts).toBe(1);
    });

    it("should reset login attempts on successful login", async () => {
      // Set some login attempts first
      await User.findByIdAndUpdate(testUser._id, { loginAttempts: 3 });

      req.body = {
        email: "testuser@example.com",
        password: "SecurePass@123",
      };

      await authController.login(req, res);

      const user = await User.findById(testUser._id);
      expect(user.loginAttempts).toBe(0);
    });

    it("should update last login timestamp", async () => {
      const beforeLogin = new Date();

      req.body = {
        email: "testuser@example.com",
        password: "SecurePass@123",
      };

      await authController.login(req, res);

      const user = await User.findById(testUser._id);
      expect(user.lastLogin).toBeInstanceOf(Date);
      expect(user.lastLogin.getTime()).toBeGreaterThanOrEqual(
        beforeLogin.getTime(),
      );
    });
  });

  describe("refreshToken", () => {
    let testUser, validRefreshToken;

    beforeEach(async () => {
      testUser = await global.testUtils.createTestUser({
        tenantId: testTenant._id,
        status: "active",
      });

      // Create refresh token
      validRefreshToken = jwt.sign(
        { userId: testUser._id, tenantId: testTenant._id, type: "refresh" },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: "7d" },
      );

      await RefreshToken.create({
        userId: testUser._id,
        tenantId: testTenant._id,
        token: validRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    });

    it("should refresh access token with valid refresh token", async () => {
      req.body = {
        refreshToken: validRefreshToken,
      };

      await authController.refreshToken(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            accessToken: expect.any(String),
            user: expect.objectContaining({
              id: testUser._id.toString(),
            }),
          }),
        }),
      );
    });

    it("should reject invalid refresh token", async () => {
      req.body = {
        refreshToken: "invalid-token",
      };

      await authController.refreshToken(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Refresh token نامعتبر است",
        }),
      );
    });

    it("should reject expired refresh token", async () => {
      // Create expired token
      const expiredToken = jwt.sign(
        { userId: testUser._id, tenantId: testTenant._id, type: "refresh" },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: "-1h" },
      );

      req.body = {
        refreshToken: expiredToken,
      };

      await authController.refreshToken(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Refresh token نامعتبر است",
        }),
      );
    });

    it("should reject refresh token not in database", async () => {
      const notStoredToken = jwt.sign(
        { userId: testUser._id, tenantId: testTenant._id, type: "refresh" },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: "7d" },
      );

      req.body = {
        refreshToken: notStoredToken,
      };

      await authController.refreshToken(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Refresh token یافت نشد",
        }),
      );
    });
  });

  describe("logout", () => {
    let testUser, refreshTokenRecord;

    beforeEach(async () => {
      testUser = await global.testUtils.createTestUser({
        tenantId: testTenant._id,
      });

      refreshTokenRecord = await RefreshToken.create({
        userId: testUser._id,
        tenantId: testTenant._id,
        token: "test-refresh-token",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    });

    it("should logout successfully", async () => {
      req.body = {
        refreshToken: "test-refresh-token",
      };

      await authController.logout(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "با موفقیت خارج شدید",
        }),
      );

      // Verify refresh token was removed
      const token = await RefreshToken.findById(refreshTokenRecord._id);
      expect(token).toBeNull();
    });

    it("should logout without refresh token", async () => {
      await authController.logout(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "با موفقیت خارج شدید",
        }),
      );
    });
  });

  describe("logoutAll", () => {
    let testUser;

    beforeEach(async () => {
      testUser = await global.testUtils.createTestUser({
        tenantId: testTenant._id,
      });

      req.user = { userId: testUser._id };

      // Create multiple refresh tokens
      await RefreshToken.create([
        {
          userId: testUser._id,
          tenantId: testTenant._id,
          token: "token1",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        {
          userId: testUser._id,
          tenantId: testTenant._id,
          token: "token2",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      ]);
    });

    it("should logout from all devices", async () => {
      await authController.logoutAll(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "از همه دستگاه‌ها خارج شدید",
        }),
      );

      // Verify all refresh tokens were removed
      const tokens = await RefreshToken.find({ userId: testUser._id });
      expect(tokens).toHaveLength(0);
    });
  });
});
