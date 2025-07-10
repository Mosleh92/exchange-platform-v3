import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

const AdvancedOrderForm = ({ onOrderCreated, onCancel }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [orderType, setOrderType] = useState('limit');
  const [side, setSide] = useState('buy');
  const [currency, setCurrency] = useState('BTC');
  const [baseCurrency, setBaseCurrency] = useState('USDT');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [timeInForce, setTimeInForce] = useState('GTC');
  const [expiryTime, setExpiryTime] = useState('');
  const [ocoOrders, setOcoOrders] = useState([
    { type: 'limit', price: '', amount: '' },
    { type: 'stop', price: '', amount: '' }
  ]);

  const orderTypes = [
    { value: 'market', label: 'Market Order', description: 'Execute immediately at market price' },
    { value: 'limit', label: 'Limit Order', description: 'Execute at specified price or better' },
    { value: 'stop', label: 'Stop Order', description: 'Execute when price reaches stop level' },
    { value: 'stop_limit', label: 'Stop-Limit Order', description: 'Stop order with limit price' },
    { value: 'oco', label: 'OCO Order', description: 'One-Cancels-Other order' },
    { value: 'trailing_stop', label: 'Trailing Stop', description: 'Dynamic stop loss' }
  ];

  const timeInForceOptions = [
    { value: 'GTC', label: 'Good Till Cancel' },
    { value: 'IOC', label: 'Immediate or Cancel' },
    { value: 'FOK', label: 'Fill or Kill' },
    { value: 'GTX', label: 'Good Till Crossing' }
  ];

  const currencies = ['BTC', 'ETH', 'BNB', 'ADA', 'DOT', 'LINK', 'LTC', 'BCH'];
  const baseCurrencies = ['USDT', 'USD', 'EUR', 'BTC'];

  useEffect(() => {
    // Auto-fill prices based on current market data
    if (currency && baseCurrency) {
      fetchCurrentPrice();
    }
  }, [currency, baseCurrency]);

  const fetchCurrentPrice = async () => {
    try {
      const response = await api.get(`/api/market/price/${currency}${baseCurrency}`);
      const currentPrice = response.data.price;
      setPrice(currentPrice.toString());
      setStopPrice((currentPrice * 0.95).toFixed(8));
      setLimitPrice((currentPrice * 1.05).toFixed(8));
    } catch (error) {
      console.error('Error fetching current price:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const orderData = {
        orderType,
        side,
        currency,
        baseCurrency,
        amount: parseFloat(amount),
        timeInForce,
        ...(orderType === 'limit' && { limitPrice: parseFloat(price) }),
        ...(orderType === 'stop' && { stopPrice: parseFloat(stopPrice) }),
        ...(orderType === 'stop_limit' && { 
          stopPrice: parseFloat(stopPrice),
          limitPrice: parseFloat(limitPrice)
        }),
        ...(orderType === 'oco' && { ocoOrders }),
        ...(orderType === 'trailing_stop' && {
          trailingStop: {
            activationPrice: parseFloat(price),
            callbackRate: 1.0
          }
        }),
        ...(expiryTime && { expiryTime: new Date(expiryTime).toISOString() })
      };

      const response = await api.post('/api/advanced-orders', orderData);
      
      toast.success('Advanced order created successfully!');
      onOrderCreated(response.data.order);
      
    } catch (error) {
      console.error('Error creating advanced order:', error);
      toast.error(error.response?.data?.message || 'Error creating order');
    } finally {
      setLoading(false);
    }
  };

  const updateOcoOrder = (index, field, value) => {
    const updatedOcoOrders = [...ocoOrders];
    updatedOcoOrders[index] = { ...updatedOcoOrders[index], [field]: value };
    setOcoOrders(updatedOcoOrders);
  };

  const calculateTotalAmount = () => {
    if (orderType === 'oco') {
      return ocoOrders.reduce((sum, order) => sum + parseFloat(order.amount || 0), 0);
    }
    return parseFloat(amount || 0);
  };

  const isFormValid = () => {
    if (!amount || !currency || !baseCurrency) return false;
    
    switch (orderType) {
      case 'limit':
        return price && parseFloat(price) > 0;
      case 'stop':
        return stopPrice && parseFloat(stopPrice) > 0;
      case 'stop_limit':
        return stopPrice && limitPrice && parseFloat(stopPrice) > 0 && parseFloat(limitPrice) > 0;
      case 'oco':
        return ocoOrders.every(order => order.price && order.amount && 
          parseFloat(order.price) > 0 && parseFloat(order.amount) > 0);
      default:
        return true;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Advanced Order</h2>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Order Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            {orderTypes.map(type => (
              <div
                key={type.value}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  orderType === type.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onClick={() => setOrderType(type.value)}
              >
                <div className="font-medium text-sm">{type.label}</div>
                <div className="text-xs text-gray-500 mt-1">{type.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Basic Order Details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Side
            </label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setSide('buy')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  side === 'buy'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Buy
              </button>
              <button
                type="button"
                onClick={() => setSide('sell')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  side === 'sell'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Sell
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time in Force
            </label>
            <select
              value={timeInForce}
              onChange={(e) => setTimeInForce(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              {timeInForceOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Trading Pair */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              {currencies.map(curr => (
                <option key={curr} value={curr}>{curr}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Base Currency
            </label>
            <select
              value={baseCurrency}
              onChange={(e) => setBaseCurrency(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              {baseCurrencies.map(curr => (
                <option key={curr} value={curr}>{curr}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount ({currency})
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.00000001"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            placeholder="0.00000000"
          />
        </div>

        {/* Price Fields based on Order Type */}
        {orderType === 'limit' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Limit Price ({baseCurrency})
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              step="0.00000001"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
        )}

        {orderType === 'stop' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stop Price ({baseCurrency})
            </label>
            <input
              type="number"
              value={stopPrice}
              onChange={(e) => setStopPrice(e.target.value)}
              step="0.00000001"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
        )}

        {orderType === 'stop_limit' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stop Price ({baseCurrency})
              </label>
              <input
                type="number"
                value={stopPrice}
                onChange={(e) => setStopPrice(e.target.value)}
                step="0.00000001"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Limit Price ({baseCurrency})
              </label>
              <input
                type="number"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                step="0.00000001"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>
        )}

        {orderType === 'oco' && (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              OCO Orders
            </label>
            {ocoOrders.map((order, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">
                    {order.type === 'limit' ? 'Limit Order' : 'Stop Order'}
                  </span>
                  <span className="text-xs text-gray-500">
                    Order {index + 1}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Price ({baseCurrency})
                    </label>
                    <input
                      type="number"
                      value={order.price}
                      onChange={(e) => updateOcoOrder(index, 'price', e.target.value)}
                      step="0.00000001"
                      className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Amount ({currency})
                    </label>
                    <input
                      type="number"
                      value={order.amount}
                      onChange={(e) => updateOcoOrder(index, 'amount', e.target.value)}
                      step="0.00000001"
                      className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm"
                      placeholder="0.00000000"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Expiry Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Expiry Time (Optional)
          </label>
          <input
            type="datetime-local"
            value={expiryTime}
            onChange={(e) => setExpiryTime(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Order Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-800 mb-2">Order Summary</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Type:</span>
              <span className="font-medium">{orderTypes.find(t => t.value === orderType)?.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Side:</span>
              <span className={`font-medium ${side === 'buy' ? 'text-green-600' : 'text-red-600'}`}>
                {side.toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pair:</span>
              <span className="font-medium">{currency}/{baseCurrency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Amount:</span>
              <span className="font-medium">{calculateTotalAmount().toFixed(8)} {currency}</span>
            </div>
            {price && (
              <div className="flex justify-between">
                <span className="text-gray-600">Price:</span>
                <span className="font-medium">{parseFloat(price).toFixed(8)} {baseCurrency}</span>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={!isFormValid() || loading}
            className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Order...' : 'Create Order'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdvancedOrderForm; 