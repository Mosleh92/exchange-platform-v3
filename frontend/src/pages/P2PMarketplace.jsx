// src/pages/P2PMarketplace.jsx - Enhanced version
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const P2PMarketplace = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [p2pEnabled, setP2pEnabled] = useState(false);
  const [filters, setFilters] = useState({
    currency: '',
    type: '',
    location: '',
    minAmount: '',
    maxAmount: ''
  });

  const [newOrder, setNewOrder] = useState({
    type: 'buy',
    currency: 'USD',
    amount: '',
    rate: '',
    minAmount: '',
    maxAmount: '',
    location: '',
    paymentMethods: [],
    description: '',
    validUntil: ''
  });

  const [exchangerProfile, setExchangerProfile] = useState({
    alias: 'Exchange_Tehran_001',
    location: 'Tehran, Iran',
    rating: 4.8,
    completedTrades: 145,
    languages: ['Persian', 'English'],
    activeHours: '09:00 - 21:00'
  });

  const currencies = ['USD', 'AED', 'EUR', 'CNY', 'TRY', 'CAD', 'GBP'];
  const paymentMethods = ['Cash', 'Bank Transfer', 'Card', 'Mobile Payment', 'Crypto'];

  useEffect(() => {
    loadP2PSettings();
    if (p2pEnabled) {
      loadOrders();
    }
  }, [p2pEnabled]);

  useEffect(() => {
    filterOrders();
  }, [orders, filters]);

  const loadP2PSettings = () => {
    const enabled = localStorage.getItem('p2p_enabled') === 'true';
    setP2pEnabled(enabled);
  };

  const toggleP2P = () => {
    const newState = !p2pEnabled;
    setP2pEnabled(newState);
    localStorage.setItem('p2p_enabled', newState.toString());
    
    if (newState) {
      loadOrders();
    }
  };

  const loadOrders = () => {
    // Simulate loading orders from other exchangers
    const mockOrders = [
      {
        id: 'P2P001',
        exchangerId: 'exchanger_dubai_001',
        exchangerAlias: 'Dubai_Exchange_Pro',
        type: 'sell',
        currency: 'AED',
        amount: 50000,
        rate: 91800,
        minAmount: 5000,
        maxAmount: 50000,
        location: 'Dubai, UAE',
        paymentMethods: ['Cash', 'Bank Transfer'],
        description: 'Quick cash exchange in Dubai Marina',
        rating: 4.9,
        completedTrades: 234,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: 'active'
      },
      {
        id: 'P2P002',
        exchangerId: 'exchanger_istanbul_001',
        exchangerAlias: 'Istanbul_Currency_Hub',
        type: 'buy',
        currency: 'TRY',
        amount: 100000,
        rate: 1750,
        minAmount: 10000,
        maxAmount: 100000,
        location: 'Istanbul, Turkey',
        paymentMethods: ['Bank Transfer', 'Card'],
        description: 'Looking for Turkish Lira in Istanbul',
        rating: 4.7,
        completedTrades: 189,
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        validUntil: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        status: 'active'
      },
      {
        id: 'P2P003',
        exchangerId: 'exchanger_beijing_001',
        exchangerAlias: 'Beijing_Money_Exchange',
        type: 'sell',
        currency: 'CNY',
        amount: 80000,
        rate: 13200,
        minAmount: 5000,
        maxAmount: 80000,
        location: 'Beijing, China',
        paymentMethods: ['Mobile Payment', 'Bank Transfer'],
        description: 'Chinese Yuan available in Beijing',
        rating: 4.6,
        completedTrades: 167,
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        validUntil: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
        status: 'active'
      }
    ];

    setOrders(mockOrders);
    
    // Load my orders
    const savedMyOrders = JSON.parse(localStorage.getItem('my_p2p_orders') || '[]');
    setMyOrders(savedMyOrders);
  };

  const filterOrders = () => {
    let filtered = orders.filter(order => order.status === 'active');

    if (filters.currency) {
      filtered = filtered.filter(order => order.currency === filters.currency);
    }
    if (filters.type) {
      filtered = filtered.filter(order => order.type === filters.type);
    }
    if (filters.location) {
      filtered = filtered.filter(order => 
        order.location.toLowerCase().includes(filters.location.toLowerCase())
      );
    }
    if (filters.minAmount) {
      filtered = filtered.filter(order => order.amount >= parseFloat(filters.minAmount));
    }
    if (filters.maxAmount) {
      filtered = filtered.filter(order => order.amount <= parseFloat(filters.maxAmount));
    }

    setFilteredOrders(filtered);
  };

  const createOrder = () => {
    const order = {
      id: `P2P${Date.now()}`,
      exchangerId: 'current_user',
      exchangerAlias: exchangerProfile.alias,
      ...newOrder,
      amount: parseFloat(newOrder.amount),
      rate: parseFloat(newOrder.rate),
      minAmount: parseFloat(newOrder.minAmount),
      maxAmount: parseFloat(newOrder.maxAmount),
      rating: exchangerProfile.rating,
      completedTrades: exchangerProfile.completedTrades,
      createdAt: new Date().toISOString(),
      validUntil: newOrder.validUntil || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      status: 'active'
    };

    const updatedMyOrders = [...myOrders, order];
    setMyOrders(updatedMyOrders);
    localStorage.setItem('my_p2p_orders', JSON.stringify(updatedMyOrders));

    // Add to global orders (simulate posting to marketplace)
    setOrders([...orders, order]);

    setShowCreateOrder(false);
    setNewOrder({
      type: 'buy',
      currency: 'USD',
      amount: '',
      rate: '',
      minAmount: '',
      maxAmount: '',
      location: '',
      paymentMethods: [],
      description: '',
      validUntil: ''
    });
  };

  const cancelOrder = (orderId) => {
    const updatedMyOrders = myOrders.map(order =>
      order.id === orderId ? { ...order, status: 'cancelled' } : order
    );
    setMyOrders(updatedMyOrders);
    localStorage.setItem('my_p2p_orders', JSON.stringify(updatedMyOrders));

    const updatedOrders = orders.map(order =>
      order.id === orderId ? { ...order, status: 'cancelled' } : order
    );
    setOrders(updatedOrders);
  };

  if (!p2pEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="text-6xl mb-6">🔗</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">P2P Marketplace</h1>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Connect with other exchangers worldwide. Trade currencies directly with verified exchange partners. 
              Enable P2P marketplace to start trading with other exchangers in our network.
            </p>
            
            <div className="bg-blue-50 rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-blue-800 mb-3">P2P Marketplace Benefits:</h3>
              <ul className="text-left text-blue-700 space-y-2 max-w-md mx-auto">
                <li className="flex items-center">✅ Trade with 2000+ verified exchangers</li>
                <li className="flex items-center">✅ Access global currency markets</li>
                <li className="flex items-center">✅ Competitive exchange rates</li>
                <li className="flex items-center">✅ Secure and anonymous trading</li>
                <li className="flex items-center">✅ Multiple payment methods</li>
              </ul>
            </div>

            <button
              onClick={toggleP2P}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 text-lg"
            >
              🚀 Enable P2P Marketplace
            </button>
            
            <p className="text-sm text-gray-500 mt-4">
              You can disable this feature anytime in settings
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">🔗 P2P Marketplace</h1>
              <p className="text-gray-600">Trade currencies with other exchangers worldwide</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCreateOrder(true)}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-200"
              >
                ➕ Create Order
              </button>
              <button
                onClick={() => navigate('/my-orders')}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
              >
                📋 My Orders
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Active Orders</p>
                <p className="text-2xl font-bold text-blue-600">{filteredOrders.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">
                📊
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">My Active Orders</p>
                <p className="text-2xl font-bold text-green-600">{myOrders.filter(o => o.status === 'active').length}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl">
                ✅
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Countries</p>
                <p className="text-2xl font-bold text-purple-600">
                  {new Set(orders.map(o => o.location.split(',')[1]?.trim())).size}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-2xl">
                🌍
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Avg Rating</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {(orders.reduce((sum, o) => sum + o.rating, 0) / orders.length || 0).toFixed(1)}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center text-2xl">
                ⭐
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">🔍 Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <select
              value={filters.currency}
              onChange={(e) => setFilters({...filters, currency: e.target.value})}
              className="border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Currencies</option>
              {currencies.map(currency => (
                <option key={currency} value={currency}>{currency}</option>
              ))}
            </select>
            
            <select
              value={filters.type}
              onChange={(e) => setFilters({...filters, type: e.target.value})}
              className="border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Buy & Sell</option>
              <option value="buy">🟢 Buy Orders</option>
              <option value="sell">🔴 Sell Orders</option>
            </select>

            <input
              type="text"
              placeholder="Location"
              value={filters.location}
              onChange={(e) => setFilters({...filters, location: e.target.value})}
              className="border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            <input
              type="number"
              placeholder="Min Amount"
              value={filters.minAmount}
              onChange={(e) => setFilters({...filters, minAmount: e.target.value})}
              className="border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            <input
              type="number"
              placeholder="Max Amount"
              value={filters.maxAmount}
              onChange={(e) => setFilters({...filters, maxAmount: e.target.value})}
              className="border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            <button
              onClick={() => setFilters({currency: '', type: '', location: '', minAmount: '', maxAmount: ''})}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Orders Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredOrders.map(order => (
            <P2POrderCard key={order.id} order={order} />
          ))}
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No orders found</h3>
            <p className="text-gray-500">Try adjusting your filters or create a new order</p>
          </div>
        )}

        {/* Create Order Modal */}
        {showCreateOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-2xl font-semibold mb-6">Create P2P Order</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Order Type</label>
                    <select
                      value={newOrder.type}
                      onChange={(e) => setNewOrder({...newOrder, type: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3"
                    >
                      <option value="buy">🟢 I want to buy</option>
                      <option value="sell">🔴 I want to sell</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                    <select
                      value={newOrder.currency}
                      onChange={(e) => setNewOrder({...newOrder, currency: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3"
                    >
                      {currencies.map(currency => (
                        <option key={currency} value={currency}>{currency}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                    <input
                      type="number"
                      placeholder="10000"
                      value={newOrder.amount}
                      onChange={(e) => setNewOrder({...newOrder, amount: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Exchange Rate (IRR)</label>
                    <input
                      type="number"
                      placeholder="91500"
                      value={newOrder.rate}
                      onChange={(e) => setNewOrder({...newOrder, rate: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Amount</label>
                    <input
                      type="number"
                      placeholder="1000"
                      value={newOrder.minAmount}
                      onChange={(e) => setNewOrder({...newOrder, minAmount: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Amount</label>
                    <input
                      type="number"
                      placeholder="50000"
                      value={newOrder.maxAmount}
                      onChange={(e) => setNewOrder({...newOrder, maxAmount: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input
                      placeholder="Tehran, Iran"
                      value={newOrder.location}
                      onChange={(e) => setNewOrder({...newOrder, location: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Methods</label>
                  <div className="grid grid-cols-3 gap-2">
                    {paymentMethods.map(method => (
                      <label key={method} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newOrder.paymentMethods.includes(method)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewOrder({
                                ...newOrder,
                                paymentMethods: [...newOrder.paymentMethods, method]
                              });
                            } else {
                              setNewOrder({
                                ...newOrder,
                                paymentMethods: newOrder.paymentMethods.filter(m => m !== method)
                              });
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">{method}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    placeholder="Additional details about your order..."
                    value={newOrder.description}
                    onChange={(e) => setNewOrder({...newOrder, description: e.target.value})}
                    rows={3}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowCreateOrder(false)}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createOrder}
                    disabled={!newOrder.amount || !newOrder.rate || !newOrder.location}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
                  >
                    Create Order
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const P2POrderCard = ({ order }) => {
  const getTypeColor = (type) => {
    return type === 'buy' 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-red-100 text-red-800 border-red-200';
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getRatingStars = (rating) => {
    return '⭐'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '⭐' : '');
  };

  const timeLeft = new Date(order.validUntil) - new Date();
  const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)));

  return (
    <div className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
              {order.currency}
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">{order.exchangerAlias}</h3>
              <p className="text-sm text-gray-500">{order.location}</p>
              <div className="flex items-center text-sm text-yellow-600">
                {getRatingStars(order.rating)} {order.rating} ({order.completedTrades} trades)
              </div>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getTypeColor(order.type)}`}>
            {order.type.toUpperCase()}
          </span>
        </div>

        {/* Details */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Amount:</span>
            <span className="font-semibold">{formatNumber(order.amount)} {order.currency}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Rate:</span>
            <span className="font-semibold text-blue-600">{formatNumber(order.rate)} IRR</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Range:</span>
            <span className="text-sm">{formatNumber(order.minAmount)} - {formatNumber(order.maxAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Valid for:</span>
            <span className="text-sm text-orange-600">{hoursLeft}h remaining</span>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="mt-4">
          <p className="text-sm text-gray-600 mb-2">Payment Methods:</p>
          <div className="flex flex-wrap gap-2">
            {order.paymentMethods?.map(method => (
              <span key={method} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-lg text-xs">
                {method}
              </span>
            ))}
          </div>
        </div>

        {/* Description */}
        {order.description && (
          <div className="mt-4">
            <p className="text-sm text-gray-600">{order.description}</p>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-4 space-y-2">
          <button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200">
            💬 Contact Exchanger
          </button>
          <div className="text-center text-xs text-gray-500">
            Trading is handled outside the platform
          </div>
        </div>
      </div>
    </div>
  );
};

export default P2PMarketplace;