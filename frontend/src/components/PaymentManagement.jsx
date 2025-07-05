import React, { useState, useEffect } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import api from '../services/api';
import { toast } from 'react-hot-toast';

const PaymentManagement = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  
  const [payments, setPayments] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showReceiptUpload, setShowReceiptUpload] = useState(false);
  const [showReceiptsModal, setShowReceiptsModal] = useState(false);
  const [receiptsToShow, setReceiptsToShow] = useState([]);
  
  const [paymentForm, setPaymentForm] = useState({
    transactionId: '',
    customerId: '',
    amount: '',
    currency: 'IRR',
    paymentMethod: 'bank_transfer',
    bankAccount: {
      bankName: '',
      accountNumber: '',
      accountHolder: ''
    },
    referenceNumber: ''
  });

  const [receiptForm, setReceiptForm] = useState({
    accountHolderName: '',
    paymentDate: '',
    referenceNumber: '',
    amount: '',
    receiptFile: null
  });

  const [receiptError, setReceiptError] = useState('');

  useEffect(() => {
    loadPayments();
    loadTransactions();
    loadCustomers();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/payments');
      setPayments(response.data.data);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const response = await api.get('/transactions');
      setTransactions(response.data.data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await api.get('/customers');
      setCustomers(response.data.data);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post('/payments', paymentForm);
      setShowPaymentForm(false);
      setPaymentForm({
        transactionId: '',
        customerId: '',
        amount: '',
        currency: 'IRR',
        paymentMethod: 'bank_transfer',
        bankAccount: {
          bankName: '',
          accountNumber: '',
          accountHolder: ''
        },
        referenceNumber: ''
      });
      loadPayments();
    } catch (error) {
      console.error('Error creating payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReceiptUpload = async (paymentId, receiptForm) => {
    setReceiptError('');
    try {
      const formData = new FormData();
      formData.append('accountHolderName', receiptForm.accountHolderName);
      formData.append('paymentDate', receiptForm.paymentDate);
      formData.append('referenceNumber', receiptForm.referenceNumber);
      formData.append('amount', receiptForm.amount);
      formData.append('receiptFile', receiptForm.receiptFile);
      await api.post(`/payments/${paymentId}/upload-receipt`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setShowReceiptUpload(false);
      setReceiptForm({ accountHolderName: '', paymentDate: '', referenceNumber: '', amount: '', receiptFile: null });
      toast.success('رسید با موفقیت ثبت شد.');
      loadPayments();
    } catch (error) {
      setReceiptError('خطا در آپلود رسید.');
      console.error('Error uploading receipt:', error);
    }
  };

  const handleVerifyPayment = async (paymentId, verificationData) => {
    try {
      setLoading(true);
      await api.post(`/payments/${paymentId}/verify`, { verificationData });
      loadPayments();
    } catch (error) {
      console.error('Error verifying payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectPayment = async (paymentId, reason) => {
    try {
      setLoading(true);
      await api.post(`/payments/${paymentId}/reject`, { reason });
      loadPayments();
    } catch (error) {
      console.error('Error rejecting payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'verified': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentMethodText = (method) => {
    switch (method) {
      case 'bank_transfer': return t('payment.methods.bankTransfer');
      case 'cash': return t('payment.methods.cash');
      case 'card': return t('payment.methods.card');
      case 'digital_wallet': return t('payment.methods.digitalWallet');
      case 'crypto': return t('payment.methods.crypto');
      default: return method;
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {t('payment.management.title')}
        </h2>
        <button
          onClick={() => setShowPaymentForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t('payment.create')}
        </button>
      </div>

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {t('payment.create')}
            </h3>
            <form onSubmit={handlePaymentSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('payment.transaction')}
                  </label>
                  <select
                    value={paymentForm.transactionId}
                    onChange={(e) => setPaymentForm({
                      ...paymentForm,
                      transactionId: e.target.value
                    })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="">{t('common.select')}</option>
                    {transactions.map(transaction => (
                      <option key={transaction._id} value={transaction._id}>
                        {transaction._id} - {transaction.amount} {transaction.currency}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('payment.customer')}
                  </label>
                  <select
                    value={paymentForm.customerId}
                    onChange={(e) => setPaymentForm({
                      ...paymentForm,
                      customerId: e.target.value
                    })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="">{t('common.select')}</option>
                    {customers.map(customer => (
                      <option key={customer._id} value={customer._id}>
                        {customer.name} - {customer.phone}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('payment.amount')}
                  </label>
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({
                      ...paymentForm,
                      amount: e.target.value
                    })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                    min="0.01"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('payment.method')}
                  </label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({
                      ...paymentForm,
                      paymentMethod: e.target.value
                    })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="bank_transfer">{t('payment.methods.bankTransfer')}</option>
                    <option value="cash">{t('payment.methods.cash')}</option>
                    <option value="card">{t('payment.methods.card')}</option>
                    <option value="digital_wallet">{t('payment.methods.digitalWallet')}</option>
                    <option value="crypto">{t('payment.methods.crypto')}</option>
                  </select>
                </div>

                {paymentForm.paymentMethod === 'bank_transfer' && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder={t('payment.bankName')}
                      value={paymentForm.bankAccount.bankName}
                      onChange={(e) => setPaymentForm({
                        ...paymentForm,
                        bankAccount: {
                          ...paymentForm.bankAccount,
                          bankName: e.target.value
                        }
                      })}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                    <input
                      type="text"
                      placeholder={t('payment.accountNumber')}
                      value={paymentForm.bankAccount.accountNumber}
                      onChange={(e) => setPaymentForm({
                        ...paymentForm,
                        bankAccount: {
                          ...paymentForm.bankAccount,
                          accountNumber: e.target.value
                        }
                      })}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('payment.referenceNumber')}
                  </label>
                  <input
                    type="text"
                    value={paymentForm.referenceNumber}
                    onChange={(e) => setPaymentForm({
                      ...paymentForm,
                      referenceNumber: e.target.value
                    })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowPaymentForm(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? t('common.loading') : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Upload Modal */}
      {showReceiptUpload && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {t('payment.uploadReceipt')}
            </h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!receiptForm.accountHolderName || !receiptForm.paymentDate || !receiptForm.referenceNumber || !receiptForm.amount || !receiptForm.receiptFile) {
                  setReceiptError('لطفاً همه فیلدها را تکمیل کنید.');
                  return;
                }
                await handleReceiptUpload(selectedPayment._id, receiptForm);
              }}
            >
              <input
                type="text"
                placeholder="نام صاحب حساب"
                className="w-full p-2 border border-gray-300 rounded-md mb-2"
                value={receiptForm.accountHolderName}
                onChange={e => setReceiptForm(f => ({ ...f, accountHolderName: e.target.value }))}
                required
              />
              <input
                type="date"
                placeholder="تاریخ پرداخت"
                className="w-full p-2 border border-gray-300 rounded-md mb-2"
                value={receiptForm.paymentDate}
                onChange={e => setReceiptForm(f => ({ ...f, paymentDate: e.target.value }))}
                required
              />
              <input
                type="text"
                placeholder="شماره پیگیری"
                className="w-full p-2 border border-gray-300 rounded-md mb-2"
                value={receiptForm.referenceNumber}
                onChange={e => setReceiptForm(f => ({ ...f, referenceNumber: e.target.value }))}
                required
              />
              <input
                type="number"
                placeholder="مبلغ"
                className="w-full p-2 border border-gray-300 rounded-md mb-2"
                value={receiptForm.amount}
                onChange={e => setReceiptForm(f => ({ ...f, amount: e.target.value }))}
                required
              />
              <input
                type="file"
                accept="image/*,.pdf"
                className="w-full p-2 border border-gray-300 rounded-md mb-2"
                onChange={e => setReceiptForm(f => ({ ...f, receiptFile: e.target.files[0] }))}
                required
              />
              {receiptError && <div className="text-red-600 mb-2 text-center">{receiptError}</div>}
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowReceiptUpload(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {t('payment.uploadReceipt')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipts Modal */}
      {showReceiptsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-center">رسیدهای پرداخت</h3>
            <table className="min-w-full divide-y divide-gray-200 mb-4">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-xs">نام صاحب حساب</th>
                  <th className="px-2 py-2 text-xs">تاریخ پرداخت</th>
                  <th className="px-2 py-2 text-xs">شماره پیگیری</th>
                  <th className="px-2 py-2 text-xs">مبلغ</th>
                  <th className="px-2 py-2 text-xs">فایل رسید</th>
                </tr>
              </thead>
              <tbody>
                {receiptsToShow.map((r, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="px-2 py-2 text-sm">{r.accountHolderName || '-'}</td>
                    <td className="px-2 py-2 text-sm">{r.paymentDate ? new Date(r.paymentDate).toLocaleDateString() : '-'}</td>
                    <td className="px-2 py-2 text-sm">{r.referenceNumber || '-'}</td>
                    <td className="px-2 py-2 text-sm">{r.amount ? r.amount.toLocaleString() : '-'}</td>
                    <td className="px-2 py-2 text-sm">
                      {r.filePath ? (
                        <a href={`/${r.filePath.replace(/^uploads\//, 'uploads/')}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">مشاهده</a>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-center">
              <button
                onClick={() => setShowReceiptsModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payments List */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('payment.id')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('payment.customer')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('payment.amount')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('payment.method')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('payment.status')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('payment.date')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('common.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {payments.map((payment) => (
              <tr key={payment._id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {payment._id.slice(-8)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {payment.customerId?.name || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {payment.amount.toLocaleString()} {payment.currency}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {getPaymentMethodText(payment.paymentMethod)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                    {t(`payment.status.${payment.status}`)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(payment.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    {payment.status === 'pending' && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedPayment(payment);
                            setShowReceiptUpload(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          {t('payment.uploadReceipt')}
                        </button>
                        <button
                          onClick={() => handleVerifyPayment(payment._id, {})}
                          className="text-green-600 hover:text-green-900"
                        >
                          {t('payment.verify')}
                        </button>
                        <button
                          onClick={() => handleRejectPayment(payment._id, 'Rejected by admin')}
                          className="text-red-600 hover:text-red-900"
                        >
                          {t('payment.reject')}
                        </button>
                      </>
                    )}
                    {payment.receipts && payment.receipts.length > 0 && (
                      <button
                        onClick={() => {
                          setReceiptsToShow(payment.receipts);
                          setShowReceiptsModal(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        مشاهده رسیدها
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
};

export default PaymentManagement; 