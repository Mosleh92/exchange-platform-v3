import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>کلیک کن</Button>);
    expect(screen.getByText('کلیک کن')).toBeInTheDocument();
  });

  it('supports disabled', () => {
    render(<Button disabled>غیرفعال</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('calls onClick', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>کلیک</Button>);
    fireEvent.click(screen.getByText('کلیک'));
    expect(handleClick).toHaveBeenCalled();
  });
}); 