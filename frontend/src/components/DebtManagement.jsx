import React, { useState, useEffect } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import api from '../services/api';

const DebtManagement = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  
  const [debts, setDebts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [showDebtForm, setShowDebtForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showNotificationForm, setShowNotificationForm] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  
  const [debtForm, setDebtForm] = useState({
    customerId: '',
    transactionId: '',
    originalAmount: '',
    currency: 'IRR',
    dueDate: '',
    interestRate: 0,
    penaltyRate: 0,
    gracePeriod: 0
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'bank_transfer',
    referenceNumber: '',
    sender: {
      name: '',
      phone: '',
      nationalId: ''
    },
    bankAccount: {
      bankName: '',
      accountNumber: '',
      accountHolder: ''
    },
    receipts: []
  });

  const [notificationForm, setNotificationForm] = useState({
    type: 'reminder',
    method: 'sms',
    content: ''
  });

  useEffect(() => {
    loadDebts();
    loadCustomers();
    loadTransactions();
  }, []);

  const loadDebts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/debts');
      setDebts(response.data.data);
    } catch (error) {
      console.error('Error loading debts:', error);
    } finally {
      setLoading(false);
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

  const loadTransactions = async () => {
    try {
      const response = await api.get('/transactions');
      setTransactions(response.data.data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const handleDebtSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post('/debts', debtForm);
      setShowDebtForm(false);
      setDebtForm({
        customerId: '',
        transactionId: '',
        originalAmount: '',
        currency: 'IRR',
        dueDate: '',
        interestRate: 0,
        penaltyRate: 0,
        gracePeriod: 0
      });
      loadDebts();
    } catch (error) {
      console.error('Error creating debt:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files) => {
    const uploadedReceipts = [];
    
    for (let file of files) {
      const formData = new FormData();
      formData.append('receipt', file);
      
      try {
        const response = await api.post('/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        uploadedReceipts.push({
          filePath: response.data.url,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          description: ''
        });
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    }
    
    setPaymentForm(prev => ({
      ...prev,
      receipts: [...prev.receipts, ...uploadedReceipts]
    }));
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Create payment with receipts
      const paymentData = {
        ...paymentForm,
        receipts: paymentForm.receipts.map(receipt => ({
          filePath: receipt.filePath,
          fileName: receipt.fileName,
          description: receipt.description || ''
        }))
      };
      
      await api.post(`/debts/${selectedDebt._id}/payment`, paymentData);
      setShowPaymentForm(false);
      setPaymentForm({
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'bank_transfer',
        referenceNumber: '',
        sender: {
          name: '',
          phone: '',
          nationalId: ''
        },
        bankAccount: {
          bankName: '',
          accountNumber: '',
          accountHolder: ''
        },
        receipts: []
      });
      loadDebts();
    } catch (error) {
      console.error('Error adding payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post(`/debts/${selectedDebt._id}/notification`, notificationForm);
      setShowNotificationForm(false);
      setNotificationForm({
        type: 'reminder',
        method: 'sms',
        content: ''
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettleDebt = async (debtId, reason) => {
    try {
      setLoading(true);
      await api.post(`/debts/${debtId}/settle`, { reason });
      loadDebts();
    } catch (error) {
      console.error('Error settling debt:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWriteOffDebt = async (debtId, reason) => {
    try {
      setLoading(true);
      await api.post(`/debts/${debtId}/write-off`, { reason });
      loadDebts();
    } catch (error) {
      console.error('Error writing off debt:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'settled': return 'bg-green-100 text-green-800';
      case 'written_off': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskLevelColor = (riskLevel) => {
    switch (riskLevel) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateDaysOverdue = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = now - due;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {t('debt.management.title')}
        </h2>
        <button
          onClick={() => setShowDebtForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t('debt.create')}
        </button>
      </div>

      {/* Debt Form Modal */}
      {showDebtForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {t('debt.create')}
            </h3>
            <form onSubmit={handleDebtSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('debt.customer')}
                  </label>
                  <select
                    value={debtForm.customerId}
                    onChange={(e) => setDebtForm({
                      ...debtForm,
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
                    {t('debt.transaction')}
                  </label>
                  <select
                    value={debtForm.transactionId}
                    onChange={(e) => setDebtForm({
                      ...debtForm,
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
                    {t('debt.originalAmount')}
                  </label>
                  <input
                    type="number"
                    value={debtForm.originalAmount}
                    onChange={(e) => setDebtForm({
                      ...debtForm,
                      originalAmount: e.target.value
                    })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                    min="0.01"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('debt.dueDate')}
                  </label>
                  <input
                    type="date"
                    value={debtForm.dueDate}
                    onChange={(e) => setDebtForm({
                      ...debtForm,
                      dueDate: e.target.value
                    })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('debt.interestRate')} (%)
                    </label>
                    <input
                      type="number"
                      value={debtForm.interestRate}
                      onChange={(e) => setDebtForm({
                        ...debtForm,
                        interestRate: e.target.value
                      })}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('debt.penaltyRate')} (%)
                    </label>
                    <input
                      type="number"
                      value={debtForm.penaltyRate}
                      onChange={(e) => setDebtForm({
                        ...debtForm,
                        penaltyRate: e.target.value
                      })}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowDebtForm(false)}
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

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {t('debt.addPayment')}
              </h3>
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t('debt.paymentAmount')}
                  </label>
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t('debt.paymentMethod')}
                  </label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({...paymentForm, paymentMethod: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="bank_transfer">{t('payment.method.bankTransfer')}</option>
                    <option value="cash">{t('payment.method.cash')}</option>
                    <option value="card">{t('payment.method.card')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t('debt.referenceNumber')}
                  </label>
                  <input
                    type="text"
                    value={paymentForm.referenceNumber}
                    onChange={(e) => setPaymentForm({...paymentForm, referenceNumber: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                {/* Sender Information */}
                <div className="border-t pt-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">
                    {t('payment.senderInfo')}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {t('payment.senderName')}
                      </label>
                      <input
                        type="text"
                        value={paymentForm.sender.name}
                        onChange={(e) => setPaymentForm({
                          ...paymentForm, 
                          sender: {...paymentForm.sender, name: e.target.value}
                        })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {t('payment.senderPhone')}
                      </label>
                      <input
                        type="text"
                        value={paymentForm.sender.phone}
                        onChange={(e) => setPaymentForm({
                          ...paymentForm, 
                          sender: {...paymentForm.sender, phone: e.target.value}
                        })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                  </div>
                </div>

                {/* Bank Account Details */}
                {paymentForm.paymentMethod === 'bank_transfer' && (
                  <div className="border-t pt-4">
                    <h4 className="text-md font-medium text-gray-900 mb-3">
                      {t('payment.bankDetails')}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t('payment.bankName')}
                        </label>
                        <input
                          type="text"
                          value={paymentForm.bankAccount.bankName}
                          onChange={(e) => setPaymentForm({
                            ...paymentForm, 
                            bankAccount: {...paymentForm.bankAccount, bankName: e.target.value}
                          })}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t('payment.accountNumber')}
                        </label>
                        <input
                          type="text"
                          value={paymentForm.bankAccount.accountNumber}
                          onChange={(e) => setPaymentForm({
                            ...paymentForm, 
                            bankAccount: {...paymentForm.bankAccount, accountNumber: e.target.value}
                          })}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Receipt Upload */}
                <div className="border-t pt-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">
                    {t('payment.receipts')}
                  </h4>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {t('payment.receiptsHelp')}
                  </p>
                </div>

                {/* Uploaded Receipts */}
                {paymentForm.receipts.length > 0 && (
                  <div className="border-t pt-4">
                    <h5 className="text-sm font-medium text-gray-900 mb-2">
                      {t('payment.uploadedReceipts')}
                    </h5>
                    <div className="space-y-2">
                      {paymentForm.receipts.map((receipt, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">{receipt.fileName}</span>
                          <input
                            type="text"
                            placeholder={t('payment.receiptDescription')}
                            value={receipt.description}
                            onChange={(e) => {
                              const updatedReceipts = [...paymentForm.receipts];
                              updatedReceipts[index].description = e.target.value;
                              setPaymentForm({...paymentForm, receipts: updatedReceipts});
                            }}
                            className="flex-1 text-sm border border-gray-300 rounded px-2 py-1"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPaymentForm(false)}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? t('common.loading') : t('debt.addPayment')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Notification Form Modal */}
      {showNotificationForm && selectedDebt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {t('debt.sendNotification')}
            </h3>
            <form onSubmit={handleNotificationSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('debt.notificationType')}
                  </label>
                  <select
                    value={notificationForm.type}
                    onChange={(e) => setNotificationForm({
                      ...notificationForm,
                      type: e.target.value
                    })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="reminder">{t('debt.notificationTypes.reminder')}</option>
                    <option value="overdue">{t('debt.notificationTypes.overdue')}</option>
                    <option value="final_notice">{t('debt.notificationTypes.finalNotice')}</option>
                    <option value="legal_action">{t('debt.notificationTypes.legalAction')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('debt.notificationMethod')}
                  </label>
                  <select
                    value={notificationForm.method}
                    onChange={(e) => setNotificationForm({
                      ...notificationForm,
                      method: e.target.value
                    })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                    <option value="push">Push Notification</option>
                    <option value="letter">Letter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('debt.notificationContent')}
                  </label>
                  <textarea
                    value={notificationForm.content}
                    onChange={(e) => setNotificationForm({
                      ...notificationForm,
                      content: e.target.value
                    })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    rows="4"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowNotificationForm(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? t('common.loading') : t('common.send')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Debts List */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('debt.customer')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('debt.originalAmount')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('debt.remainingAmount')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('debt.dueDate')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('debt.status')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('debt.riskLevel')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('common.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {debts.map((debt) => (
              <tr key={debt._id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {debt.customerId?.name || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {debt.originalAmount.toLocaleString()} {debt.currency}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {debt.remainingAmount.toLocaleString()} {debt.currency}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(debt.dueDate).toLocaleDateString()}
                  {debt.status === 'overdue' && (
                    <div className="text-red-600 text-xs">
                      {t('debt.daysOverdue', { days: calculateDaysOverdue(debt.dueDate) })}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(debt.status)}`}>
                    {t(`debt.status.${debt.status}`)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRiskLevelColor(debt.metadata?.riskLevel)}`}>
                    {t(`debt.riskLevel.${debt.metadata?.riskLevel}`)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    {debt.status === 'active' && debt.remainingAmount > 0 && (
                      <button
                        onClick={() => {
                          setSelectedDebt(debt);
                          setShowPaymentForm(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        {t('debt.addPayment')}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedDebt(debt);
                        setShowNotificationForm(true);
                      }}
                      className="text-green-600 hover:text-green-900"
                    >
                      {t('debt.sendNotification')}
                    </button>
                    {debt.remainingAmount <= 0 && (
                      <button
                        onClick={() => handleSettleDebt(debt._id, 'Fully paid')}
                        className="text-green-600 hover:text-green-900"
                      >
                        {t('debt.settle')}
                      </button>
                    )}
                    <button
                      onClick={() => handleWriteOffDebt(debt._id, 'Written off by admin')}
                      className="text-red-600 hover:text-red-900"
                    >
                      {t('debt.writeOff')}
                    </button>
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

export default DebtManagement; 