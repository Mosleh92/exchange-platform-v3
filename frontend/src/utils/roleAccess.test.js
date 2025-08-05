import { describe, it, expect, jest } from '@jest/globals';

jest.mock('../contexts/AuthContext', () => ({ AuthContext: {} }));

import { hasAccess } from './roleAccess.js';

describe('hasAccess', () => {
  it('returns true for allowed role', () => {
    expect(hasAccess({ role: 'admin' }, ['admin'])).toBe(true);
  });
  it('returns false for disallowed role', () => {
    expect(hasAccess({ role: 'user' }, ['admin'])).toBe(false);
  });
  it('returns true when user role is among multiple allowed roles', () => {
    expect(hasAccess({ role: 'manager' }, ['admin', 'manager'])).toBe(true);
  });
  it('returns false when user lacks a role property', () => {
    expect(hasAccess({}, ['admin'])).toBe(false);
  });
});

