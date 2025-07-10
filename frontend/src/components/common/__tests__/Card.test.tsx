import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Card from '../Card';

describe('Card Component', () => {
  it('renders children correctly', () => {
    render(
      <Card>
        <div data-testid="card-content">Card content</div>
      </Card>
    );
    
    expect(screen.getByTestId('card-content')).toBeInTheDocument();
  });

  it('renders with title', () => {
    render(
      <Card title="Test Title">
        <div>Content</div>
      </Card>
    );
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renders with subtitle', () => {
    render(
      <Card title="Title" subtitle="Test Subtitle">
        <div>Content</div>
      </Card>
    );
    
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
  });

  it('renders header action', () => {
    render(
      <Card 
        title="Title" 
        headerAction={<button data-testid="header-action">Action</button>}
      >
        <div>Content</div>
      </Card>
    );
    
    expect(screen.getByTestId('header-action')).toBeInTheDocument();
  });

  it('renders footer', () => {
    render(
      <Card footer={<div data-testid="footer">Footer content</div>}>
        <div>Content</div>
      </Card>
    );
    
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <Card className="custom-class">
        <div>Content</div>
      </Card>
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('applies variant classes', () => {
    const { container } = render(
      <Card variant="elevated">
        <div>Content</div>
      </Card>
    );
    
    expect(container.firstChild).toHaveClass('variant-elevated');
  });

  it('applies padding classes', () => {
    const { container } = render(
      <Card padding="large">
        <div>Content</div>
      </Card>
    );
    
    expect(container.firstChild).toHaveClass('padding-large');
  });

  it('renders without header when no title, subtitle, or headerAction', () => {
    render(
      <Card>
        <div data-testid="content">Content</div>
      </Card>
    );
    
    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('renders without footer when no footer provided', () => {
    render(
      <Card>
        <div>Content</div>
      </Card>
    );
    
    expect(screen.queryByTestId('footer')).not.toBeInTheDocument();
  });
}); 