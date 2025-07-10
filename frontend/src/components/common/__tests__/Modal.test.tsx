import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Modal from '../Modal';

// Mock createPortal
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node: React.ReactNode) => node,
}));

describe('Modal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    // Mock document.body
    Object.defineProperty(document.body, 'style', {
      value: {},
      writable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    document.body.style.overflow = '';
  });

  it('renders when isOpen is true', () => {
    render(
      <Modal {...defaultProps}>
        <div data-testid="modal-content">Modal content</div>
      </Modal>
    );
    
    expect(screen.getByTestId('modal-content')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(
      <Modal {...defaultProps} isOpen={false}>
        <div data-testid="modal-content">Modal content</div>
      </Modal>
    );
    
    expect(screen.queryByTestId('modal-content')).not.toBeInTheDocument();
  });

  it('renders with title', () => {
    render(
      <Modal {...defaultProps} title="Test Modal">
        <div>Content</div>
      </Modal>
    );
    
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(
      <Modal {...defaultProps} onClose={onClose}>
        <div>Content</div>
      </Modal>
    );
    
    const closeButton = screen.getByLabelText('Close modal');
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay is clicked', () => {
    const onClose = jest.fn();
    render(
      <Modal {...defaultProps} onClose={onClose}>
        <div>Content</div>
      </Modal>
    );
    
    const overlay = screen.getByRole('dialog').parentElement;
    fireEvent.click(overlay!);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when modal content is clicked', () => {
    const onClose = jest.fn();
    render(
      <Modal {...defaultProps} onClose={onClose}>
        <div data-testid="modal-content">Content</div>
      </Modal>
    );
    
    const content = screen.getByTestId('modal-content');
    fireEvent.click(content);
    
    expect(onClose).not.toHaveBeenCalled();
  });

  it('applies size classes correctly', () => {
    const { container } = render(
      <Modal {...defaultProps} size="large">
        <div>Content</div>
      </Modal>
    );
    
    const modal = container.querySelector('[role="dialog"]');
    expect(modal).toHaveClass('size-large');
  });

  it('applies custom className', () => {
    const { container } = render(
      <Modal {...defaultProps} className="custom-modal">
        <div>Content</div>
      </Modal>
    );
    
    const modal = container.querySelector('[role="dialog"]');
    expect(modal).toHaveClass('custom-modal');
  });

  it('renders without close button when showCloseButton is false', () => {
    render(
      <Modal {...defaultProps} showCloseButton={false}>
        <div>Content</div>
      </Modal>
    );
    
    expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument();
  });

  it('renders without header when no title and showCloseButton is false', () => {
    render(
      <Modal {...defaultProps} showCloseButton={false}>
        <div data-testid="content">Content</div>
      </Modal>
    );
    
    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(
      <Modal {...defaultProps} title="Test Modal">
        <div>Content</div>
      </Modal>
    );
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
  });
}); 