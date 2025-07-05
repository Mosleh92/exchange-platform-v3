const { hasAccess } = require('./roleAccess.js');

describe('Role Access', () => {
  it('should allow access for correct role', () => {
    const user = { role: 'admin' };
    expect(hasAccess(user, ['admin', 'user'])).toBe(true);
  });
  it('should deny access for incorrect role', () => {
    const user = { role: 'guest' };
    expect(hasAccess(user, ['admin', 'user'])).toBe(false);
  });
}); 