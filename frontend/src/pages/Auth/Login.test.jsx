import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Login from './Login';
import { AuthProvider } from 'src/contexts/AuthContext.jsx';

describe('Login Page', () => {
  it('renders login form', () => {
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );
    expect(screen.getByLabelText(/username|نام کاربری/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password|رمز عبور/i)).toBeInTheDocument();
  });
});