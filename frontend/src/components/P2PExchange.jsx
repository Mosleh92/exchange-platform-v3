import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { t } from '../utils/i18n';
import api from '../services/api';
import { Alert } from './common/AlertContext';

const P2PExchange = () => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    currencyFrom: '',
    currencyTo: '',
    country: '',
    minAmount: '',
    maxAmount: ''
  });
  const [formData, setFormData] = useState({
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
  const [matchResult, setMatchResult] = useState(null);

  const currencies = [
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

  const countries = [
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

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });

      const response = await api.get(`/p2p/orders?${params}`);
      setOrders(response.data.data);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyOrders = async () => {
    try {
      const response = await api.get('/p2p/orders/my');
      setMyOrders(response.data.data);
    } catch (error) {
      console.error('Error loading my orders:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedInputChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }));
  };

  const addPaymentMethod = () => {
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

  const updatePaymentMethod = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      paymentMethods: prev.paymentMethods.map((method, i) => 
        i === index ? { ...method, [field]: value } : method
      )
    }));
  };

  const removePaymentMethod = (index) => {
    setFormData(prev => ({
      ...prev,
      paymentMethods: prev.paymentMethods.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
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
      alert(t('error.orderCreationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleContact = async (orderId) => {
    try {
      const response = await api.post(`/p2p/orders/${orderId}/chat`);
      alert(t('p2p.chatCreated'));
      // Redirect to chat or open chat modal
    } catch (error) {
      console.error('Error creating chat:', error);
      alert(t('error.chatCreationFailed'));
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getTypeColor = (type) => {
    return type === 'buy' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };

  return (
    <>
      {/* پیام هشدار امنیتی */}
      <Alert type="warning">
        ⚠️ لطفاً قبل از انجام هرگونه تراکنش P2P، از صحت اطلاعات طرف مقابل اطمینان حاصل کنید. هرگز اطلاعات کارت یا حساب خود را به افراد ناشناس ارسال نکنید. در صورت مشاهده تخلف، از گزینه گزارش تخلف استفاده کنید.
      </Alert>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {t('p2p.title')}
              </h2>
              <p className="text-gray-600 mt-2">
                {t('p2p.description')}
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t('p2p.createOrder')}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">{t('p2p.filters')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('p2p.allTypes')}</option>
              <option value="buy">{t('p2p.buy')}</option>
              <option value="sell">{t('p2p.sell')}</option>
            </select>

            <select
              value={filters.currencyFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, currencyFrom: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('p2p.allCurrencies')}</option>
              {currencies.map(currency => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} - {currency.name}
                </option>
              ))}
            </select>

            <select
              value={filters.currencyTo}
              onChange={(e) => setFilters(prev => ({ ...prev, currencyTo: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('p2p.allCurrencies')}</option>
              {currencies.map(currency => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} - {currency.name}
                </option>
              ))}
            </select>

            <select
              value={filters.country}
              onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('p2p.allCountries')}</option>
              {countries.map(country => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>

            <input
              type="number"
              placeholder={t('p2p.minAmount')}
              value={filters.minAmount}
              onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button
              onClick={loadOrders}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {t('p2p.filter')}
            </button>
          </div>
        </div>

        {/* Orders List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Available Orders */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">{t('p2p.availableOrders')}</h3>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">{t('p2p.loading')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map(order => (
                    <div
                      key={order._id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(order.type)}`}>
                            {t(`p2p.${order.type}`)}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                            {t(`p2p.${order.status}`)}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-800">
                            {order.amountFrom?.toLocaleString()} {order.currencyFrom}
                          </div>
                          <div className="text-sm text-gray-600">
                            → {order.amountTo?.toLocaleString()} {order.currencyTo}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                        <div>
                          <span className="font-medium">{t('p2p.rate')}:</span> {order.exchangeRate}
                        </div>
                        <div>
                          <span className="font-medium">{t('p2p.limits')}:</span> {order.limits.minAmount} - {order.limits.maxAmount}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          {order.location?.country && countries.find(c => c.code === order.location.country)?.name}
                        </div>
                        <button
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {t('p2p.title')}
            </h2>
            <p className="text-gray-600 mt-2">
              {t('p2p.description')}
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t('p2p.createOrder')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">{t('p2p.filters')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <select
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('p2p.allTypes')}</option>
            <option value="buy">{t('p2p.buy')}</option>
            <option value="sell">{t('p2p.sell')}</option>
          </select>

          <select
            value={filters.currencyFrom}
            onChange={(e) => setFilters(prev => ({ ...prev, currencyFrom: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('p2p.allCurrencies')}</option>
            {currencies.map(currency => (
              <option key={currency.code} value={currency.code}>
                {currency.code} - {currency.name}
              </option>
            ))}
          </select>

          <select
            value={filters.currencyTo}
            onChange={(e) => setFilters(prev => ({ ...prev, currencyTo: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('p2p.allCurrencies')}</option>
            {currencies.map(currency => (
              <option key={currency.code} value={currency.code}>
                {currency.code} - {currency.name}
              </option>
            ))}
          </select>

          <select
            value={filters.country}
            onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('p2p.allCountries')}</option>
            {countries.map(country => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>

          <input
            type="number"
            placeholder={t('p2p.minAmount')}
            value={filters.minAmount}
            onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            onClick={loadOrders}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {t('p2p.filter')}
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Available Orders */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">{t('p2p.availableOrders')}</h3>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">{t('p2p.loading')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <div
                    key={order._id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(order.type)}`}>
                          {t(`p2p.${order.type}`)}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                          {t(`p2p.${order.status}`)}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-800">
                          {order.amountFrom?.toLocaleString()} {order.currencyFrom}
                        </div>
                        <div className="text-sm text-gray-600">
                          → {order.amountTo?.toLocaleString()} {order.currencyTo}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                      <div>
                        <span className="font-medium">{t('p2p.rate')}:</span> {order.exchangeRate}
                      </div>
                      <div>
                        <span className="font-medium">{t('p2p.limits')}:</span> {order.limits.minAmount} - {order.limits.maxAmount}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        {order.location?.country && countries.find(c => c.code === order.location.country)?.name}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContact(order._id);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        {t('p2p.contact')}
                      </button>
                    </div>
                  </div>
                ))}

                {orders.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-600">{t('p2p.noOrders')}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* My Orders */}
        <div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">{t('p2p.myOrders')}</h3>
            
            <div className="space-y-4">
              {myOrders.map(order => (
                <div
                  key={order._id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(order.type)}`}>
                      {t(`p2p.${order.type}`)}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {t(`p2p.${order.status}`)}
                    </span>
                  </div>
                  
                  <div className="text-sm">
                    <div className="font-medium">
                      {order.amountFrom?.toLocaleString()} {order.currencyFrom}
                    </div>
                    <div className="text-gray-600">
                      → {order.amountTo?.toLocaleString()} {order.currencyTo}
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 mt-2">
                    {new Date(order.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}

              {myOrders.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-gray-600 text-sm">{t('p2p.noMyOrders')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Order Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">
                  {t('p2p.createOrder')}
                </h3>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div>
                  <h4 className="font-semibold mb-4">{t('p2p.basicInfo')}</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('p2p.type')}
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) => handleInputChange('type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="buy">{t('p2p.buy')}</option>
                        <option value="sell">{t('p2p.sell')}</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('p2p.currencyFrom')}
                        </label>
                        <select
                          value={formData.currencyFrom}
                          onChange={(e) => handleInputChange('currencyFrom', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          {currencies.map(currency => (
                            <option key={currency.code} value={currency.code}>
                              {currency.code} - {currency.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('p2p.currencyTo')}
                        </label>
                        <select
                          value={formData.currencyTo}
                          onChange={(e) => handleInputChange('currencyTo', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          {currencies.map(currency => (
                            <option key={currency.code} value={currency.code}>
                              {currency.code} - {currency.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('p2p.amountFrom')}
                        </label>
                        <input
                          type="number"
                          value={formData.amountFrom}
                          onChange={(e) => handleInputChange('amountFrom', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                          step="0.01"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('p2p.amountTo')}
                        </label>
                        <input
                          type="number"
                          value={formData.amountTo}
                          onChange={(e) => handleInputChange('amountTo', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                          step="0.01"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('p2p.exchangeRate')}
                      </label>
                      <input
                        type="number"
                        value={formData.exchangeRate}
                        onChange={(e) => handleInputChange('exchangeRate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.000000"
                        step="0.000001"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Limits and Location */}
                <div>
                  <h4 className="font-semibold mb-4">{t('p2p.limitsAndLocation')}</h4>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('p2p.minAmount')}
                        </label>
                        <input
                          type="number"
                          value={formData.limits.minAmount}
                          onChange={(e) => handleNestedInputChange('limits', 'minAmount', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('p2p.maxAmount')}
                        </label>
                        <input
                          type="number"
                          value={formData.limits.maxAmount}
                          onChange={(e) => handleNestedInputChange('limits', 'maxAmount', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                          step="0.01"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('p2p.country')}
                        </label>
                        <select
                          value={formData.location.country}
                          onChange={(e) => handleNestedInputChange('location', 'country', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">{t('p2p.selectCountry')}</option>
                          {countries.map(country => (
                            <option key={country.code} value={country.code}>
                              {country.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('p2p.city')}
                        </label>
                        <input
                          type="text"
                          value={formData.location.city}
                          onChange={(e) => handleNestedInputChange('location', 'city', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={t('p2p.cityPlaceholder')}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-semibold">{t('p2p.paymentMethods')}</h4>
                  <button
                    type="button"
                    onClick={addPaymentMethod}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {t('p2p.addPaymentMethod')}
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.paymentMethods.map((method, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select
                          value={method.type}
                          onChange={(e) => updatePaymentMethod(index, 'type', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {paymentMethodTypes.map(type => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => removePaymentMethod(index)}
                          className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                        >
                          {t('p2p.remove')}
                        </button>
                      </div>

                      {method.type === 'bank_transfer' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <input
                            type="text"
                            placeholder={t('p2p.bankName')}
                            value={method.bankName}
                            onChange={(e) => updatePaymentMethod(index, 'bankName', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            placeholder={t('p2p.accountNumber')}
                            value={method.accountNumber}
                            onChange={(e) => updatePaymentMethod(index, 'accountNumber', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            placeholder={t('p2p.accountHolder')}
                            value={method.accountHolder}
                            onChange={(e) => updatePaymentMethod(index, 'accountHolder', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            placeholder={t('p2p.iban')}
                            value={method.iban}
                            onChange={(e) => updatePaymentMethod(index, 'iban', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      )}

                      <textarea
                        placeholder={t('p2p.details')}
                        value={method.details}
                        onChange={(e) => updatePaymentMethod(index, 'details', e.target.value)}
                        className="w-full mt-4 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows="2"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Terms */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('p2p.terms')}
                </label>
                <textarea
                  value={formData.terms}
                  onChange={(e) => handleInputChange('terms', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="4"
                  placeholder={t('p2p.termsPlaceholder')}
                  required
                />
              </div>

              {/* Privacy Settings */}
              <div className="mt-6">
                <h4 className="font-semibold mb-4">{t('p2p.privacySettings')}</h4>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.privacy.showName}
                      onChange={(e) => handleNestedInputChange('privacy', 'showName', e.target.checked)}
                      className="mr-2"
                    />
                    {t('p2p.showName')}
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.privacy.showLocation}
                      onChange={(e) => handleNestedInputChange('privacy', 'showLocation', e.target.checked)}
                      className="mr-2"
                    />
                    {t('p2p.showLocation')}
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.privacy.showContactInfo}
                      onChange={(e) => handleNestedInputChange('privacy', 'showContactInfo', e.target.checked)}
                      className="mr-2"
                    />
                    {t('p2p.showContactInfo')}
                  </label>
                </div>
              </div>

              {/* Submit */}
              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t('p2p.creating') : t('p2p.createOrder')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">
                  {t('p2p.orderDetails')}
                </h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-4">{t('p2p.basicInfo')}</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">{t('p2p.orderId')}:</span> {selectedOrder.orderId}</div>
                    <div><span className="font-medium">{t('p2p.type')}:</span> {t(`p2p.${selectedOrder.type}`)}</div>
                    <div><span className="font-medium">{t('p2p.status')}:</span> {t(`p2p.${selectedOrder.status}`)}</div>
                    <div><span className="font-medium">{t('p2p.created')}:</span> {new Date(selectedOrder.created_at).toLocaleString()}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-4">{t('p2p.amounts')}</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">{t('p2p.from')}:</span> {selectedOrder.amountFrom?.toLocaleString()} {selectedOrder.currencyFrom}</div>
                    <div><span className="font-medium">{t('p2p.to')}:</span> {selectedOrder.amountTo?.toLocaleString()} {selectedOrder.currencyTo}</div>
                    <div><span className="font-medium">{t('p2p.rate')}:</span> {selectedOrder.exchangeRate}</div>
                    <div><span className="font-medium">{t('p2p.limits')}:</span> {selectedOrder.limits.minAmount} - {selectedOrder.limits.maxAmount}</div>
                  </div>
                </div>
              </div>

              {selectedOrder.paymentMethods && selectedOrder.paymentMethods.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold mb-4">{t('p2p.paymentMethods')}</h4>
                  <div className="space-y-3">
                    {selectedOrder.paymentMethods.map((method, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3">
                        <div className="font-medium">{t(`p2p.${method.type}`)}</div>
                        {method.bankName && <div className="text-sm text-gray-600">{method.bankName}</div>}
                        {method.accountNumber && <div className="text-sm text-gray-600">{method.accountNumber}</div>}
                        {method.details && <div className="text-sm text-gray-600">{method.details}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedOrder.terms && (
                <div className="mt-6">
                  <h4 className="font-semibold mb-2">{t('p2p.terms')}</h4>
                  <p className="text-sm text-gray-600">{selectedOrder.terms}</p>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    handleContact(selectedOrder._id);
                    setSelectedOrder(null);
                  }}
                  className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  {t('p2p.contact')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Match Result Modal */}
      {matchResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">
                {matchResult.type === 'matched' ? t('p2p.matchFound') : t('p2p.orderPending')}
              </h3>
              <button onClick={() => setMatchResult(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            {matchResult.type === 'matched' ? (
              <div>
                <p className="mb-2 text-green-700 font-semibold">{t('p2p.matchSuccess')}</p>
                <div className="mb-2">
                  <span className="font-medium">{t('p2p.amount')}:</span> {matchResult.match.amount}
                </div>
                <div className="mb-2">
                  <span className="font-medium">{t('p2p.price')}:</span> {matchResult.match.price}
                </div>
                <div className="mb-2">
                  <span className="font-medium">{t('p2p.status')}:</span> {t('p2p.pendingConfirmation')}
                </div>
                <div className="mb-2">
                  <span className="font-medium">{t('p2p.matchId')}:</span> {matchResult.match._id}
                </div>
              </div>
            ) : (
              <div>
                <p className="mb-2 text-blue-700 font-semibold">{t('p2p.noMatchYet')}</p>
                <div className="mb-2">
                  <span className="font-medium">{t('p2p.orderId')}:</span> {matchResult.order._id}
                </div>
                <div className="mb-2">
                  <span className="font-medium">{t('p2p.status')}:</span> {t('p2p.waitingForMatch')}
                </div>
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button onClick={() => setMatchResult(null)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">{t('p2p.close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default P2PExchange; 