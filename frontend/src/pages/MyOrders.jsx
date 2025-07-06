// src/pages/MyOrders.jsx - Complete version
import React, { useState, useEffect } from 'react';

const MyOrders = () => {
  const [myOrders, setMyOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [editingOrder, setEditingOrder] = useState(null);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    loadMyOrders();
  }, []);

  const loadMyOrders = () => {
    const saved = JSON.parse(localStorage.getItem('my_p2p_orders') || '[]');
    setMyOrders(saved);
  };

  const cancelOrder = (orderId) => {
    const updated = myOrders.map(order =>
      order.id === orderId ? { ...order, status: 'cancelled' } : order
    );
    setMyOrders(updated);
    localStorage.setItem('my_p2p_orders', JSON.stringify(updated));
  };

  const saveEdit = () => {
    const updated = myOrders.map(order =>
      order.id === editingOrder ? { ...order, ...editData } : order
    );
    setMyOrders(updated);
    localStorage.setItem('my_p2p_orders', JSON.stringify(updated));
    setEditingOrder(null);
    setEditData({});
  };

  const filteredOrders = myOrders.filter(order => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">📋 My P2P Orders</h1>
          <p className="text-gray-600">Manage your marketplace orders</p>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex space-x-4">
            {[
              { key: 'all', label: 'All Orders', count: myOrders.length },
              { key: 'active', label: 'Active', count: myOrders.filter(o => o.status === 'active').length },
              { key: 'completed', label: 'Completed', count: myOrders.filter(o => o.status === 'completed').length },
              { key: 'cancelled', label: 'Cancelled', count: myOrders.filter(o => o.status === 'cancelled').length }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.map(order => (
            <div key={order.id} className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">
                    {order.type.toUpperCase()} {order.amount} {order.currency}
                  </h3>
                  <p className="text-gray-600">Rate: {order.rate} IRR</p>
                  <p className="text-sm text-gray-500">Created: {new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    order.status === 'active' ? 'bg-green-100 text-green-800' :
                    order.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {order.status}
                  </span>
                  {order.status === 'active' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditingOrder(order.id);
                          setEditData({
                            rate: order.rate,
                            amount: order.amount,
                            description: order.description
                          });
                        }}
                        className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => cancelOrder(order.id)}
                        className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-700"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {editingOrder === order.id ? (
                <div className="border-t pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                      <input
                        type="number"
                        value={editData.amount}
                        onChange={(e) => setEditData({...editData, amount: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rate (IRR)</label>
                      <input
                        type="number"
                        value={editData.rate}
                        onChange={(e) => setEditData({...editData, rate: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <input
                        value={editData.description}
                        onChange={(e) => setEditData({...editData, description: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setEditingOrder(null)}
                      className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEdit}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-t pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Location</p>
                      <p className="font-medium">{order.location}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Range</p>
                      <p className="font-medium">{order.minAmount} - {order.maxAmount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Payment Methods</p>
                      <p className="font-medium">{order.paymentMethods?.join(', ')}</p>
                    </div>
                  </div>
                  {order.description && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-600">Description</p>
                      <p className="text-gray-800">{order.description}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredOrders.length === 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No orders found</h3>
            <p className="text-gray-500">Create your first P2P order to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;