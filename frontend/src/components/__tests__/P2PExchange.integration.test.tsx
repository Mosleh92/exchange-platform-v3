import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import P2PExchange from '../P2PExchange';

// Mock API
const mockApi = {
  get: vi.fn(),
  post: vi.fn(),
};

vi.mock('../services/api', () => ({
  default: mockApi,
}));

// Mock contexts
const mockAuthContext = {
  user: {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
  },
  login: vi.fn(),
  logout: vi.fn(),
};

const mockTenantContext = {
  currentTenant: {
    id: 'tenant-1',
    name: 'Test Tenant',
    domain: 'test.example.com',
  },
  setCurrentTenant: vi.fn(),
};

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

vi.mock('../contexts/TenantContext', () => ({
  useTenant: () => mockTenantContext,
}));

// Mock i18n
vi.mock('../utils/i18n', () => ({
  t: (key: string) => key,
}));

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('P2PExchange Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders P2P exchange page with filters', async () => {
    mockApi.get.mockResolvedValue({
      data: { data: [] },
    });

    renderWithProviders(<P2PExchange />);

    expect(screen.getByText('p2p.exchange')).toBeInTheDocument();
    expect(screen.getByText('p2p.exchangeDescription')).toBeInTheDocument();
    expect(screen.getByText('common.filters')).toBeInTheDocument();
    expect(screen.getByText('p2p.createOrder')).toBeInTheDocument();
  });

  it('loads and displays orders', async () => {
    const mockOrders = [
      {
        id: 'order-1',
        type: 'buy',
        currencyFrom: 'IRR',
        currencyTo: 'USD',
        amountFrom: 1000000,
        amountTo: 25,
        exchangeRate: 40000,
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z',
        user: {
          id: 'user-2',
          name: 'Seller User',
        },
      },
    ];

    mockApi.get.mockResolvedValue({
      data: { data: mockOrders },
    });

    renderWithProviders(<P2PExchange />);

    await waitFor(() => {
      expect(screen.getByText('خرید')).toBeInTheDocument();
      expect(screen.getByText('1,000,000 تومان ایران')).toBeInTheDocument();
      expect(screen.getByText('25 دلار آمریکا')).toBeInTheDocument();
    });
  });

  it('handles order creation form', async () => {
    mockApi.get.mockResolvedValue({
      data: { data: [] },
    });

    mockApi.post.mockResolvedValue({
      data: {
        order: {
          id: 'new-order',
          type: 'buy',
          status: 'pending',
        },
      },
    });

    renderWithProviders(<P2PExchange />);

    // Click create order button
    fireEvent.click(screen.getByText('p2p.createOrder'));

    // Fill form
    const amountInput = screen.getByLabelText(/amount/i);
    fireEvent.change(amountInput, { target: { value: '1000000' } });

    // Submit form
    const submitButton = screen.getByText(/submit/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/p2p/orders', expect.any(Object));
    });
  });

  it('handles order contact', async () => {
    const mockOrders = [
      {
        id: 'order-1',
        type: 'buy',
        currencyFrom: 'IRR',
        currencyTo: 'USD',
        amountFrom: 1000000,
        amountTo: 25,
        exchangeRate: 40000,
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z',
        user: {
          id: 'user-2',
          name: 'Seller User',
        },
      },
    ];

    mockApi.get.mockResolvedValue({
      data: { data: mockOrders },
    });

    mockApi.post.mockResolvedValue({
      data: { success: true },
    });

    renderWithProviders(<P2PExchange />);

    await waitFor(() => {
      expect(screen.getByText('p2p.contact')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('p2p.contact'));

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/p2p/orders/order-1/contact');
    });
  });

  it('filters orders correctly', async () => {
    mockApi.get.mockResolvedValue({
      data: { data: [] },
    });

    renderWithProviders(<P2PExchange />);

    const typeFilter = screen.getByLabelText(/p2p.type/i);
    fireEvent.change(typeFilter, { target: { value: 'buy' } });

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('type=buy')
      );
    });
  });

  it('handles loading state', async () => {
    mockApi.get.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders(<P2PExchange />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('handles error state', async () => {
    mockApi.get.mockRejectedValue(new Error('API Error'));

    renderWithProviders(<P2PExchange />);

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        'Error loading orders:',
        expect.any(Error)
      );
    });
  });

  it('displays order status correctly', async () => {
    const mockOrders = [
      {
        id: 'order-1',
        type: 'buy',
        currencyFrom: 'IRR',
        currencyTo: 'USD',
        amountFrom: 1000000,
        amountTo: 25,
        exchangeRate: 40000,
        status: 'completed',
        createdAt: '2024-01-01T00:00:00Z',
        user: {
          id: 'user-2',
          name: 'Seller User',
        },
      },
    ];

    mockApi.get.mockResolvedValue({
      data: { data: mockOrders },
    });

    renderWithProviders(<P2PExchange />);

    await waitFor(() => {
      expect(screen.getByText('p2p.status.completed')).toBeInTheDocument();
    });
  });

  it('handles currency selection', async () => {
    mockApi.get.mockResolvedValue({
      data: { data: [] },
    });

    renderWithProviders(<P2PExchange />);

    const currencyFromSelect = screen.getByLabelText(/currencyFrom/i);
    fireEvent.change(currencyFromSelect, { target: { value: 'EUR' } });

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('currencyFrom=EUR')
      );
    });
  });

  it('validates form inputs', async () => {
    mockApi.get.mockResolvedValue({
      data: { data: [] },
    });

    renderWithProviders(<P2PExchange />);

    fireEvent.click(screen.getByText('p2p.createOrder'));

    // Try to submit without required fields
    const submitButton = screen.getByText(/submit/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockApi.post).not.toHaveBeenCalled();
    });
  });

  it('handles payment method addition', async () => {
    mockApi.get.mockResolvedValue({
      data: { data: [] },
    });

    renderWithProviders(<P2PExchange />);

    fireEvent.click(screen.getByText('p2p.createOrder'));

    const addPaymentButton = screen.getByText(/add payment method/i);
    fireEvent.click(addPaymentButton);

    expect(screen.getByText(/payment method/i)).toBeInTheDocument();
  });

  it('handles order matching', async () => {
    mockApi.get.mockResolvedValue({
      data: { data: [] },
    });

    mockApi.post.mockResolvedValue({
      data: {
        match: {
          id: 'match-1',
          type: 'sell',
          amountFrom: 1000000,
          amountTo: 25,
        },
        order: {
          id: 'order-1',
          type: 'buy',
          status: 'matched',
        },
      },
    });

    renderWithProviders(<P2PExchange />);

    fireEvent.click(screen.getByText('p2p.createOrder'));

    const amountInput = screen.getByLabelText(/amount/i);
    fireEvent.change(amountInput, { target: { value: '1000000' } });

    const submitButton = screen.getByText(/submit/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/matched/i)).toBeInTheDocument();
    });
  });
}); 