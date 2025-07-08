const csrf = require("csurf");
const logger = require("../utils/logger");

// CSRF protection middleware
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  },
});

// CSRF error handler
const csrfErrorHandler = (err, req, res, next) => {
  if (err.code === "EBADCSRFTOKEN") {
    logger.warn("CSRF token validation failed", {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    return res.status(403).json({
      success: false,
      message: "توکن CSRF نامعتبر است",
      code: "CSRF_ERROR",
    });
  }
  next(err);
};

// Generate CSRF token for frontend
const generateToken = (req, res, next) => {
  res.cookie("XSRF-TOKEN", req.csrfToken(), {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  next();
};

module.exports = {
  csrfProtection,
  csrfErrorHandler,
  generateToken,
};
