import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { t } from '../utils/i18n';
import api from '../services/api';

const CustomerBanking = () => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [transferRequests, setTransferRequests] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    currency: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  });
  const [formData, setFormData] = useState({
    transferType: 'internal',
    fromAccount: '',
    destination: {
      toAccount: '',
      toCustomerId: '',
      recipientName: '',
      recipientPhone: '',
      bankName: '',
      bankAccountNumber: '',
      bankAccountHolder: '',
      bankIban: '',
      cryptoAddress: '',
      cryptoNetwork: ''
    },
    currency: 'IRR',
    amount: '',
    fees: {
      amount: 0,
      currency: 'IRR',
      description: ''
    },
    description: '',
    priority: 'normal'
  });

  const currencies = [
    { code: 'IRR', name: 'تومان ایران' },
    { code: 'USD', name: 'دلار آمریکا' },
    { code: 'EUR', name: 'یورو' },
    { code: 'AED', name: 'درهم امارات' },
    { code: 'SAR', name: 'ریال عربستان' },
    { code: 'TRY', name: 'لیر ترکیه' }
  ];

  const transferTypes = [
    { value: 'internal', label: 'انتقال داخلی' },
    { value: 'external', label: 'انتقال خارجی' },
    { value: 'bank', label: 'انتقال بانکی' },
    { value: 'cash', label: 'نقدی' },
    { value: 'crypto', label: 'ارز دیجیتال' }
  ];

  useEffect(() => {
    loadAccount();
    loadStatistics();
  }, []);

  useEffect(() => {
    if (activeTab === 'transactions') {
      loadTransactions();
    } else if (activeTab === 'transfers') {
      loadTransferRequests();
    }
  }, [activeTab, filters]);

  const loadAccount = async () => {
    try {
      const response = await api.get('/customer-banking/account');
      setAccount(response.data.data);
      setFormData(prev => ({
        ...prev,
        fromAccount: response.data.data.accountNumber
      }));
    } catch (error) {
      console.error('Error loading account:', error);
    }
  };

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });

      const response = await api.get(`/customer-banking/transactions?${params}`);
      setTransactions(response.data.data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTransferRequests = async () => {
    try {
      const response = await api.get('/customer-banking/transfer-requests');
      setTransferRequests(response.data.data);
    } catch (error) {
      console.error('Error loading transfer requests:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await api.get('/customer-banking/statistics');
      setStatistics(response.data.data);
    } catch (error) {
      console.error('Error loading statistics:', error);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/customer-banking/transfer-requests', formData);
      
      alert(t('customerBanking.transferRequestCreated'));
      setShowTransferForm(false);
      setFormData({
        transferType: 'internal',
        fromAccount: account?.accountNumber || '',
        destination: {
          toAccount: '',
          toCustomerId: '',
          recipientName: '',
          recipientPhone: '',
          bankName: '',
          bankAccountNumber: '',
          bankAccountHolder: '',
          bankIban: '',
          cryptoAddress: '',
          cryptoNetwork: ''
        },
        currency: 'IRR',
        amount: '',
        fees: {
          amount: 0,
          currency: 'IRR',
          description: ''
        },
        description: '',
        priority: 'normal'
      });
      
      loadTransferRequests();
    } catch (error) {
      console.error('Error creating transfer request:', error);
      alert(t('error.transferRequestCreationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      processing: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
      failed: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getTypeColor = (type) => {
    const colors = {
      deposit: 'bg-green-100 text-green-800',
      withdrawal: 'bg-red-100 text-red-800',
      transfer_in: 'bg-blue-100 text-blue-800',
      transfer_out: 'bg-orange-100 text-orange-800',
      exchange_buy: 'bg-purple-100 text-purple-800',
      exchange_sell: 'bg-indigo-100 text-indigo-800',
      fee: 'bg-gray-100 text-gray-800',
      interest: 'bg-green-100 text-green-800',
      adjustment: 'bg-yellow-100 text-yellow-800',
      refund: 'bg-blue-100 text-blue-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const formatAmount = (amount, currency) => {
    return `${amount?.toLocaleString()} ${currency}`;
  };

  if (!account) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('customerBanking.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {t('customerBanking.title')}
            </h2>
            <p className="text-gray-600 mt-2">
              {t('customerBanking.description')}
            </p>
          </div>
          <button
            onClick={() => setShowTransferForm(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t('customerBanking.newTransfer')}
          </button>
        </div>
      </div>

      {/* Account Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">{t('customerBanking.accountInfo')}</h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-600">{t('customerBanking.accountNumber')}:</span>
              <div className="font-medium">{account.accountNumber}</div>
            </div>
            <div>
              <span className="text-sm text-gray-600">{t('customerBanking.accountType')}:</span>
              <div className="font-medium">{t(`customerBanking.${account.accountType}`)}</div>
            </div>
            <div>
              <span className="text-sm text-gray-600">{t('customerBanking.status')}:</span>
              <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                account.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {t(`customerBanking.${account.status}`)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">{t('customerBanking.balances')}</h3>
          <div className="space-y-3">
            {account.balances.map((balance, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{balance.currency}</span>
                <span className="font-medium">{formatAmount(balance.amount, balance.currency)}</span>
              </div>
            ))}
            {account.balances.length === 0 && (
              <p className="text-gray-500 text-sm">{t('customerBanking.noBalances')}</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">{t('customerBanking.statistics')}</h3>
          {statistics && (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{t('customerBanking.totalTransactions')}</span>
                <span className="font-medium">{statistics.summary.totalTransactions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{t('customerBanking.totalVolume')}</span>
                <span className="font-medium">{formatAmount(statistics.summary.totalVolume, 'IRR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{t('customerBanking.averageTransaction')}</span>
                <span className="font-medium">{formatAmount(statistics.summary.averageTransactionSize, 'IRR')}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('customerBanking.overview')}
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'transactions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('customerBanking.transactions')}
            </button>
            <button
              onClick={() => setActiveTab('transfers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'transfers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('customerBanking.transfers')}
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">{t('customerBanking.recentActivity')}</h3>
              <div className="space-y-4">
                {transactions.slice(0, 5).map(transaction => (
                  <div key={transaction._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(transaction.type)}`}>
                        {t(`customerBanking.${transaction.type}`)}
                      </span>
                      <div>
                        <div className="font-medium">{transaction.description}</div>
                        <div className="text-sm text-gray-600">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatAmount(transaction.amount, transaction.currency)}</div>
                      <div className="text-sm text-gray-600">{transaction.currency}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div>
              {/* Filters */}
              <div className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('customerBanking.allTypes')}</option>
                    <option value="deposit">{t('customerBanking.deposit')}</option>
                    <option value="withdrawal">{t('customerBanking.withdrawal')}</option>
                    <option value="transfer_in">{t('customerBanking.transfer_in')}</option>
                    <option value="transfer_out">{t('customerBanking.transfer_out')}</option>
                    <option value="exchange_buy">{t('customerBanking.exchange_buy')}</option>
                    <option value="exchange_sell">{t('customerBanking.exchange_sell')}</option>
                  </select>

                  <select
                    value={filters.currency}
                    onChange={(e) => setFilters(prev => ({ ...prev, currency: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('customerBanking.allCurrencies')}</option>
                    {currencies.map(currency => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('customerBanking.allStatuses')}</option>
                    <option value="pending">{t('customerBanking.pending')}</option>
                    <option value="completed">{t('customerBanking.completed')}</option>
                    <option value="failed">{t('customerBanking.failed')}</option>
                  </select>

                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('customerBanking.dateFrom')}
                  />

                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('customerBanking.dateTo')}
                  />
                </div>
              </div>

              {/* Transactions List */}
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">{t('customerBanking.loading')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.map(transaction => (
                    <div key={transaction._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(transaction.type)}`}>
                          {t(`customerBanking.${transaction.type}`)}
                        </span>
                        <div>
                          <div className="font-medium">{transaction.description}</div>
                          <div className="text-sm text-gray-600">
                            {new Date(transaction.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatAmount(transaction.amount, transaction.currency)}</div>
                        <div className="text-sm text-gray-600">
                          {formatAmount(transaction.balanceAfter, transaction.currency)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {transactions.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-600">{t('customerBanking.noTransactions')}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Transfers Tab */}
          {activeTab === 'transfers' && (
            <div>
              <div className="space-y-4">
                {transferRequests.map(request => (
                  <div key={request._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
                          {t(`customerBanking.${request.status}`)}
                        </span>
                        <span className="text-sm text-gray-600">
                          {t(`customerBanking.${request.transferType}`)}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatAmount(request.amount, request.currency)}</div>
                        <div className="text-sm text-gray-600">{request.requestId}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">{t('customerBanking.from')}:</span> {request.fromAccount}
                      </div>
                      <div>
                        <span className="font-medium">{t('customerBanking.to')}:</span> {
                          request.destination.recipientName || 
                          request.destination.toAccount || 
                          request.destination.bankAccountNumber ||
                          request.destination.cryptoAddress
                        }
                      </div>
                      <div>
                        <span className="font-medium">{t('customerBanking.description')}:</span> {request.description}
                      </div>
                      <div>
                        <span className="font-medium">{t('customerBanking.created')}:</span> {new Date(request.created_at).toLocaleString()}
                      </div>
                    </div>

                    {request.status === 'pending' && (
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={async () => {
                            try {
                              await api.put(`/customer-banking/transfer-requests/${request._id}/cancel`);
                              alert(t('customerBanking.transferRequestCancelled'));
                              loadTransferRequests();
                            } catch (error) {
                              console.error('Error cancelling request:', error);
                              alert(t('error.cancellationFailed'));
                            }
                          }}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                        >
                          {t('customerBanking.cancel')}
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {transferRequests.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-600">{t('customerBanking.noTransferRequests')}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transfer Form Modal */}
      {showTransferForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">
                  {t('customerBanking.newTransfer')}
                </h3>
                <button
                  onClick={() => setShowTransferForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-6">
                {/* Transfer Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('customerBanking.transferType')}
                  </label>
                  <select
                    value={formData.transferType}
                    onChange={(e) => handleInputChange('transferType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {transferTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount and Currency */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('customerBanking.amount')}
                    </label>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => handleInputChange('amount', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                      step="0.01"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('customerBanking.currency')}
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => handleInputChange('currency', e.target.value)}
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

                {/* Destination based on transfer type */}
                {formData.transferType === 'internal' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('customerBanking.toAccount')}
                    </label>
                    <input
                      type="text"
                      value={formData.destination.toAccount}
                      onChange={(e) => handleNestedInputChange('destination', 'toAccount', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={t('customerBanking.toAccountPlaceholder')}
                      required
                    />
                  </div>
                )}

                {formData.transferType === 'bank' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('customerBanking.bankName')}
                      </label>
                      <input
                        type="text"
                        value={formData.destination.bankName}
                        onChange={(e) => handleNestedInputChange('destination', 'bankName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={t('customerBanking.bankNamePlaceholder')}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('customerBanking.accountNumber')}
                      </label>
                      <input
                        type="text"
                        value={formData.destination.bankAccountNumber}
                        onChange={(e) => handleNestedInputChange('destination', 'bankAccountNumber', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={t('customerBanking.accountNumberPlaceholder')}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('customerBanking.accountHolder')}
                      </label>
                      <input
                        type="text"
                        value={formData.destination.bankAccountHolder}
                        onChange={(e) => handleNestedInputChange('destination', 'bankAccountHolder', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={t('customerBanking.accountHolderPlaceholder')}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('customerBanking.iban')}
                      </label>
                      <input
                        type="text"
                        value={formData.destination.bankIban}
                        onChange={(e) => handleNestedInputChange('destination', 'bankIban', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={t('customerBanking.ibanPlaceholder')}
                      />
                    </div>
                  </div>
                )}

                {formData.transferType === 'cash' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('customerBanking.recipientName')}
                      </label>
                      <input
                        type="text"
                        value={formData.destination.recipientName}
                        onChange={(e) => handleNestedInputChange('destination', 'recipientName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={t('customerBanking.recipientNamePlaceholder')}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('customerBanking.recipientPhone')}
                      </label>
                      <input
                        type="tel"
                        value={formData.destination.recipientPhone}
                        onChange={(e) => handleNestedInputChange('destination', 'recipientPhone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={t('customerBanking.recipientPhonePlaceholder')}
                        required
                      />
                    </div>
                  </div>
                )}

                {formData.transferType === 'crypto' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('customerBanking.cryptoAddress')}
                      </label>
                      <input
                        type="text"
                        value={formData.destination.cryptoAddress}
                        onChange={(e) => handleNestedInputChange('destination', 'cryptoAddress', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={t('customerBanking.cryptoAddressPlaceholder')}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('customerBanking.cryptoNetwork')}
                      </label>
                      <input
                        type="text"
                        value={formData.destination.cryptoNetwork}
                        onChange={(e) => handleNestedInputChange('destination', 'cryptoNetwork', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={t('customerBanking.cryptoNetworkPlaceholder')}
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('customerBanking.description')}
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder={t('customerBanking.descriptionPlaceholder')}
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('customerBanking.priority')}
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => handleInputChange('priority', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">{t('customerBanking.low')}</option>
                    <option value="normal">{t('customerBanking.normal')}</option>
                    <option value="high">{t('customerBanking.high')}</option>
                    <option value="urgent">{t('customerBanking.urgent')}</option>
                  </select>
                </div>
              </div>

              {/* Submit */}
              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t('customerBanking.creating') : t('customerBanking.createTransfer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerBanking; 