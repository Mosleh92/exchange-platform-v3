import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Tooltip from '../Tooltip';

// Mock setTimeout and clearTimeout
jest.useFakeTimers();

describe('Tooltip Component', () => {
  const defaultProps = {
    content: 'Tooltip content',
    children: <button>Hover me</button>,
  };

  beforeEach(() => {
    jest.clearAllTimers();
  });

  it('renders children correctly', () => {
    render(<Tooltip {...defaultProps} />);
    
    expect(screen.getByText('Hover me')).toBeInTheDocument();
  });

  it('shows tooltip on mouse enter', async () => {
    render(<Tooltip {...defaultProps} delay={0} />);
    
    const trigger = screen.getByText('Hover me');
    fireEvent.mouseEnter(trigger);
    
    await waitFor(() => {
      expect(screen.getByText('Tooltip content')).toBeInTheDocument();
    });
  });

  it('hides tooltip on mouse leave', async () => {
    render(<Tooltip {...defaultProps} delay={0} />);
    
    const trigger = screen.getByText('Hover me');
    fireEvent.mouseEnter(trigger);
    
    await waitFor(() => {
      expect(screen.getByText('Tooltip content')).toBeInTheDocument();
    });
    
    fireEvent.mouseLeave(trigger);
    
    await waitFor(() => {
      expect(screen.queryByText('Tooltip content')).not.toBeInTheDocument();
    });
  });

  it('respects delay prop', async () => {
    render(<Tooltip {...defaultProps} delay={500} />);
    
    const trigger = screen.getByText('Hover me');
    fireEvent.mouseEnter(trigger);
    
    // Tooltip should not appear immediately
    expect(screen.queryByText('Tooltip content')).not.toBeInTheDocument();
    
    // Fast-forward time
    jest.advanceTimersByTime(500);
    
    await waitFor(() => {
      expect(screen.getByText('Tooltip content')).toBeInTheDocument();
    });
  });

  it('applies position classes correctly', async () => {
    render(<Tooltip {...defaultProps} position="bottom" delay={0} />);
    
    const trigger = screen.getByText('Hover me');
    fireEvent.mouseEnter(trigger);
    
    await waitFor(() => {
      const tooltip = screen.getByText('Tooltip content').closest('[role="tooltip"]');
      expect(tooltip).toHaveClass('bottom');
    });
  });

  it('applies custom className', () => {
    render(<Tooltip {...defaultProps} className="custom-tooltip" />);
    
    const trigger = screen.getByText('Hover me').parentElement;
    expect(trigger).toHaveClass('custom-tooltip');
  });

  it('does not show tooltip when disabled', async () => {
    render(<Tooltip {...defaultProps} disabled delay={0} />);
    
    const trigger = screen.getByText('Hover me');
    fireEvent.mouseEnter(trigger);
    
    // Tooltip should not appear
    expect(screen.queryByText('Tooltip content')).not.toBeInTheDocument();
  });

  it('hides tooltip on escape key', async () => {
    render(<Tooltip {...defaultProps} delay={0} />);
    
    const trigger = screen.getByText('Hover me');
    fireEvent.mouseEnter(trigger);
    
    await waitFor(() => {
      expect(screen.getByText('Tooltip content')).toBeInTheDocument();
    });
    
    fireEvent.keyDown(trigger, { key: 'Escape' });
    
    await waitFor(() => {
      expect(screen.queryByText('Tooltip content')).not.toBeInTheDocument();
    });
  });

  it('renders complex content', async () => {
    const complexContent = (
      <div>
        <strong>Bold text</strong>
        <span> and regular text</span>
      </div>
    );
    
    render(
      <Tooltip content={complexContent} delay={0}>
        <button>Hover me</button>
      </Tooltip>
    );
    
    const trigger = screen.getByText('Hover me');
    fireEvent.mouseEnter(trigger);
    
    await waitFor(() => {
      expect(screen.getByText('Bold text')).toBeInTheDocument();
      expect(screen.getByText(' and regular text')).toBeInTheDocument();
    });
  });

  it('clears timeout on unmount', () => {
    const { unmount } = render(<Tooltip {...defaultProps} delay={1000} />);
    
    const trigger = screen.getByText('Hover me');
    fireEvent.mouseEnter(trigger);
    
    // Should not throw any errors
    expect(() => unmount()).not.toThrow();
  });

  it('has proper accessibility attributes', async () => {
    render(<Tooltip {...defaultProps} delay={0} />);
    
    const trigger = screen.getByText('Hover me');
    fireEvent.mouseEnter(trigger);
    
    await waitFor(() => {
      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toBeInTheDocument();
    });
  });
}); 