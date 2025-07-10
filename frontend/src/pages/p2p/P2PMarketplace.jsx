// frontend/src/pages/p2p/P2PMarketplace.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { 
  Search, 
  Filter, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  User, 
  Shield,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { useTenantContext } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useWebSocket } from '../../hooks/useWebSocket';
import './P2PMarketplace.css';

const P2PMarketplace = () => {
  // States
  const [orders, setOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all, buy, sell, my-orders
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    currency: 'all',
    type: 'all',
    minAmount: '',
    maxAmount: '',
    minRate: '',
    maxRate: '',
    location: 'all',
    paymentMethod: 'all'
  });

  // Hooks
  const { tenant } = useTenantContext();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const { socket, isConnected, sendMessage } = useWebSocket();

  // Form validation schema
  const createOrderSchema = Yup.object({
    type: Yup.string().required('نوع معامله الزامی است'),
    currency: Yup.string().required('نوع ارز الزامی است'),
    amount: Yup.number()
      .positive('مقدار باید مثبت باشد')
      .required('مقدار الزامی است'),
    rate: Yup.number()
      .positive('نرخ باید مثبت باشد')
      .required('نرخ الزامی است'),
    minOrderAmount: Yup.number()
      .positive('حداقل سفارش باید مثبت باشد')
      .max(Yup.ref('amount'), 'حداقل سفارش نمی‌تواند بیشتر از کل مقدار باشد'),
    maxOrderAmount: Yup.number()
      .positive('حداکثر سفارش باید مثبت باشد')
      .min(Yup.ref('minOrderAmount'), 'حداکثر سفارش نمی‌تواند کمتر از حداقل باشد')
      .max(Yup.ref('amount'), 'حداکثر سفارش نمی‌تواند بیشتر از کل مقدار باشد'),
    paymentMethods: Yup.array().min(1, 'حداقل یک روش پرداخت انتخاب کنید'),
    timeLimit: Yup.number().positive('مهلت زمانی باید مثبت باشد').required('مهلت زمانی الزامی است'),
    description: Yup.string().max(500, 'توضیحات نمی‌تواند بیشتر از 500 کاراکتر باشد')
  });

  // Create order form
  const createOrderForm = useFormik({
    initialValues: {
      type: 'sell',
      currency: 'USD',
      amount: '',
      rate: '',
      minOrderAmount: '',
      maxOrderAmount: '',
      paymentMethods: [],
      timeLimit: 30,
      description: '',
      isPrivate: false,
      autoReply: '',
      terms: ''
    },
    validationSchema: createOrderSchema,
    onSubmit: async (values, { resetForm }) => {
      try {
        const orderData = {
          ...values,
          tenantId: tenant.id,
          publisherId: user.id,
          publisherName: user.name,
          publisherRating: user.rating || 0,
          status: 'active',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        };

        const response = await fetch('/api/p2p/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'X-Tenant-ID': tenant.id
          },
          body: JSON.stringify(orderData)
        });

        if (response.ok) {
          const newOrder = await response.json();
          setMyOrders(prev => [newOrder, ...prev]);
          
          // Send real-time update
          if (isConnected) {
            sendMessage({
              type: 'new_p2p_order',
              data: newOrder
            });
          }

          showNotification({
            type: 'success',
            message: 'آگهی با موفقیت ثبت شد',
            details: `شناسه آگهی: ${newOrder.id}`
          });

          resetForm();
          setShowCreateForm(false);
        } else {
          throw new Error('خطا در ثبت آگهی');
        }
      } catch (error) {
        showNotification({
          type: 'error',
          message: 'خطا در ثبت آگهی',
          details: error.message
        });
      }
    }
  });

  // WebSocket message handler
  const handleWebSocketMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'new_p2p_order':
          if (data.payload.publisherId !== user.id) {
            setOrders(prev => [data.payload, ...prev]);
          }
          break;
          
        case 'order_updated':
          setOrders(prev => prev.map(order => 
            order.id === data.payload.id ? { ...order, ...data.payload } : order
          ));
          setMyOrders(prev => prev.map(order => 
            order.id === data.payload.id ? { ...order, ...data.payload } : order
          ));
          break;
          
        case 'order_removed':
          setOrders(prev => prev.filter(order => order.id !== data.payload.orderId));
          setMyOrders(prev => prev.filter(order => order.id !== data.payload.orderId));
          break;
          
        case 'trade_request':
          if (data.payload.sellerId === user.id || data.payload.buyerId === user.id) {
            showNotification({
              type: 'info',
              message: 'درخواست معامله جدید',
              details: `کاربر ${data.payload.requesterName} درخواست معامله کرده است`
            });
          }
          break;
          
        default:
          break;
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }, [user.id, showNotification]);

  // Load initial data
  useEffect(() => {
    loadP2POrders();
  }, []);

  // WebSocket setup
  useEffect(() => {
    if (socket) {
      socket.addEventListener('message', handleWebSocketMessage);
      
      // Subscribe to P2P updates
      sendMessage({
        type: 'subscribe',
        channel: 'p2p_marketplace',
        tenantId: tenant.id
      });
    }

    return () => {
      if (socket) {
        socket.removeEventListener('message', handleWebSocketMessage);
      }
    };
  }, [socket, handleWebSocketMessage, tenant.id, sendMessage]);

  // Load P2P orders
  const loadP2POrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/p2p/orders', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Tenant-ID': tenant.id
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
        setMyOrders(data.myOrders || []);
      }
    } catch (error) {
      showNotification({
        type: 'error',
        message: 'خطا در بارگیری آگهی‌ها',
        details: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  // Request trade
  const requestTrade = async (orderId, requestAmount) => {
    try {
      const response = await fetch(`/api/p2p/orders/${orderId}/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Tenant-ID': tenant.id
        },
        body: JSON.stringify({
          requestAmount,
          message: 'درخواست معامله'
        })
      });

      if (response.ok) {
        const result = await response.json();
        showNotification({
          type: 'success',
          message: 'درخواست معامله ارسال شد',
          details: `شماره درخواست: ${result.requestId}`
        });
      }
    } catch (error) {
      showNotification({
        type: 'error',
        message: 'خطا در ارسال درخواست',
        details: error.message
      });
    }
  };

  // Cancel order
  const cancelOrder = async (orderId) => {
    try {
      const response = await fetch(`/api/p2p/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Tenant-ID': tenant.id
        }
      });

      if (response.ok) {
        setMyOrders(prev => prev.filter(order => order.id !== orderId));
        showNotification({
          type: 'success',
          message: 'آگهی لغو شد'
        });
      }
    } catch (error) {
      showNotification({
        type: 'error',
        message: 'خطا در لغو آگهی',
        details: error.message
      });
    }
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    // Search filter
    if (searchTerm && !order.publisherName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !order.currency.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !order.description.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Type filter
    if (filters.type !== 'all' && order.type !== filters.type) return false;
    
    // Currency filter
    if (filters.currency !== 'all' && order.currency !== filters.currency) return false;
    
    // Amount filters
    if (filters.minAmount && order.amount < parseFloat(filters.minAmount)) return false;
    if (filters.maxAmount && order.amount > parseFloat(filters.maxAmount)) return false;
    
    // Rate filters
    if (filters.minRate && order.rate < parseFloat(filters.minRate)) return false;
    if (filters.maxRate && order.rate > parseFloat(filters.maxRate)) return false;

    return true;
  });

  // Get orders based on active tab
  const getDisplayOrders = () => {
    switch (activeTab) {
      case 'buy':
        return filteredOrders.filter(order => order.type === 'buy');
      case 'sell':
        return filteredOrders.filter(order => order.type === 'sell');
      case 'my-orders':
        return myOrders;
      default:
        return filteredOrders;
    }
  };

  const displayOrders = getDisplayOrders();

  // Payment methods options
  const paymentMethodOptions = [
    { value: 'bank_transfer', label: 'انتقال بانکی' },
    { value: 'cash', label: 'نقدی' },
    { value: 'card_to_card', label: 'کارت به کارت' },
    { value: 'wallet', label: 'کیف پول' },
    { value: 'cheque', label: 'چک' }
  ];

  // Currency options
  const currencyOptions = [
    { value: 'USD', label: 'دلار آمریکا', symbol: '$' },
    { value: 'EUR', label: 'یورو', symbol: '€' },
    { value: 'AED', label: 'درهم امارات', symbol: 'د.إ' },
    { value: 'TRY', label: 'لیر ترکیه', symbol: '₺' },
    { value: 'CAD', label: 'دلار کانادا', symbol: 'C$' }
  ];

  return (
    <div className="p2p-marketplace">
      {/* Header */}
      <div className="p2p-header">
        <div className="header-content">
          <div className="title-section">
            <h1>بازار P2P</h1>
            <p>خرید و فروش مستقیم ارز با سایر کاربران</p>
          </div>
          
          <div className="header-actions">
            <div className="connection-status">
              <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
                <div className="status-dot"></div>
                <span>{isConnected ? 'آنلاین' : 'آفلاین'}</span>
              </div>
            </div>
            
            <button 
              className="create-order-btn"
              onClick={() => setShowCreateForm(true)}
              disabled={!user}
            >
              <Plus size={20} />
              ثبت آگهی
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="p2p-stats">
          <div className="stat-card">
            <div className="stat-value">{orders.length}</div>
            <div className="stat-label">آگهی فعال</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{myOrders.length}</div>
            <div className="stat-label">آگهی‌های من</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{orders.filter(o => o.type === 'buy').length}</div>
            <div className="stat-label">آگهی خرید</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{orders.filter(o => o.type === 'sell').length}</div>
            <div className="stat-label">آگهی فروش</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="search-filters-section">
        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            placeholder="جستجو در آگهی‌ها..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filters">
          <select 
            value={filters.currency} 
            onChange={(e) => setFilters({...filters, currency: e.target.value})}
          >
            <option value="all">همه ارزها</option>
            {currencyOptions.map(curr => (
              <option key={curr.value} value={curr.value}>{curr.label}</option>
            ))}
          </select>

          <select 
            value={filters.type} 
            onChange={(e) => setFilters({...filters, type: e.target.value})}
          >
            <option value="all">همه نوع‌ها</option>
            <option value="buy">خرید</option>
            <option value="sell">فروش</option>
          </select>

          <input
            type="number"
            placeholder="حداقل مقدار"
            value={filters.minAmount}
            onChange={(e) => setFilters({...filters, minAmount: e.target.value})}
          />

          <input
            type="number"
            placeholder="حداکثر مقدار"
            value={filters.maxAmount}
            onChange={(e) => setFilters({...filters, maxAmount: e.target.value})}
          />

          <button className="filter-btn">
            <Filter size={16} />
            فیلتر
          </button>

          <button className="refresh-btn" onClick={loadP2POrders}>
            <RefreshCw size={16} />
            بروزرسانی
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="p2p-tabs">
        <button 
          className={`tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          همه آگهی‌ها ({filteredOrders.length})
        </button>
        <button 
          className={`tab ${activeTab === 'buy' ? 'active' : ''}`}
          onClick={() => setActiveTab('buy')}
        >
          <TrendingUp size={16} />
          خرید ({filteredOrders.filter(o => o.type === 'buy').length})
        </button>
        <button 
          className={`tab ${activeTab === 'sell' ? 'active' : ''}`}
          onClick={() => setActiveTab('sell')}
        >
          <TrendingDown size={16} />
          فروش ({filteredOrders.filter(o => o.type === 'sell').length})
        </button>
        <button 
          className={`tab ${activeTab === 'my-orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-orders')}
        >
          <User size={16} />
          آگهی‌های من ({myOrders.length})
        </button>
      </div>

      {/* Orders List */}
      <div className="orders-container">
        {loading ? (
          <div className="loading-state">
            <RefreshCw className="loading-icon" size={24} />
            <span>در حال بارگیری...</span>
          </div>
        ) : displayOrders.length === 0 ? (
          <div className="empty-state">
            <AlertCircle size={48} />
            <h3>آگهی موجود نیست</h3>
            <p>
              {activeTab === 'my-orders' 
                ? 'شما هنوز آگهی ثبت نکرده‌اید' 
                : 'هیچ آگهی‌ای با فیلترهای انتخابی یافت نشد'
              }
            </p>
            {activeTab !== 'my-orders' && (
              <button 
                className="create-first-order-btn"
                onClick={() => setShowCreateForm(true)}
              >
                اولین آگهی را ثبت کنید
              </button>
            )}
          </div>
        ) : (
          <div className="orders-grid">
            {displayOrders.map(order => (
              <OrderCard 
                key={order.id}
                order={order}
                isMyOrder={activeTab === 'my-orders'}
                onRequestTrade={requestTrade}
                onCancel={cancelOrder}
                onViewDetails={(order) => {
                  setSelectedOrder(order);
                  setShowOrderDetails(true);
                }}
                currentUserId={user?.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Order Modal */}
      {showCreateForm && (
        <CreateOrderModal
          form={createOrderForm}
          paymentMethodOptions={paymentMethodOptions}
          currencyOptions={currencyOptions}
          onClose={() => {
            setShowCreateForm(false);
            createOrderForm.resetForm();
          }}
        />
      )}

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setShowOrderDetails(false)}
          onRequestTrade={requestTrade}
          currentUserId={user?.id}
        />
      )}
    </div>
  );
};

// Order Card Component
const OrderCard = ({ order, isMyOrder, onRequestTrade, onCancel, onViewDetails, currentUserId }) => {
  const [requestAmount, setRequestAmount] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);

  const getCurrencySymbol = (currency) => {
    const symbols = {
      'USD': '$',
      'EUR': '€',
      'AED': 'د.إ',
      'TRY': '₺',
      'CAD': 'C$'
    };
    return symbols[currency] || currency;
  };

  const handleRequestTrade = () => {
    if (requestAmount && parseFloat(requestAmount) >= order.minOrderAmount && parseFloat(requestAmount) <= order.maxOrderAmount) {
      onRequestTrade(order.id, parseFloat(requestAmount));
      setShowRequestForm(false);
      setRequestAmount('');
    }
  };

  return (
    <div className={`order-card ${order.type} ${isMyOrder ? 'my-order' : ''}`}>
      <div className="order-header">
        <div className="order-type-badge">
          <span className={`badge ${order.type}`}>
            {order.type === 'buy' ? (
              <>
                <TrendingUp size={14} />
                خرید
              </>
            ) : (
              <>
                <TrendingDown size={14} />
                فروش
              </>
            )}
          </span>
          <span className="currency">{order.currency}</span>
        </div>
        
        <div className="order-actions">
          {!isMyOrder && (
            <button 
              className="view-details-btn"
              onClick={() => onViewDetails(order)}
            >
              <Eye size={14} />
            </button>
          )}
          
          {isMyOrder && (
            <button 
              className="cancel-btn"
              onClick={() => onCancel(order.id)}
            >
              لغو
            </button>
          )}
        </div>
      </div>

      <div className="order-details">
        <div className="amount-rate">
          <div className="amount">
            <span className="label">مقدار:</span>
            <span className="value">{order.amount.toLocaleString()} {order.currency}</span>
          </div>
          <div className="rate">
            <span className="label">نرخ:</span>
            <span className="value">{order.rate.toLocaleString()} تومان</span>
          </div>
        </div>

        <div className="total-limits">
          <div className="total">
            <span className="label">کل:</span>
            <span className="value">{(order.amount * order.rate).toLocaleString()} تومان</span>
          </div>
          <div className="limits">
            <span className="label">محدوده:</span>
            <span className="value">
              {order.minOrderAmount.toLocaleString()} - {order.maxOrderAmount.toLocaleString()} {order.currency}
            </span>
          </div>
        </div>

        <div className="payment-methods">
          <span className="label">روش پرداخت:</span>
          <div className="methods">
            {order.paymentMethods.slice(0, 2).map((method, index) => (
              <span key={index} className="method-tag">{method}</span>
            ))}
            {order.paymentMethods.length > 2 && (
              <span className="more-methods">+{order.paymentMethods.length - 2}</span>
            )}
          </div>
        </div>

        {order.description && (
          <div className="description">
            <p>{order.description}</p>
          </div>
        )}
      </div>

      <div className="order-footer">
        <div className="publisher-info">
          <div className="publisher">
            <User size={14} />
            <span>{order.publisherName}</span>
          </div>
          <div className="publisher-rating">
            <span className="rating">{order.publisherRating || 0}/5</span>
          </div>
        </div>

        <div className="time-info">
          <Clock size={12} />
          <span>{order.timeLimit} دقیقه</span>
        </div>

        {!isMyOrder && order.publisherId !== currentUserId && (
          <div className="trade-section">
            {!showRequestForm ? (
              <button 
                className="trade-btn"
                onClick={() => setShowRequestForm(true)}
              >
                معامله
              </button>
            ) : (
              <div className="request-form">
                <input
                  type="number"
                  placeholder={`${order.minOrderAmount}-${order.maxOrderAmount}`}
                  value={requestAmount}
                  onChange={(e) => setRequestAmount(e.target.value)}
                  min={order.minOrderAmount}
                  max={order.maxOrderAmount}
                />
                <button onClick={handleRequestTrade}>تأیید</button>
                <button onClick={() => setShowRequestForm(false)}>لغو</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Create Order Modal Component
const CreateOrderModal = ({ form, paymentMethodOptions, currencyOptions, onClose }) => {
  const togglePaymentMethod = (method) => {
    const current = form.values.paymentMethods;
    const updated = current.includes(method)
      ? current.filter(m => m !== method)
      : [...current, method];
    form.setFieldValue('paymentMethods', updated);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content create-order-modal">
        <div className="modal-header">
          <h2>ثبت آگهی جدید</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={form.handleSubmit} className="create-order-form">
          <div className="form-section">
            <h3>نوع معامله</h3>
            <div className="radio-group">
              <label className={`radio-option ${form.values.type === 'buy' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="type"
                  value="buy"
                  checked={form.values.type === 'buy'}
                  onChange={form.handleChange}
                />
                <TrendingUp size={16} />
                می‌خواهم بخرم
              </label>
              <label className={`radio-option ${form.values.type === 'sell' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="type"
                  value="sell"
                  checked={form.values.type === 'sell'}
                  onChange={form.handleChange}
                />
                <TrendingDown size={16} />
                می‌خواهم بفروشم
              </label>
            </div>
          </div>

          <div className="form-section">
            <h3>جزئیات آگهی</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>نوع ارز</label>
                <select
                  name="currency"
                  value={form.values.currency}
                  onChange={form.handleChange}
                  onBlur={form.handleBlur}
                >
                  {currencyOptions.map(curr => (
                    <option key={curr.value} value={curr.value}>{curr.label}</option>
                  ))}
                </select>
                {form.touched.currency && form.errors.currency && (
                  <div className="error">{form.errors.currency}</div>
                )}
              </div>

              <div className="form-group">
                <label>مقدار کل</label>
                <input
                  type="number"
                  name="amount"
                  value={form.values.amount}
                  onChange={form.handleChange}
                  onBlur={form.handleBlur}
                  placeholder="مقدار ارز"
                />
                {form.touched.amount && form.errors.amount && (
                  <div className="error">{form.errors.amount}</div>
                )}
              </div>

              <div className="form-group">
                <label>نرخ (تومان)</label>
                <input
                  type="number"
                  name="rate"
                  value={form.values.rate}
                  onChange={form.handleChange}
                  onBlur={form.handleBlur}
                  placeholder="نرخ هر واحد"
                />
                {form.touched.rate && form.errors.rate && (
                  <div className="error">{form.errors.rate}</div>
                )}
              </div>

              <div className="form-group">
                <label>حداقل سفارش</label>
                <input
                  type="number"
                  name="minOrderAmount"
                  value={form.values.minOrderAmount}
                  onChange={form.handleChange}
                  onBlur={form.handleBlur}
                  placeholder="حداقل مقدار سفارش"
                />
                {form.touched.minOrderAmount && form.errors.minOrderAmount && (
                  <div className="error">{form.errors.minOrderAmount}</div>
                )}
              </div>

              <div className="form-group">
                <label>حداکثر سفارش</label>
                <input
                  type="number"
                  name="maxOrderAmount"
                  value={form.values.maxOrderAmount}
                  onChange={form.handleChange}
                  onBlur={form.handleBlur}
                  placeholder="حداکثر مقدار سفارش"
                />
                {form.touched.maxOrderAmount && form.errors.maxOrderAmount && (
                  <div className="error">{form.errors.maxOrderAmount}</div>
                )}
              </div>

              <div className="form-group">
                <label>مهلت زمانی (دقیقه)</label>
                <select
                  name="timeLimit"
                  value={form.values.timeLimit}
                  onChange={form.handleChange}
                >
                  <option value={15}>15 دقیقه</option>
                  <option value={30}>30 دقیقه</option>
                  <option value={60}>1 ساعت</option>
                  <option value={120}>2 ساعت</option>
                </select>
              </div>
            </div>

            {form.values.amount && form.values.rate && (
              <div className="total-display">
                <strong>مبلغ کل: {(form.values.amount * form.values.rate).toLocaleString()} تومان</strong>
              </div>
            )}
          </div>

          <div className="form-section">
            <h3>روش‌های پرداخت</h3>
            <div className="payment-methods-grid">
              {paymentMethodOptions.map(method => (
                <label 
                  key={method.value} 
                  className={`payment-method-option ${form.values.paymentMethods.includes(method.value) ? 'selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={form.values.paymentMethods.includes(method.value)}
                    onChange={() => togglePaymentMethod(method.value)}
                  />
                  <span>{method.label}</span>
                  <CheckCircle size={16} className="check-icon" />
                </label>
              ))}
            </div>
            {form.touched.paymentMethods && form.errors.paymentMethods && (
              <div className="error">{form.errors.paymentMethods}</div>
            )}
          </div>

          <div className="form-section">
            <h3>تنظیمات اضافی</h3>
            <div className="form-group">
              <label>توضیحات (اختیاری)</label>
              <textarea
                name="description"
                value={form.values.description}
                onChange={form.handleChange}
                onBlur={form.handleBlur}
                placeholder="توضیحات اضافی برای آگهی..."
                rows="3"
              />
              {form.touched.description && form.errors.description && (
                <div className="error">{form.errors.description}</div>
              )}
            </div>

            <div className="form-group">
              <label>شرایط معامله (اختیاری)</label>
              <textarea
                name="terms"
                value={form.values.terms}
                onChange={form.handleChange}
                placeholder="شرایط خاص برای معامله..."
                rows="2"
              />
            </div>

            <div className="checkbox-group">
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  name="isPrivate"
                  checked={form.values.isPrivate}
                  onChange={form.handleChange}
                />
                <span>آگهی خصوصی (فقط برای کاربران تأیید شده)</span>
              </label>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              انصراف
            </button>
            <button type="submit" className="submit-btn" disabled={form.isSubmitting}>
              {form.isSubmitting ? 'در حال ثبت...' : 'ثبت آگهی'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Order Details Modal Component
const OrderDetailsModal = ({ order, onClose, onRequestTrade, currentUserId }) => {
  const [requestAmount, setRequestAmount] = useState('');

  const getCurrencySymbol = (currency) => {
    const symbols = {
      'USD': '$',
      'EUR': '€',
      'AED': 'د.إ',
      'TRY': '₺',
      'CAD': 'C$'
    };
    return symbols[currency] || currency;
  };

  const handleRequestTrade = () => {
    if (requestAmount && parseFloat(requestAmount) >= order.minOrderAmount && parseFloat(requestAmount) <= order.maxOrderAmount) {
      onRequestTrade(order.id, parseFloat(requestAmount));
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content order-details-modal">
        <div className="modal-header">
          <h2>جزئیات آگهی</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="order-details-content">
          <div className="order-summary">
            <div className="order-type-section">
              <span className={`order-type-badge ${order.type}`}>
                {order.type === 'buy' ? (
                  <>
                    <TrendingUp size={16} />
                    خرید {order.currency}
                  </>
                ) : (
                  <>
                    <TrendingDown size={16} />
                    فروش {order.currency}
                  </>
                )}
              </span>
            </div>

            <div className="amount-rate-section">
              <div className="detail-item">
                <span className="label">مقدار کل:</span>
                <span className="value">{order.amount.toLocaleString()} {order.currency}</span>
              </div>
              <div className="detail-item">
                <span className="label">نرخ:</span>
                <span className="value">{order.rate.toLocaleString()} تومان</span>
              </div>
              <div className="detail-item">
                <span className="label">مبلغ کل:</span>
                <span className="value highlight">{(order.amount * order.rate).toLocaleString()} تومان</span>
              </div>
            </div>

            <div className="limits-section">
              <div className="detail-item">
                <span className="label">حداقل سفارش:</span>
                <span className="value">{order.minOrderAmount.toLocaleString()} {order.currency}</span>
              </div>
              <div className="detail-item">
                <span className="label">حداکثر سفارش:</span>
                <span className="value">{order.maxOrderAmount.toLocaleString()} {order.currency}</span>
              </div>
              <div className="detail-item">
                <span className="label">مهلت زمانی:</span>
                <span className="value">{order.timeLimit} دقیقه</span>
              </div>
            </div>
          </div>

          <div className="payment-methods-section">
            <h3>روش‌های پرداخت</h3>
            <div className="payment-methods-list">
              {order.paymentMethods.map((method, index) => (
                <span key={index} className="payment-method-tag">
                  {method}
                </span>
              ))}
            </div>
          </div>

          {order.description && (
            <div className="description-section">
              <h3>توضیحات</h3>
              <p>{order.description}</p>
            </div>
          )}

          {order.terms && (
            <div className="terms-section">
              <h3>شرایط معامله</h3>
              <p>{order.terms}</p>
            </div>
          )}

          <div className="publisher-section">
            <h3>اطلاعات آگهی‌دهنده</h3>
            <div className="publisher-info">
              <div className="publisher-details">
                <div className="publisher-name">
                  <User size={16} />
                  <span>{order.publisherName}</span>
                </div>
                <div className="publisher-rating">
                  <span>امتیاز: {order.publisherRating || 0}/5</span>
                </div>
              </div>
              <div className="publisher-stats">
                <span>تعداد معاملات: {order.publisherTradeCount || 0}</span>
                <span>نرخ موفقیت: {order.publisherSuccessRate || 0}%</span>
              </div>
            </div>
          </div>

          {order.publisherId !== currentUserId && (
            <div className="trade-request-section">
              <h3>درخواست معامله</h3>
              <div className="trade-request-form">
                <div className="amount-input">
                  <label>مقدار درخواستی ({order.currency})</label>
                  <input
                    type="number"
                    value={requestAmount}
                    onChange={(e) => setRequestAmount(e.target.value)}
                    min={order.minOrderAmount}
                    max={order.maxOrderAmount}
                    placeholder={`${order.minOrderAmount} - ${order.maxOrderAmount}`}
                  />
                  <span className="hint">
                    محدوده: {order.minOrderAmount.toLocaleString()} - {order.maxOrderAmount.toLocaleString()} {order.currency}
                  </span>
                </div>

                {requestAmount && (
                  <div className="trade-summary">
                    <div className="summary-item">
                      <span>مقدار:</span>
                      <span>{parseFloat(requestAmount).toLocaleString()} {order.currency}</span>
                    </div>
                    <div className="summary-item">
                      <span>مبلغ قابل پرداخت:</span>
                      <span>{(parseFloat(requestAmount) * order.rate).toLocaleString()} تومان</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose}>
            بستن
          </button>
          {order.publisherId !== currentUserId && (
            <button 
              className="trade-btn"
              onClick={handleRequestTrade}
              disabled={!requestAmount || parseFloat(requestAmount) < order.minOrderAmount || parseFloat(requestAmount) > order.maxOrderAmount}
            >
              ارسال درخواست معامله
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default P2PMarketplace;
