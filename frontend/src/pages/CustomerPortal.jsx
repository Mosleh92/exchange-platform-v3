// src/pages/CustomerPortal.jsx - پورتال مشتریان
import React, { useState } from 'react';
import LANGUAGE_UTILS from '../utils/LanguageUtils';

const CustomerPortal = () => {
  const [customerLogin, setCustomerLogin] = useState({ username: '', password: '' });
  const [loggedInCustomer, setLoggedInCustomer] = useState(null);
  const [showNewTransactionModal, setShowNewTransactionModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const handleCustomerLogin = (e) => {
    e.preventDefault();
    // This is a mock authentication. Replace with actual API call.
    const mockCustomer = {
      id: 'CUST001',
      name: 'احمد محمدی',
      username: customerLogin.username,
      balances: {
        USD: { available: 5000, frozen: 500, total: 5500 },
        AED: { available: 18500, frozen: 0, total: 18500 },
        EUR: { available: 2300, frozen: 0, total: 2300 },
      },
      transactions: [
        { id: 'TXN001', type: 'deposit', amount: 1000, currency: 'USD', date: '2024-01-15', status: 'completed', description: 'Cash deposit' },
        { id: 'TXN002', type: 'remittance', amount: 500, currency: 'USD', date: '2024-01-14', status: 'pending', description: 'Transfer to Iran' },
      ],
    };
    setLoggedInCustomer(mockCustomer);
  };

  const handleNewTransactionSubmit = (e) => {
    e.preventDefault();
    // Logic to create a new transaction
    console.log('Creating new transaction...');
    setShowNewTransactionModal(false);
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'failed': return 'error';
      default: return 'info';
    }
  };

  // Login Form
  if (!loggedInCustomer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Customer Portal</h1>
            <p className="text-gray-600">Login to view your account</p>
          </div>
          <form onSubmit={handleCustomerLogin} className="space-y-4">
            <input
              placeholder="Username"
              value={customerLogin.username}
              onChange={(e) => setCustomerLogin({ ...customerLogin, username: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-3"
              required
            />
            <input
              placeholder="Password"
              type="password"
              value={customerLogin.password}
              onChange={(e) => setCustomerLogin({ ...customerLogin, password: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-3"
              required
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Customer Dashboard
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {LANGUAGE_UTILS.getTranslation('customers.portal', 'پورتال مشتری')} - {loggedInCustomer.name}
        </h1>
        <div className="flex space-x-4">
          <button
            onClick={() => setShowNewTransactionModal(true)}
            className="btn btn-primary"
          >
            {LANGUAGE_UTILS.getTranslation('transactions.newTransaction', 'تراکنش جدید')}
          </button>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {Object.entries(loggedInCustomer.balances).map(([currency, balance]) => (
          <div key={currency} className="card bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">
              {LANGUAGE_UTILS.getTranslation(`currencies.${currency}`, currency)}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{LANGUAGE_UTILS.getTranslation('customers.available', 'موجودی قابل برداشت')}</span>
                <span className="font-medium">{balance.available.toLocaleString()} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span>{LANGUAGE_UTILS.getTranslation('customers.frozen', 'موجودی مسدود')}</span>
                <span className="font-medium">{balance.frozen.toLocaleString()} {currency}</span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="font-bold">{LANGUAGE_UTILS.getTranslation('customers.total', 'مجموع')}</span>
                <span className="font-bold">{balance.total.toLocaleString()} {currency}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">
            {LANGUAGE_UTILS.getTranslation('transactions.recent', 'تراکنش‌های اخیر')}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="table w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-3 text-right">{LANGUAGE_UTILS.getTranslation('transactions.date', 'تاریخ')}</th>
                <th className="p-3 text-right">{LANGUAGE_UTILS.getTranslation('transactions.type', 'نوع')}</th>
                <th className="p-3 text-right">{LANGUAGE_UTILS.getTranslation('transactions.amount', 'مبلغ')}</th>
                <th className="p-3 text-right">{LANGUAGE_UTILS.getTranslation('transactions.status', 'وضعیت')}</th>
                <th className="p-3 text-right">{LANGUAGE_UTILS.getTranslation('common.actions', 'عملیات')}</th>
              </tr>
            </thead>
            <tbody>
              {loggedInCustomer.transactions.map(transaction => (
                <tr key={transaction.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{new Date(transaction.date).toLocaleDateString('fa-IR')}</td>
                  <td className="p-3">{LANGUAGE_UTILS.getTranslation(`transactions.types.${transaction.type}`, transaction.type)}</td>
                  <td className="p-3">{transaction.amount.toLocaleString()} {transaction.currency}</td>
                  <td className="p-3">
                    <span className={`badge badge-${getStatusColor(transaction.status)}`}>
                      {LANGUAGE_UTILS.getTranslation(`status.${transaction.status}`, transaction.status)}
                    </span>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => setSelectedTransaction(transaction)}
                      className="btn btn-sm btn-info"
                    >
                      {LANGUAGE_UTILS.getTranslation('common.view', 'مشاهده')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Transaction Modal */}
      {showNewTransactionModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {LANGUAGE_UTILS.getTranslation('transactions.newTransaction', 'تراکنش جدید')}
            </h3>
            <form onSubmit={handleNewTransactionSubmit}>
              <p>Form for a new transaction will be here.</p>
              <div className="modal-action mt-6">
                <button type="submit" className="btn btn-primary">
                  {LANGUAGE_UTILS.getTranslation('common.submit', 'ثبت')}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowNewTransactionModal(false)}
                >
                  {LANGUAGE_UTILS.getTranslation('common.cancel', 'لغو')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Transaction Modal */}
      {selectedTransaction && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {LANGUAGE_UTILS.getTranslation('transactions.details', 'جزئیات تراکنش')}
            </h3>
            <div className="space-y-2">
               <p><strong>ID:</strong> {selectedTransaction.id}</p>
               <p><strong>Date:</strong> {new Date(selectedTransaction.date).toLocaleDateString('fa-IR')}</p>
               <p><strong>Type:</strong> {selectedTransaction.type}</p>
               <p><strong>Amount:</strong> {selectedTransaction.amount.toLocaleString()} {selectedTransaction.currency}</p>
               <p><strong>Status:</strong> {selectedTransaction.status}</p>
               <p><strong>Description:</strong> {selectedTransaction.description}</p>
            </div>
            <div className="modal-action mt-6">
              <button
                className="btn"
                onClick={() => setSelectedTransaction(null)}
              >
                {LANGUAGE_UTILS.getTranslation('common.close', 'بستن')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerPortal;