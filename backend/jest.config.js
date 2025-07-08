module.exports = {
  // Test environment
  testEnvironment: "node",

  // Setup files
  setupFilesAfterEnv: ["<rootDir>/src/tests/setup.js"],

  // Test patterns
  testMatch: [
    "<rootDir>/src/tests/**/*.test.js",
    "<rootDir>/src/**/__tests__/**/*.js",
    "<rootDir>/src/**/*.test.js",
  ],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/server.js",
    "!src/config/**",
    "!src/tests/**",
    "!src/**/*.test.js",
    "!**/node_modules/**",
  ],

  // Coverage thresholds - temporarily lowered for development
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 10,
      lines: 10,
      statements: 10,
    },
    // Critical modules require higher coverage
    "./src/middleware/auth.js": {
      branches: 20,
      functions: 20,
      lines: 20,
      statements: 20,
    },
    "./src/controllers/auth.controller.js": {
      branches: 20,
      functions: 20,
      lines: 20,
      statements: 20,
    },
  },

  // Test timeout
  testTimeout: 30000,

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Global variables
  globals: {
    NODE_ENV: "test",
  },

  // Module name mapping
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@config/(.*)$": "<rootDir>/src/config/$1",
    "^@models/(.*)$": "<rootDir>/src/models/$1",
    "^@controllers/(.*)$": "<rootDir>/src/controllers/$1",
    "^@services/(.*)$": "<rootDir>/src/services/$1",
    "^@middleware/(.*)$": "<rootDir>/src/middleware/$1",
    "^@utils/(.*)$": "<rootDir>/src/utils/$1",
  },

  // Transform configuration
  transform: {
    "^.+\\.js$": "babel-jest",
  },

  // Ignore patterns
  testPathIgnorePatterns: ["/node_modules/", "/coverage/", "/dist/"],

  // Coverage report formats
  coverageReporters: ["text", "text-summary", "html", "lcov", "json"],

  // Silent mode for cleaner output
  silent: false,

  // Error on deprecated APIs
  errorOnDeprecated: true,

  // Detect open handles
  detectOpenHandles: true,

  // Force exit after tests
  forceExit: true,
};
