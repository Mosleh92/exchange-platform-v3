require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const request = require('supertest');
const app = require('../server');

describe('Rate Limiting (Brute Force Protection)', () => {
  it('should block repeated login attempts with 429', async () => {
    let lastStatus = 200;
    for (let i = 0; i < 15; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'fake@example.com', password: 'wrongpass' });
      lastStatus = res.statusCode;
      if (lastStatus === 429) break;
    }
    expect(lastStatus).toBe(429);
  });
});