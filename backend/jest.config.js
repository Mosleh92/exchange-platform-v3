module.exports = {
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    },
    './src/middleware/auth.js': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/scripts/**',
    '!src/tests/**'
  ],
  setupFiles: ['./src/tests/setup.js']
};
