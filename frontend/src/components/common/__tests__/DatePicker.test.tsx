import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { format } from 'date-fns';
import DatePicker from '../DatePicker';

describe('DatePicker Component', () => {
  const defaultProps = {
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders input field', () => {
    render(<DatePicker {...defaultProps} />);
    
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows calendar on input focus', async () => {
    render(<DatePicker {...defaultProps} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    
    await waitFor(() => {
      expect(screen.getByText('Sun')).toBeInTheDocument();
    });
  });

  it('displays current month and year', async () => {
    render(<DatePicker {...defaultProps} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    
    const currentMonth = format(new Date(), 'MMMM yyyy');
    await waitFor(() => {
      expect(screen.getByText(currentMonth)).toBeInTheDocument();
    });
  });

  it('navigates to previous month', async () => {
    render(<DatePicker {...defaultProps} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    
    await waitFor(() => {
      const prevButton = screen.getByRole('button', { name: /previous month/i });
      fireEvent.click(prevButton);
    });
    
    // Should show previous month
    const previousMonth = format(new Date(new Date().getFullYear(), new Date().getMonth() - 1), 'MMMM yyyy');
    expect(screen.getByText(previousMonth)).toBeInTheDocument();
  });

  it('navigates to next month', async () => {
    render(<DatePicker {...defaultProps} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    
    await waitFor(() => {
      const nextButton = screen.getByRole('button', { name: /next month/i });
      fireEvent.click(nextButton);
    });
    
    // Should show next month
    const nextMonth = format(new Date(new Date().getFullYear(), new Date().getMonth() + 1), 'MMMM yyyy');
    expect(screen.getByText(nextMonth)).toBeInTheDocument();
  });

  it('selects a date when clicked', async () => {
    const onChange = jest.fn();
    render(<DatePicker {...defaultProps} onChange={onChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    
    await waitFor(() => {
      const today = screen.getByText(format(new Date(), 'd'));
      fireEvent.click(today);
    });
    
    expect(onChange).toHaveBeenCalled();
  });

  it('displays selected date in input', () => {
    const selectedDate = new Date(2023, 5, 15);
    render(<DatePicker {...defaultProps} value={selectedDate} />);
    
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe(format(selectedDate, 'MM/dd/yyyy'));
  });

  it('clears selected date when clear button is clicked', async () => {
    const onChange = jest.fn();
    const selectedDate = new Date(2023, 5, 15);
    
    render(
      <DatePicker 
        {...defaultProps} 
        value={selectedDate} 
        onChange={onChange}
        clearable 
      />
    );
    
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    
    await waitFor(() => {
      const clearButton = screen.getByText('Clear');
      fireEvent.click(clearButton);
    });
    
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('disables dates outside min/max range', async () => {
    const minDate = new Date(2023, 5, 10);
    const maxDate = new Date(2023, 5, 20);
    
    render(
      <DatePicker 
        {...defaultProps} 
        minDate={minDate}
        maxDate={maxDate}
      />
    );
    
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    
    await waitFor(() => {
      // Should not be able to click dates outside range
      const disabledDays = screen.getAllByRole('button').filter(button => 
        button.hasAttribute('disabled')
      );
      expect(disabledDays.length).toBeGreaterThan(0);
    });
  });

  it('applies custom className', () => {
    render(<DatePicker {...defaultProps} className="custom-datepicker" />);
    
    const container = screen.getByRole('textbox').closest('div');
    expect(container).toHaveClass('custom-datepicker');
  });

  it('disables input when disabled prop is true', () => {
    render(<DatePicker {...defaultProps} disabled />);
    
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('does not open calendar when disabled', () => {
    render(<DatePicker {...defaultProps} disabled />);
    
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    
    expect(screen.queryByText('Clear')).not.toBeInTheDocument();
  });

  it('closes calendar when clicking outside', async () => {
    render(<DatePicker {...defaultProps} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    
    await waitFor(() => {
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });
    
    // Click outside
    fireEvent.mouseDown(document.body);
    
    await waitFor(() => {
      expect(screen.queryByText('Clear')).not.toBeInTheDocument();
    });
  });

  it('handles keyboard navigation', async () => {
    render(<DatePicker {...defaultProps} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    
    await waitFor(() => {
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });
    
    // Press Escape to close
    fireEvent.keyDown(input, { key: 'Escape' });
    
    await waitFor(() => {
      expect(screen.queryByText('Clear')).not.toBeInTheDocument();
    });
  });

  it('uses custom date format', () => {
    const selectedDate = new Date(2023, 5, 15);
    render(
      <DatePicker 
        {...defaultProps} 
        value={selectedDate}
        format="yyyy-MM-dd"
      />
    );
    
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe(format(selectedDate, 'yyyy-MM-dd'));
  });
}); 