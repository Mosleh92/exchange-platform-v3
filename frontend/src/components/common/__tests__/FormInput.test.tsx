import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from '@jest/globals';
import FormInput from '../FormInput';

describe('FormInput Component', () => {
  it('renders with label', () => {
    render(<FormInput label="Email" />);
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('renders with required indicator', () => {
    render(<FormInput label="Email" required />);
    
    const label = screen.getByText(/email/i);
    expect(label).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<FormInput label="Email" error="Email is required" />);
    
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows helper text', () => {
    render(<FormInput label="Email" helperText="Enter your email address" />);
    
    expect(screen.getByText('Enter your email address')).toBeInTheDocument();
  });

  it('handles input changes', () => {
    const handleChange = vi.fn();
    render(<FormInput label="Email" onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    
    expect(handleChange).toHaveBeenCalled();
    expect(input).toHaveValue('test@example.com');
  });

  it('renders with left icon', () => {
    const icon = <span data-testid="left-icon">📧</span>;
    render(<FormInput label="Email" leftIcon={icon} />);
    
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveClass('pl-10');
  });

  it('renders with right icon', () => {
    const icon = <span data-testid="right-icon">👁️</span>;
    render(<FormInput label="Email" rightIcon={icon} />);
    
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveClass('pr-10');
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<FormInput ref={ref} label="Email" />);
    
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('applies custom className', () => {
    render(<FormInput label="Email" className="custom-class" />);
    
    expect(screen.getByRole('textbox')).toHaveClass('custom-class');
  });

  it('has proper accessibility attributes', () => {
    render(<FormInput label="Email" id="email-input" />);
    
    const input = screen.getByRole('textbox');
    const label = screen.getByText('Email');
    
    expect(input).toHaveAttribute('id', 'email-input');
    expect(label).toHaveAttribute('for', 'email-input');
  });

  it('handles disabled state', () => {
    render(<FormInput label="Email" disabled />);
    
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('handles placeholder', () => {
    render(<FormInput label="Email" placeholder="Enter your email" />);
    
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
  });

  it('handles different input types', () => {
    const { rerender } = render(<FormInput label="Password" type="password" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'password');
    
    rerender(<FormInput label="Email" type="email" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');
  });

  it('handles full width prop', () => {
    render(<FormInput label="Email" fullWidth />);
    
    const container = screen.getByRole('textbox').parentElement?.parentElement;
    expect(container).toHaveClass('w-full');
  });

  it('does not show helper text when error is present', () => {
    render(
      <FormInput 
        label="Email" 
        error="Email is required" 
        helperText="This should not show" 
      />
    );
    
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.queryByText('This should not show')).not.toBeInTheDocument();
  });
}); 