import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { t } from '../utils/i18n';
import api from '../services/api';

const TransactionWorkflow = () => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    customerId: '',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    loadTransactions();
  }, [filters]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });

      const response = await api.get(`/currency-transactions?${params}`);
      setTransactions(response.data.data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (transactionId, newStatus, reason = '') => {
    try {
      await api.put(`/currency-transactions/${transactionId}/status`, {
        status: newStatus,
        reason
      });
      
      // Reload transactions
      loadTransactions();
      
      // Update selected transaction if it's the one being updated
      if (selectedTransaction && selectedTransaction._id === transactionId) {
        const updatedTransaction = transactions.find(t => t._id === transactionId);
        setSelectedTransaction(updatedTransaction);
      }
      
      alert(t('transaction.statusUpdated'));
    } catch (error) {
      console.error('Error updating status:', error);
      alert(t('error.statusUpdateFailed'));
    }
  };

  const handleReceiptUpload = async (transactionId, accountIndex, file) => {
    try {
      const formData = new FormData();
      formData.append('receipt', file);

      await api.post(`/currency-transactions/${transactionId}/receipt/${accountIndex}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      loadTransactions();
      alert(t('transaction.receiptUploaded'));
    } catch (error) {
      console.error('Error uploading receipt:', error);
      alert(t('error.receiptUploadFailed'));
    }
  };

  const handleReceiptVerification = async (transactionId, accountIndex, verified) => {
    try {
      await api.put(`/currency-transactions/${transactionId}/receipt/${accountIndex}/verify`, {
        verified
      });

      loadTransactions();
      alert(verified ? t('transaction.receiptVerified') : t('transaction.receiptUnverified'));
    } catch (error) {
      console.error('Error verifying receipt:', error);
      alert(t('error.receiptVerificationFailed'));
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending_payment: 'bg-yellow-100 text-yellow-800',
      partial_paid: 'bg-blue-100 text-blue-800',
      payment_complete: 'bg-green-100 text-green-800',
      processing: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      failed: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending_payment: '⏳',
      partial_paid: '💰',
      payment_complete: '✅',
      processing: '⚙️',
      completed: '🎉',
      cancelled: '❌',
      failed: '💥'
    };
    return icons[status] || '❓';
  };

  const calculateProgress = (transaction) => {
    if (!transaction.paymentSplit || !transaction.paymentSplit.accounts) return 0;
    
    const total = transaction.paymentSplit.accounts.length;
    const completed = transaction.paymentSplit.accounts.filter(acc => acc.status === 'verified').length;
    
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">
            {t('transactionWorkflow.title')}
          </h2>
          <p className="text-gray-600 mt-2">
            {t('transactionWorkflow.description')}
          </p>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('transactionWorkflow.allStatuses')}</option>
              <option value="pending_payment">{t('transactionWorkflow.pendingPayment')}</option>
              <option value="partial_paid">{t('transactionWorkflow.partialPaid')}</option>
              <option value="payment_complete">{t('transactionWorkflow.paymentComplete')}</option>
              <option value="processing">{t('transactionWorkflow.processing')}</option>
              <option value="completed">{t('transactionWorkflow.completed')}</option>
              <option value="cancelled">{t('transactionWorkflow.cancelled')}</option>
              <option value="failed">{t('transactionWorkflow.failed')}</option>
            </select>

            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('transactionWorkflow.allTypes')}</option>
              <option value="buy">{t('transactionWorkflow.buy')}</option>
              <option value="sell">{t('transactionWorkflow.sell')}</option>
              <option value="exchange">{t('transactionWorkflow.exchange')}</option>
              <option value="remittance">{t('transactionWorkflow.remittance')}</option>
            </select>

            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('transactionWorkflow.dateFrom')}
            />

            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('transactionWorkflow.dateTo')}
            />

            <button
              onClick={loadTransactions}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {t('transactionWorkflow.filter')}
            </button>

            <button
              onClick={() => setFilters({
                status: '',
                type: '',
                customerId: '',
                dateFrom: '',
                dateTo: ''
              })}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              {t('transactionWorkflow.clear')}
            </button>
          </div>
        </div>

        {/* Transactions List */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">{t('transactionWorkflow.loading')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map(transaction => (
                <div
                  key={transaction._id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedTransaction(transaction)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(transaction.status)}`}>
                        <span className="mr-2">{getStatusIcon(transaction.status)}</span>
                        {t(`transactionWorkflow.${transaction.status}`)}
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {transaction.transactionId}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {transaction.customerId?.name} - {transaction.customerId?.phone}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-semibold text-gray-800">
                        {transaction.amountFrom?.toLocaleString()} {transaction.currencyFrom}
                      </div>
                      <div className="text-sm text-gray-600">
                        → {transaction.amountTo?.toLocaleString()} {transaction.currencyTo}
                      </div>
                    </div>
                  </div>

                  {/* Payment Progress */}
                  {transaction.paymentSplit && transaction.paymentSplit.accounts && (
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {t('transactionWorkflow.paymentProgress')}
                        </span>
                        <span className="text-sm text-gray-600">
                          {calculateProgress(transaction)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${calculateProgress(transaction)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                    <span>{new Date(transaction.created_at).toLocaleDateString()}</span>
                    <span>{transaction.type.toUpperCase()}</span>
                  </div>
                </div>
              ))}

              {transactions.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-600">{t('transactionWorkflow.noTransactions')}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">
                  {t('transactionWorkflow.transactionDetails')}
                </h3>
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Transaction Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-semibold mb-2">{t('transactionWorkflow.basicInfo')}</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">ID:</span> {selectedTransaction.transactionId}</div>
                    <div><span className="font-medium">{t('transactionWorkflow.customer')}:</span> {selectedTransaction.customerId?.name}</div>
                    <div><span className="font-medium">{t('transactionWorkflow.type')}:</span> {selectedTransaction.type}</div>
                    <div><span className="font-medium">{t('transactionWorkflow.status')}:</span> {selectedTransaction.status}</div>
                    <div><span className="font-medium">{t('transactionWorkflow.created')}:</span> {new Date(selectedTransaction.created_at).toLocaleString()}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">{t('transactionWorkflow.amounts')}</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">{t('transactionWorkflow.from')}:</span> {selectedTransaction.amountFrom?.toLocaleString()} {selectedTransaction.currencyFrom}</div>
                    <div><span className="font-medium">{t('transactionWorkflow.to')}:</span> {selectedTransaction.amountTo?.toLocaleString()} {selectedTransaction.currencyTo}</div>
                    <div><span className="font-medium">{t('transactionWorkflow.rate')}:</span> {selectedTransaction.exchangeRate}</div>
                    <div><span className="font-medium">{t('transactionWorkflow.fees')}:</span> {selectedTransaction.fees?.amount || 0} {selectedTransaction.fees?.currency}</div>
                    <div><span className="font-medium">{t('transactionWorkflow.discount')}:</span> {selectedTransaction.discount?.amount || 0} {selectedTransaction.discount?.currency}</div>
                  </div>
                </div>
              </div>

              {/* Payment Accounts */}
              {selectedTransaction.paymentSplit && selectedTransaction.paymentSplit.accounts && (
                <div className="mb-6">
                  <h4 className="font-semibold mb-4">{t('transactionWorkflow.paymentAccounts')}</h4>
                  <div className="space-y-4">
                    {selectedTransaction.paymentSplit.accounts.map((account, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-medium">{account.accountName}</div>
                            <div className="text-sm text-gray-600">{account.bankName} - {account.accountNumber}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{account.amount?.toLocaleString()}</div>
                            <div className={`text-sm px-2 py-1 rounded-full ${
                              account.status === 'verified' ? 'bg-green-100 text-green-800' :
                              account.status === 'paid' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {t(`transactionWorkflow.${account.status}`)}
                            </div>
                          </div>
                        </div>

                        {/* Receipt Upload */}
                        {!account.receipt && (
                          <div className="mt-2">
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={(e) => {
                                if (e.target.files[0]) {
                                  handleReceiptUpload(selectedTransaction._id, index, e.target.files[0]);
                                }
                              }}
                              className="text-sm"
                            />
                          </div>
                        )}

                        {/* Receipt Display */}
                        {account.receipt && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-gray-600">
                                {t('transactionWorkflow.receiptUploaded')}: {account.receipt.fileName}
                              </div>
                              <div className="flex space-x-2">
                                {!account.receipt.verified && (
                                  <button
                                    onClick={() => handleReceiptVerification(selectedTransaction._id, index, true)}
                                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                                  >
                                    {t('transactionWorkflow.verify')}
                                  </button>
                                )}
                                {account.receipt.verified && (
                                  <button
                                    onClick={() => handleReceiptVerification(selectedTransaction._id, index, false)}
                                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                                  >
                                    {t('transactionWorkflow.unverify')}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Actions */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="font-semibold mb-4">{t('transactionWorkflow.actions')}</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTransaction.status === 'pending_payment' && (
                    <>
                      <button
                        onClick={() => handleStatusUpdate(selectedTransaction._id, 'processing')}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        {t('transactionWorkflow.startProcessing')}
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(selectedTransaction._id, 'cancelled')}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        {t('transactionWorkflow.cancel')}
                      </button>
                    </>
                  )}

                  {selectedTransaction.status === 'processing' && (
                    <>
                      <button
                        onClick={() => handleStatusUpdate(selectedTransaction._id, 'completed')}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        {t('transactionWorkflow.complete')}
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(selectedTransaction._id, 'failed')}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        {t('transactionWorkflow.markFailed')}
                      </button>
                    </>
                  )}

                  {selectedTransaction.status === 'payment_complete' && (
                    <button
                      onClick={() => handleStatusUpdate(selectedTransaction._id, 'processing')}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      {t('transactionWorkflow.startProcessing')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionWorkflow; 