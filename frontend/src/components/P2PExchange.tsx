import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { t } from '../utils/i18n';
import api from '../services/api';
import { Alert } from './common/AlertContext';
import Button from './common/Button';
import FormInput from './common/FormInput';

interface Currency {
  code: string;
  name: string;
}

interface Country {
  code: string;
  name: string;
}

interface PaymentMethod {
  type: string;
  details: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  iban: string;
  swiftCode: string;
}

interface Location {
  country: string;
  city: string;
}

interface PrivacySettings {
  showName: boolean;
  showLocation: boolean;
  showContactInfo: boolean;
}

interface Limits {
  minAmount: string;
  maxAmount: string;
}

interface P2POrderForm {
  type: 'buy' | 'sell';
  currencyFrom: string;
  currencyTo: string;
  amountFrom: string;
  amountTo: string;
  exchangeRate: string;
  limits: Limits;
  paymentMethods: PaymentMethod[];
  terms: string;
  location: Location;
  privacy: PrivacySettings;
}

interface Filters {
  type: string;
  currencyFrom: string;
  currencyTo: string;
  country: string;
  minAmount: string;
  maxAmount: string;
}

interface P2POrder {
  id: string;
  type: 'buy' | 'sell';
  currencyFrom: string;
  currencyTo: string;
  amountFrom: number;
  amountTo: number;
  exchangeRate: number;
  status: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
}

interface MatchResult {
  type: 'matched' | 'pending';
  match?: P2POrder;
  order: P2POrder;
}

const P2PExchange: React.FC = () => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const [loading, setLoading] = useState<boolean>(false);
  const [orders, setOrders] = useState<P2POrder[]>([]);
  const [myOrders, setMyOrders] = useState<P2POrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<P2POrder | null>(null);
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [filters, setFilters] = useState<Filters>({
    type: '',
    currencyFrom: '',
    currencyTo: '',
    country: '',
    minAmount: '',
    maxAmount: ''
  });
  const [formData, setFormData] = useState<P2POrderForm>({
    type: 'buy',
    currencyFrom: 'IRR',
    currencyTo: 'USD',
    amountFrom: '',
    amountTo: '',
    exchangeRate: '',
    limits: {
      minAmount: '',
      maxAmount: ''
    },
    paymentMethods: [],
    terms: '',
    location: {
      country: '',
      city: ''
    },
    privacy: {
      showName: false,
      showLocation: true,
      showContactInfo: false
    }
  });
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

  const currencies: Currency[] = [
    { code: 'IRR', name: 'تومان ایران' },
    { code: 'USD', name: 'دلار آمریکا' },
    { code: 'EUR', name: 'یورو' },
    { code: 'GBP', name: 'پوند انگلیس' },
    { code: 'AED', name: 'درهم امارات' },
    { code: 'SAR', name: 'ریال عربستان' },
    { code: 'QAR', name: 'ریال قطر' },
    { code: 'KWD', name: 'دینار کویت' },
    { code: 'TRY', name: 'لیر ترکیه' },
    { code: 'CNY', name: 'یوان چین' },
    { code: 'JPY', name: 'ین ژاپن' },
    { code: 'CHF', name: 'فرانک سوئیس' }
  ];

  const countries: Country[] = [
    { code: 'IR', name: 'ایران' },
    { code: 'AE', name: 'امارات متحده عربی' },
    { code: 'SA', name: 'عربستان سعودی' },
    { code: 'QA', name: 'قطر' },
    { code: 'KW', name: 'کویت' },
    { code: 'TR', name: 'ترکیه' },
    { code: 'CN', name: 'چین' },
    { code: 'JP', name: 'ژاپن' },
    { code: 'CH', name: 'سوئیس' },
    { code: 'US', name: 'آمریکا' },
    { code: 'GB', name: 'انگلیس' },
    { code: 'DE', name: 'آلمان' }
  ];

  const paymentMethodTypes = [
    { value: 'bank_transfer', label: 'انتقال بانکی' },
    { value: 'cash', label: 'نقدی' },
    { value: 'crypto', label: 'ارز دیجیتال' },
    { value: 'other', label: 'سایر' }
  ];

  useEffect(() => {
    loadOrders();
    loadMyOrders();
  }, [filters]);

  const loadOrders = async (): Promise<void> => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof Filters]) {
          params.append(key, filters[key as keyof Filters]);
        }
      });

      const response = await api.get(`/p2p/orders?${params}`);
      setOrders(response.data.data);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyOrders = async (): Promise<void> => {
    try {
      const response = await api.get('/p2p/orders/my');
      setMyOrders(response.data.data);
    } catch (error) {
      console.error('Error loading my orders:', error);
    }
  };

  const handleInputChange = (field: keyof P2POrderForm, value: string): void => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedInputChange = (
    parent: keyof P2POrderForm, 
    field: string, 
    value: string
  ): void => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }));
  };

  const addPaymentMethod = (): void => {
    setFormData(prev => ({
      ...prev,
      paymentMethods: [
        ...prev.paymentMethods,
        {
          type: 'bank_transfer',
          details: '',
          bankName: '',
          accountNumber: '',
          accountHolder: '',
          iban: '',
          swiftCode: ''
        }
      ]
    }));
  };

  const updatePaymentMethod = (index: number, field: string, value: string): void => {
    setFormData(prev => ({
      ...prev,
      paymentMethods: prev.paymentMethods.map((method, i) => 
        i === index ? { ...method, [field]: value } : method
      )
    }));
  };

  const removePaymentMethod = (index: number): void => {
    setFormData(prev => ({
      ...prev,
      paymentMethods: prev.paymentMethods.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setMatchResult(null);
    try {
      const response = await api.post('/p2p/orders', formData);
      if (response.data.match) {
        setMatchResult({
          type: 'matched',
          match: response.data.match,
          order: response.data.order
        });
      } else {
        setMatchResult({
          type: 'pending',
          order: response.data.order
        });
      }
      setShowCreateForm(false);
      setFormData({
        type: 'buy',
        currencyFrom: 'IRR',
        currencyTo: 'USD',
        amountFrom: '',
        amountTo: '',
        exchangeRate: '',
        limits: { minAmount: '', maxAmount: '' },
        paymentMethods: [],
        terms: '',
        location: { country: '', city: '' },
        privacy: { showName: false, showLocation: true, showContactInfo: false }
      });
      loadMyOrders();
    } catch (error) {
      console.error('Error creating order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContact = async (orderId: string): Promise<void> => {
    try {
      await api.post(`/p2p/orders/${orderId}/contact`);
      Alert.success('پیام شما ارسال شد');
    } catch (error) {
      console.error('Error contacting order:', error);
      Alert.error('خطا در ارسال پیام');
    }
  };

  const getStatusColor = (status: string): string => {
    const statusColors: Record<string, string> = {
      active: 'text-green-600',
      pending: 'text-yellow-600',
      completed: 'text-blue-600',
      cancelled: 'text-red-600'
    };
    return statusColors[status] || 'text-gray-600';
  };

  const getTypeColor = (type: string): string => {
    return type === 'buy' ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t('p2p.exchange')}
        </h1>
        <p className="text-gray-600">
          {t('p2p.exchangeDescription')}
        </p>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="card-header">
          <h2 className="text-lg font-semibold">{t('common.filters')}</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormInput
              label={t('p2p.type')}
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            />
            <FormInput
              label={t('p2p.currencyFrom')}
              value={filters.currencyFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, currencyFrom: e.target.value }))}
            />
            <FormInput
              label={t('p2p.currencyTo')}
              value={filters.currencyTo}
              onChange={(e) => setFilters(prev => ({ ...prev, currencyTo: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* Create Order Button */}
      <div className="mb-6">
        <Button
          onClick={() => setShowCreateForm(true)}
          variant="primary"
          size="lg"
        >
          {t('p2p.createOrder')}
        </Button>
      </div>

      {/* Orders List */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">{t('p2p.availableOrders')}</h2>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="loading-spinner" />
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`font-medium ${getTypeColor(order.type)}`}>
                          {order.type === 'buy' ? t('p2p.buy') : t('p2p.sell')}
                        </span>
                        <span className="text-sm text-gray-500">
                          {order.currencyFrom} → {order.currencyTo}
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className="text-lg font-bold">
                          {order.amountFrom.toLocaleString()} {order.currencyFrom}
                        </span>
                        <span className="text-gray-500 mx-2">→</span>
                        <span className="text-lg font-bold">
                          {order.amountTo.toLocaleString()} {order.currencyTo}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {t('p2p.rate')}: {order.exchangeRate}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm ${getStatusColor(order.status)}`}>
                        {t(`p2p.status.${order.status}`)}
                      </span>
                      <div className="mt-2">
                        <Button
                          onClick={() => handleContact(order.id)}
                          variant="outline"
                          size="sm"
                        >
                          {t('p2p.contact')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default P2PExchange; 