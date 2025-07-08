const app = require('../src/app');

describe('Minimal Application', () => {
  test('should load app successfully', () => {
    expect(app).toBeDefined();
    expect(typeof app).toBe('function');
  });

  test('should have proper middleware setup', () => {
    // Basic test to ensure the app object has the required properties
    expect(app._router).toBeDefined();
  });
});

describe('Config', () => {
  test('should load configuration', () => {
    const config = require('../src/config');
    expect(config).toBeDefined();
    expect(config.port).toBeDefined();
    expect(config.mongoUri).toBeDefined();
    expect(config.jwtSecret).toBeDefined();
  });
});

describe('Routes', () => {
  test('should load routes', () => {
    const routes = require('../src/routes');
    expect(routes).toBeDefined();
    expect(typeof routes).toBe('function');
  });
});