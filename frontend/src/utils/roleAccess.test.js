import { describe, it, expect } from 'vitest';
import { hasAccess } from './roleAccess';

describe('hasAccess', () => {
  it('returns true for allowed role', () => {
    expect(hasAccess({ role: 'admin' }, ['admin'])).toBe(true);
  });
  it('returns false for disallowed role', () => {
    expect(hasAccess({ role: 'user' }, ['admin'])).toBe(false);
  });
}); 