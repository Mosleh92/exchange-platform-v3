// src/pages/CustomerAccounts.jsx
import React, { useState, useEffect } from 'react';
import MockSMSSender from '../components/MockSMSSender';

const CustomerAccounts = () => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showSMS, setShowSMS] = useState(false);
  const [smsData, setSmsData] = useState({});
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    nationalId: '',
    address: '',
    country: '',
    initialBalances: {}
  });

  const [newTransaction, setNewTransaction] = useState({
    type: 'deposit', // deposit, withdrawal, transfer
    currency: 'USD',
    amount: '',
    description: '',
    reference: ''
  });

  const currencies = ['USD', 'AED', 'EUR', 'IRR', 'CNY', 'TRY', 'CAD'];

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = () => {
    try {
      const saved = localStorage.getItem('customers');
      if (saved) {
        setCustomers(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const saveCustomers = (customerList) => {
    localStorage.setItem('customers', JSON.stringify(customerList));
    setCustomers(customerList);
  };

  const createCustomer = () => {
    const customer = {
      id: `CUST${Date.now()}`,
      ...newCustomer,
      balances: currencies.reduce((acc, curr) => {
        acc[curr] = {
          available: parseFloat(newCustomer.initialBalances[curr] || 0),
          frozen: 0,
          total: parseFloat(newCustomer.initialBalances[curr] || 0)
        };
        return acc;
      }, {}),
      transactions: [],
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      status: 'active'
    };

    const updatedCustomers = [...customers, customer];
    saveCustomers(updatedCustomers);

    // Send welcome SMS
    setSmsData({
      phoneNumber: customer.phone,
      message: `Welcome to our exchange! Your account ${customer.id} has been created successfully. You can now view your balance and transaction history.`
    });
    setShowSMS(true);

    // Reset form
    setNewCustomer({
      name: '',
      phone: '',
      email: '',
      nationalId: '',
      address: '',
      country: '',
      initialBalances: {}
    });
  };

  const addTransaction = () => {
    if (!selectedCustomer) return;

    const transaction = {
      id: `TXN${Date.now()}`,
      customerId: selectedCustomer.id,
      type: newTransaction.type,
      currency: newTransaction.currency,
      amount: parseFloat(newTransaction.amount),
      description: newTransaction.description,
      reference: newTransaction.reference,
      timestamp: new Date().toISOString(),
      status: 'completed'
    };

    // Update customer balance
    const updatedCustomers = customers.map(customer => {
      if (customer.id === selectedCustomer.id) {
        const updatedBalances = { ...customer.balances };
        
        if (newTransaction.type === 'deposit') {
          updatedBalances[newTransaction.currency].available += parseFloat(newTransaction.amount);
          updatedBalances[newTransaction.currency].total += parseFloat(newTransaction.amount);
        } else if (newTransaction.type === 'withdrawal') {
          updatedBalances[newTransaction.currency].available -= parseFloat(newTransaction.amount);
          updatedBalances[newTransaction.currency].total -= parseFloat(newTransaction.amount);
        }

        return {
          ...customer,
          balances: updatedBalances,
          transactions: [transaction, ...customer.transactions],
          lastActivity: new Date().toISOString()
        };
      }
      return customer;
    });

    saveCustomers(updatedCustomers);
    setSelectedCustomer(updatedCustomers.find(c => c.id === selectedCustomer.id));

    // Send transaction SMS
    setSmsData({
      phoneNumber: selectedCustomer.phone,
      message: `Transaction completed: ${newTransaction.type.toUpperCase()} ${newTransaction.amount} ${newTransaction.currency}. New balance: ${updatedCustomers.find(c => c.id === selectedCustomer.id).balances[newTransaction.currency].available} ${newTransaction.currency}`
    });
    setShowSMS(true);

    setShowTransactionForm(false);
    setNewTransaction({
      type: 'deposit',
      currency: 'USD',
      amount: '',
      description: '',
      reference: ''
    });
  };

  const getBalanceColor = (balance) => {
    if (balance > 1000) return 'text-green-600';
    if (balance > 100) return 'text-blue-600';
    if (balance > 0) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">👥 Customer Accounts</h1>
              <p className="text-gray-600">Manage customer balances and transactions</p>
            </div>
            <button
              onClick={() => setShowTransactionForm(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
            >
              ➕ Add Transaction
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Customers</p>
                <p className="text-2xl font-bold text-blue-600">{customers.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">
                👥
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Active Today</p>
                <p className="text-2xl font-bold text-green-600">
                  {customers.filter(c => 
                    new Date(c.lastActivity).toDateString() === new Date().toDateString()
                  ).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl">
                🟢
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total USD Balance</p>
                <p className="text-2xl font-bold text-purple-600">
                  ${customers.reduce((sum, c) => sum + (c.balances?.USD?.total || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-2xl">
                💰
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Transactions Today</p>
                <p className="text-2xl font-bold text-orange-600">
                  {customers.reduce((sum, c) => 
                    sum + (c.transactions?.filter(t => 
                      new Date(t.timestamp).toDateString() === new Date().toDateString()
                    ).length || 0), 0
                  )}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-2xl">
                📊
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">Customer List</h2>
              </div>
              
              {/* Add New Customer Form */}
              <div className="p-6 border-b bg-gray-50">
                <h3 className="font-semibold mb-3">Add New Customer</h3>
                <div className="space-y-3">
                  <input
                    placeholder="Customer Name"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="Phone Number"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="Email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                  <select
                    value={newCustomer.country}
                    onChange={(e) => setNewCustomer({...newCustomer, country: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select Country</option>
                    <option value="UAE">🇦🇪 UAE</option>
                    <option value="Iran">🇮🇷 Iran</option>
                    <option value="Turkey">🇹🇷 Turkey</option>
                    <option value="China">🇨🇳 China</option>
                  </select>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {currencies.slice(0, 4).map(currency => (
                      <input
                        key={currency}
                        placeholder={`Initial ${currency}`}
                        type="number"
                        value={newCustomer.initialBalances[currency] || ''}
                        onChange={(e) => setNewCustomer({
                          ...newCustomer,
                          initialBalances: {
                            ...newCustomer.initialBalances,
                            [currency]: e.target.value
                          }
                        })}
                        className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
                      />
                    ))}
                  </div>

                  <button
                    onClick={createCustomer}
                    disabled={!newCustomer.name || !newCustomer.phone}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    Create Customer
                  </button>
                </div>
              </div>

              {/* Customer List */}
              <div className="max-h-96 overflow-y-auto">
                {customers.map(customer => (
                  <div
                    key={customer.id}
                    onClick={() => setSelectedCustomer(customer)}
                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedCustomer?.id === customer.id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-800">{customer.name}</h4>
                        <p className="text-sm text-gray-600">{customer.phone}</p>
                        <p className="text-xs text-gray-500">{customer.country}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-600">
                          ${customer.balances?.USD?.total?.toFixed(2) || '0.00'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {customer.transactions?.length || 0} txns
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {customers.length === 0 && (
                  <div className="p-8 text-center">
                    <div className="text-gray-400 text-4xl mb-2">👥</div>
                    <p className="text-gray-500">No customers yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div className="lg:col-span-2">
            {selectedCustomer ? (
              <div className="space-y-6">
                {/* Customer Info */}
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">{selectedCustomer.name}</h2>
                      <p className="text-gray-600">Customer ID: {selectedCustomer.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Last Activity</p>
                      <p className="font-medium">{new Date(selectedCustomer.lastActivity).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium">{selectedCustomer.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{selectedCustomer.email || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Country</p>
                      <p className="font-medium">{selectedCustomer.country}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {selectedCustomer.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Balances */}
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <h3 className="text-xl font-semibold mb-4">💰 Account Balances</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currencies.map(currency => {
                      const balance = selectedCustomer.balances?.[currency];
                      if (!balance || balance.total === 0) return null;
                      
                      return (
                        <div key={currency} className="border border-gray-200 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-800">{currency}</h4>
                            <span className={`text-lg font-bold ${getBalanceColor(balance.total)}`}>
                              {balance.total.toLocaleString()}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex justify-between">
                              <span>Available:</span>
                              <span className="font-medium">{balance.available.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Frozen:</span>
                              <span className="font-medium">{balance.frozen.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recent Transactions */}
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold">📊 Recent Transactions</h3>
                    <button
                      onClick={() => setShowTransactionForm(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                    >
                      Add Transaction
                    </button>
                  </div>

                  <div className="space-y-3">
                    {selectedCustomer.transactions?.slice(0, 10).map(transaction => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
                            transaction.type === 'deposit' ? 'bg-green-500' : 
                            transaction.type === 'withdrawal' ? 'bg-red-500' : 'bg-blue-500'
                          }`}>
                            {transaction.type === 'deposit' ? '⬇️' : 
                             transaction.type === 'withdrawal' ? '⬆️' : '🔄'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 capitalize">{transaction.type}</p>
                            <p className="text-sm text-gray-600">{transaction.description}</p>
                            <p className="text-xs text-gray-500">{new Date(transaction.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${
                            transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'deposit' ? '+' : '-'}
                            {transaction.amount.toLocaleString()} {transaction.currency}
                          </p>
                          <p className="text-xs text-gray-500">{transaction.reference}</p>
                        </div>
                      </div>
                    ))}

                    {(!selectedCustomer.transactions || selectedCustomer.transactions.length === 0) && (
                      <div className="text-center py-8">
                        <div className="text-gray-400 text-4xl mb-2">📊</div>
                        <p className="text-gray-500">No transactions yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                <div className="text-gray-400 text-6xl mb-4">👤</div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">Select a Customer</h3>
                <p className="text-gray-500">Choose a customer from the list to view details and manage their account</p>
              </div>
            )}
          </div>
        </div>

        {/* Transaction Form Modal */}
        {showTransactionForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
              <h3 className="text-xl font-semibold mb-4">Add New Transaction</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
                  <select
                    value={newTransaction.type}
                    onChange={(e) => setNewTransaction({...newTransaction, type: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="deposit">💰 Deposit</option>
                    <option value="withdrawal">💸 Withdrawal</option>
                    <option value="transfer">🔄 Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <select
                    value={newTransaction.currency}
                    onChange={(e) => setNewTransaction({...newTransaction, currency: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    {currencies.map(currency => (
                      <option key={currency} value={currency}>{currency}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={newTransaction.amount}
                    onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    placeholder="Transaction description"
                    value={newTransaction.description}
                    onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                  <input
                    placeholder="Reference number"
                    value={newTransaction.reference}
                    onChange={(e) => setNewTransaction({...newTransaction, reference: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowTransactionForm(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={addTransaction}
                  disabled={!newTransaction.amount || !selectedCustomer}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  Add Transaction
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mock SMS Sender */}
        {showSMS && (
          <MockSMSSender
            phoneNumber={smsData.phoneNumber}
            message={smsData.message}
            onSent={() => {
              setShowSMS(false);
              setSmsData({});
            }}
          />
        )}
      </div>
    </div>
  );
};

export default CustomerAccounts;