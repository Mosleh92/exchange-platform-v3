// frontend/src/pages/Transactions/TransactionCreate.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  ArrowLeft,
  Save,
  Plus,
  Minus,
  Upload,
  FileText,
  Image,
  X,
  Calculator,
  User,
  CreditCard,
  Building,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  Receipt,
  Banknote,
  Wallet,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Download,
  Search,
  Filter
} from 'lucide-react';
import { useTenantContext } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import './TransactionCreate.css';

const TransactionCreate = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // States
  const [currentStep, setCurrentStep] = useState(1);
  const [transactionType, setTransactionType] = useState(searchParams.get('type') || 'currency_exchange');
  const [payments, setPayments] = useState([]);
  const [exchangeRates, setExchangeRates] = useState({});
  const [bankAccounts, setBankAccounts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  
  // Hooks
  const { tenant } = useTenantContext();
  const { user } = useAuth();
  const { showNotification } = useNotification();

  // Form validation schema
  const transactionSchema = Yup.object({
    type: Yup.string().required('نوع تراکنش الزامی است'),
    
    // Customer Info
    customerType: Yup.string().required('نوع مشتری الزامی است'),
    existingCustomerId: Yup.string().when('customerType', {
      is: 'existing',
      then: Yup.string().required('انتخاب مشتری الزامی است')
    }),
    customerName: Yup.string().when('customerType', {
      is: 'new',
      then: Yup.string().required('نام مشتری الزامی است')
    }),
    customerPhone: Yup.string().when('customerType', {
      is: 'new',
      then: Yup.string().required('شماره تلفن الزامی است')
    }),
    customerEmail: Yup.string().email('ایمیل نامعتبر است'),
    
    // Transaction Details
    currency: Yup.string().required('نوع ارز الزامی است'),
    amount: Yup.number()
      .positive('مقدار باید مثبت باشد')
      .required('مقدار الزامی است'),
    rate: Yup.number()
      .positive('نرخ باید مثبت باشد')
      .required('نرخ الزامی است'),
    
    // Money Transfer specific
    recipientName: Yup.string().when('type', {
      is: 'money_transfer',
      then: Yup.string().required('نام گیرنده الزامی است')
    }),
    recipientPhone: Yup.string().when('type', {
      is: 'money_transfer',
      then: Yup.string().required('شماره تلفن گیرنده الزامی است')
    }),
    destinationBranch: Yup.string().when('type', {
      is: 'money_transfer',
      then: Yup.string().required('شعبه مقصد الزامی است')
    }),
    
    // P2P specific
    p2pOrderId: Yup.string().when('type', {
      is: 'p2p_trade',
      then: Yup.string().required('شناسه آگهی P2P الزامی است')
    }),
    
    description: Yup.string().max(500, 'توضیحات نمی‌تواند بیشتر از 500 کاراکتر باشد')
  });

  // Main form
  const transactionForm = useFormik({
    initialValues: {
      type: transactionType,
      
      // Customer
      customerType: 'new', // new, existing
      existingCustomerId: '',
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerNationalId: '',
      customerAddress: '',
      
      // Transaction
      operationType: 'buy', // buy, sell
      currency: 'USD',
      amount: '',
      rate: '',
      totalAmount: '',
      commission: '',
      finalAmount: '',
      
      // Money Transfer
      recipientName: '',
      recipientPhone: '',
      recipientNationalId: '',
      destinationBranch: '',
      destinationCountry: '',
      destinationCity: '',
      transferMethod: 'internal', // internal, external
      securityCode: '',
      
      // P2P
      p2pOrderId: '',
      p2pRate: '',
      
      // Payment
      paymentMethod: 'multiple', // cash, bank_transfer, multiple
      
      // Additional
      description: '',
      internalNotes: '',
      priority: 'normal', // low, normal, high, urgent
      expectedCompletionDate: '',
      
      // Verification
      requiresApproval: false,
      approvalReason: ''
    },
    validationSchema: transactionSchema,
    onSubmit: async (values) => {
      await handleSubmitTransaction(values);
    }
  });

  // Load initial data
  useEffect(() => {
    loadExchangeRates();
    loadBankAccounts();
    loadCustomers();
    
    // Set default rate if currency changes
    if (transactionForm.values.currency && exchangeRates[transactionForm.values.currency]) {
      transactionForm.setFieldValue('rate', exchangeRates[transactionForm.values.currency].sell);
    }
  }, [transactionForm.values.currency]);

  // Auto calculate amounts
  useEffect(() => {
    calculateAmounts();
  }, [
    transactionForm.values.amount,
    transactionForm.values.rate,
    transactionForm.values.commission,
    transactionForm.values.operationType
  ]);

  // Load exchange rates
  const loadExchangeRates = async () => {
    try {
      const response = await fetch('/api/exchange-rates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Tenant-ID': tenant.id
        }
      });
      
      if (response.ok) {
        const rates = await response.json();
        setExchangeRates(rates);
      }
    } catch (error) {
      console.error('Error loading exchange rates:', error);
    }
  };

  // Load bank accounts
  const loadBankAccounts = async () => {
    try {
      const response = await fetch('/api/bank-accounts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Tenant-ID': tenant.id
        }
      });
      
      if (response.ok) {
        const accounts = await response.json();
        setBankAccounts(accounts);
      }
    } catch (error) {
      console.error('Error loading bank accounts:', error);
    }
  };

  // Load customers
  const loadCustomers = async () => {
    try {
      const response = await fetch('/api/customers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Tenant-ID': tenant.id
        }
      });
      
      if (response.ok) {
        const customerList = await response.json();
        setCustomers(customerList);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  // Calculate amounts
  const calculateAmounts = useCallback(() => {
    const { amount, rate, commission, operationType } = transactionForm.values;
    
    if (!amount || !rate) return;
    
    setCalculating(true);
    
    setTimeout(() => {
      const numAmount = parseFloat(amount) || 0;
      const numRate = parseFloat(rate) || 0;
      const numCommission = parseFloat(commission) || 0;
      
      let totalAmount = numAmount * numRate;
      let finalAmount = totalAmount;
      
      if (operationType === 'buy') {
        finalAmount = totalAmount + numCommission;
      } else {
        finalAmount = totalAmount - numCommission;
      }
      
      transactionForm.setFieldValue('totalAmount', totalAmount.toFixed(2));
      transactionForm.setFieldValue('finalAmount', finalAmount.toFixed(2));
      
      setCalculating(false);
    }, 500);
  }, [transactionForm.values]);

  // Add payment
  const addPayment = () => {
    const newPayment = {
      id: Date.now(),
      accountId: '',
      accountName: '',
      senderName: '',
      amount: '',
      receiptFile: null,
      receiptUrl: '',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      description: '',
      status: 'pending'
    };
    setPayments([...payments, newPayment]);
  };

  // Update payment
  const updatePayment = (index, field, value) => {
    const updatedPayments = [...payments];
    updatedPayments[index][field] = value;
    setPayments(updatedPayments);
  };

  // Remove payment
  const removePayment = (index) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  // Handle file upload
  const handleFileUpload = async (file, paymentIndex) => {
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'receipt');
    
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Tenant-ID': tenant.id
        },
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        updatePayment(paymentIndex, 'receiptFile', file);
        updatePayment(paymentIndex, 'receiptUrl', result.url);
        
        showNotification({
          type: 'success',
          message: 'فایل با موفقیت آپلود شد'
        });
      }
    } catch (error) {
      showNotification({
        type: 'error',
        message: 'خطا در آپلود فایل',
        details: error.message
      });
    }
  };

  // Submit transaction
  const handleSubmitTransaction = async (values) => {
    try {
      setLoading(true);
      
      const transactionData = {
        ...values,
        payments,
        totalPaid: getTotalPaid(),
        remainingAmount: getRemainingAmount(),
        tenantId: tenant.id,
        branchId: user.branchId,
        createdBy: user.id,
        status: getRemainingAmount() <= 0 ? 'completed' : 'pending',
        createdAt: new Date().toISOString()
      };

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Tenant-ID': tenant.id
        },
        body: JSON.stringify(transactionData)
      });

      if (response.ok) {
        const result = await response.json();
        
        showNotification({
          type: 'success',
          message: 'تراکنش با موفقیت ایجاد شد',
          details: `شماره تراکنش: ${result.transactionNumber}`
        });

        navigate(`/transactions/${result.id}`);
      } else {
        throw new Error('خطا در ایجاد تراکنش');
      }
    } catch (error) {
      showNotification({
        type: 'error',
        message: 'خطا در ایجاد تراکنش',
        details: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const getTotalPaid = () => {
    return payments.reduce((total, payment) => {
      return total + (parseFloat(payment.amount) || 0);
    }, 0);
  };

  const getRemainingAmount = () => {
    const finalAmount = parseFloat(transactionForm.values.finalAmount) || 0;
    return Math.max(0, finalAmount - getTotalPaid());
  };

  // Select existing customer
  const selectExistingCustomer = (customer) => {
    transactionForm.setFieldValue('existingCustomerId', customer.id);
    transactionForm.setFieldValue('customerName', customer.name);
    transactionForm.setFieldValue('customerPhone', customer.phone);
    transactionForm.setFieldValue('customerEmail', customer.email);
    transactionForm.setFieldValue('customerNationalId', customer.nationalId);
    transactionForm.setFieldValue('customerAddress', customer.address);
    setShowCustomerSearch(false);
  };

  // Filter customers
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    customer.phone.includes(customerSearchTerm) ||
    customer.email.toLowerCase().includes(customerSearchTerm.toLowerCase())
  );

  // Transaction types
  const transactionTypes = [
    { value: 'currency_exchange', label: 'خرید/فروش ارز', icon: DollarSign },
    { value: 'money_transfer', label: 'حواله ارزی', icon: Banknote },
    { value: 'p2p_trade', label: 'معامله P2P', icon: RefreshCw },
    { value: 'account_deposit', label: 'واریز به حساب', icon: Wallet },
    { value: 'account_withdrawal', label: 'برداشت از حساب', icon: CreditCard }
  ];

  // Currency options
  const currencies = [
    { value: 'USD', label: 'دلار آمریکا', symbol: '$' },
    { value: 'EUR', label: 'یورو', symbol: '€' },
    { value: 'AED', label: 'درهم امارات', symbol: 'د.إ' },
    { value: 'TRY', label: 'لیر ترکیه', symbol: '₺' },
    { value: 'CAD', label: 'دلار کانادا', symbol: 'C$' },
    { value: 'GBP', label: 'پوند انگلیس', symbol: '£' }
  ];

  // Steps
  const steps = [
    { number: 1, title: 'نوع تراکنش', icon: FileText },
    { number: 2, title: 'اطلاعات مشتری', icon: User },
    { number: 3, title: 'جزئیات تراکنش', icon: Calculator },
    { number: 4, title: 'پرداخت‌ها', icon: CreditCard },
    { number: 5, title: 'بررسی و تأیید', icon: CheckCircle }
  ];

  return (
    <div className="transaction-create">
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <div className="header-info">
            <h1>ایجاد تراکنش جدید</h1>
            <p>ایجاد و مدیریت تراکنش‌های صرافی</p>
          </div>
        </div>
        
        <div className="header-actions">
          <button 
            className="preview-btn"
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? <EyeOff size={16} /> : <Eye size={16} />}
            {previewMode ? 'ویرایش' : 'پیش‌نمایش'}
          </button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="progress-steps">
        {steps.map((step) => (
          <div 
            key={step.number}
            className={`step ${currentStep >= step.number ? 'active' : ''} ${currentStep === step.number ? 'current' : ''}`}
          >
            <div className="step-number">
              {currentStep > step.number ? (
                <CheckCircle size={20} />
              ) : (
                <step.icon size={20} />
              )}
            </div>
            <div className="step-info">
              <div className="step-title">{step.title}</div>
            </div>
          </div>
        ))}
      </div>

      {previewMode ? (
        /* Preview Mode */
        <TransactionPreview 
          transaction={transactionForm.values}
          payments={payments}
          getTotalPaid={getTotalPaid}
          getRemainingAmount={getRemainingAmount}
          onEdit={() => setPreviewMode(false)}
          onSubmit={transactionForm.handleSubmit}
          loading={loading}
        />
      ) : (
        /* Form Mode */
        <form onSubmit={transactionForm.handleSubmit} className="transaction-form">
          {/* Step 1: Transaction Type */}
          {currentStep === 1 && (
            <div className="form-step">
              <div className="step-header">
                <h2>انتخاب نوع تراکنش</h2>
                <p>نوع عملیات مورد نظر را انتخاب کنید</p>
              </div>

              <div className="transaction-types">
                {transactionTypes.map((type) => (
                  <label
                    key={type.value}
                    className={`transaction-type-card ${transactionForm.values.type === type.value ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="type"
                      value={type.value}
                      checked={transactionForm.values.type === type.value}
                      onChange={(e) => {
                        transactionForm.handleChange(e);
                        setTransactionType(e.target.value);
                      }}
                    />
                    <div className="card-content">
                      <type.icon size={32} />
                      <h3>{type.label}</h3>
                    </div>
                  </label>
                ))}
              </div>

              <div className="step-actions">
                <button
                  type="button"
                  className="next-btn"
                  onClick={() => setCurrentStep(2)}
                  disabled={!transactionForm.values.type}
                >
                  مرحله بعد
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Customer Information */}
          {currentStep === 2 && (
            <div className="form-step">
              <div className="step-header">
                <h2>اطلاعات مشتری</h2>
                <p>اطلاعات مشتری را وارد کنید</p>
              </div>

              {/* Customer Type Selection */}
              <div className="form-section">
                <h3>نوع مشتری</h3>
                <div className="radio-group">
                  <label className={`radio-option ${transactionForm.values.customerType === 'new' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="customerType"
                      value="new"
                      checked={transactionForm.values.customerType === 'new'}
                      onChange={transactionForm.handleChange}
                    />
                    <User size={16} />
                    مشتری جدید
                  </label>
                  <label className={`radio-option ${transactionForm.values.customerType === 'existing' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="customerType"
                      value="existing"
                      checked={transactionForm.values.customerType === 'existing'}
                      onChange={transactionForm.handleChange}
                    />
                    <Search size={16} />
                    مشتری موجود
                  </label>
                </div>
              </div>

              {/* Existing Customer Search */}
              {transactionForm.values.customerType === 'existing' && (
                <div className="form-section">
                  <h3>جستجوی مشتری</h3>
                  <div className="customer-search">
                    <div className="search-input">
                      <Search size={16} />
                      <input
                        type="text"
                        placeholder="نام، تلفن یا ایمیل مشتری..."
                        value={customerSearchTerm}
                        onChange={(e) => setCustomerSearchTerm(e.target.value)}
                        onFocus={() => setShowCustomerSearch(true)}
                      />
                    </div>
                    
                    {showCustomerSearch && (
                      <div className="customer-dropdown">
                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.map((customer) => (
                            <div
                              key={customer.id}
                              className="customer-item"
                              onClick={() => selectExistingCustomer(customer)}
                            >
                              <div className="customer-info">
                                <strong>{customer.name}</strong>
                                <span>{customer.phone}</span>
                                {customer.email && <span>{customer.email}</span>}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="no-customers">
                            هیچ مشتری یافت نشد
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Customer Details Form */}
              <div className="form-section">
                <h3>اطلاعات شخصی</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>نام و نام خانوادگی *</label>
                    <input
                      type="text"
                      name="customerName"
                      value={transactionForm.values.customerName}
                      onChange={transactionForm.handleChange}
                      onBlur={transactionForm.handleBlur}
                      placeholder="نام کامل مشتری"
                      disabled={transactionForm.values.customerType === 'existing' && transactionForm.values.existingCustomerId}
                    />
                    {transactionForm.touched.customerName && transactionForm.errors.customerName && (
                      <div className="error">{transactionForm.errors.customerName}</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>شماره تلفن *</label>
                    <input
                      type="tel"
                      name="customerPhone"
                      value={transactionForm.values.customerPhone}
                      onChange={transactionForm.handleChange}
                      onBlur={transactionForm.handleBlur}
                      placeholder="09xxxxxxxxx"
                      disabled={transactionForm.values.customerType === 'existing' && transactionForm.values.existingCustomerId}
                    />
                    {transactionForm.touched.customerPhone && transactionForm.errors.customerPhone && (
                      <div className="error">{transactionForm.errors.customerPhone}</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>ایمیل</label>
                    <input
                      type="email"
                      name="customerEmail"
                      value={transactionForm.values.customerEmail}
                      onChange={transactionForm.handleChange}
                      onBlur={transactionForm.handleBlur}
                      placeholder="example@email.com"
                      disabled={transactionForm.values.customerType === 'existing' && transactionForm.values.existingCustomerId}
                    />
                    {transactionForm.touched.customerEmail && transactionForm.errors.customerEmail && (
                      <div className="error">{transactionForm.errors.customerEmail}</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>کد ملی</label>
                    <input
                      type="text"
                      name="customerNationalId"
                      value={transactionForm.values.customerNationalId}
                      onChange={transactionForm.handleChange}
                      placeholder="کد ملی 10 رقمی"
                      disabled={transactionForm.values.customerType === 'existing' && transactionForm.values.existingCustomerId}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>آدرس</label>
                    <textarea
                      name="customerAddress"
                      value={transactionForm.values.customerAddress}
                      onChange={transactionForm.handleChange}
                      placeholder="آدرس کامل مشتری"
                      rows="3"
                      disabled={transactionForm.values.customerType === 'existing' && transactionForm.values.existingCustomerId}
                    />
                  </div>
                </div>
              </div>

              <div className="step-actions">
                <button
                  type="button"
                  className="prev-btn"
                  onClick={() => setCurrentStep(1)}
                >
                  مرحله قبل
                </button>
                <button
                  type="button"
                  className="next-btn"
                  onClick={() => setCurrentStep(3)}
                  disabled={!transactionForm.values.customerName || !transactionForm.values.customerPhone}
                >
                  مرحله بعد
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Transaction Details */}
          {currentStep === 3 && (
            <div className="form-step">
              <div className="step-header">
                <h2>جزئیات تراکنش</h2>
                <p>اطلاعات تراکنش را کامل کنید</p>
              </div>

              {/* Currency Exchange */}
              {transactionForm.values.type === 'currency_exchange' && (
                <div className="form-section">
                  <h3>خرید/فروش ارز</h3>
                  
                  {/* Operation Type */}
                  <div className="operation-type">
                    <label className={`operation-option ${transactionForm.values.operationType === 'buy' ? 'selected buy' : ''}`}>
                      <input
                        type="radio"
                        name="operationType"
                        value="buy"
                        checked={transactionForm.values.operationType === 'buy'}
                        onChange={transactionForm.handleChange}
                      />
                      <TrendingUp size={16} />
                      خرید ارز
                    </label>
                    <label className={`operation-option ${transactionForm.values.operationType === 'sell' ? 'selected sell' : ''}`}>
                      <input
                        type="radio"
                        name="operationType"
                        value="sell"
                        checked={transactionForm.values.operationType === 'sell'}
                        onChange={transactionForm.handleChange}
                      />
                      <TrendingDown size={16} />
                      فروش ارز
                    </label>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>نوع ارز *</label>
                      <select
                        name="currency"
                        value={transactionForm.values.currency}
                        onChange={transactionForm.handleChange}
                        onBlur={transactionForm.handleBlur}
                      >
                        {currencies.map(currency => (
                          <option key={currency.value} value={currency.value}>
                            {currency.label} ({currency.symbol})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>مقدار *</label>
                      <input
                        type="number"
                        name="amount"
                        value={transactionForm.values.amount}
                        onChange={transactionForm.handleChange}
                        onBlur={transactionForm.handleBlur}
                        placeholder="مقدار ارز"
                        step="0.01"
                      />
                      {transactionForm.touched.amount && transactionForm.errors.amount && (
                        <div className="error">{transactionForm.errors.amount}</div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>نرخ (تومان) *</label>
                      <div className="rate-input">
                        <input
                          type="number"
                          name="rate"
                          value={transactionForm.values.rate}
                          onChange={transactionForm.handleChange}
                          onBlur={transactionForm.handleBlur}
                          placeholder="نرخ هر واحد"
                          step="0.01"
                        />
                        {exchangeRates[transactionForm.values.currency] && (
                          <button
                            type="button"
                            className="rate-suggestion"
                            onClick={() => {
                              const rate = transactionForm.values.operationType === 'buy' 
                                ? exchangeRates[transactionForm.values.currency].sell
                                : exchangeRates[transactionForm.values.currency].buy;
                              transactionForm.setFieldValue('rate', rate);
                            }}
                          >
                            نرخ روز: {transactionForm.values.operationType === 'buy' 
                              ? exchangeRates[transactionForm.values.currency].sell
                              : exchangeRates[transactionForm.values.currency].buy
                            }
                          </button>
                        )}
                      </div>
                      {transactionForm.touched.rate && transactionForm.errors.rate && (
                        <div className="error">{transactionForm.errors.rate}</div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>کمیسیون (تومان)</label>
                      <input
                        type="number"
                        name="commission"
                        value={transactionForm.values.commission}
                        onChange={transactionForm.handleChange}
                        placeholder="مبلغ کمیسیون"
                        step="0.01"
                      />
                    </div>
                  </div>

                  {/* Calculation Display */}
                  <div className="calculation-display">
                    <div className="calc-item">
                      <span>مبلغ کل:</span>
                      <span className="amount">
                        {calculating ? (
                          <RefreshCw size={16} className="spinning" />
                        ) : (
                          `${parseFloat(transactionForm.values.totalAmount || 0).toLocaleString()} تومان`
                        )}
                      </span>
                    </div>
                    <div className="calc-item">
                      <span>کمیسیون:</span>
                      <span className="commission">
                        {parseFloat(transactionForm.values.commission || 0).toLocaleString()} تومان
                      </span>
                    </div>
                    <div className="calc-item final">
                      <span>مبلغ نهایی:</span>
                      <span className="final-amount">
                        {parseFloat(transactionForm.values.finalAmount || 0).toLocaleString()} تومان
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Money Transfer */}
              {transactionForm.values.type === 'money_transfer' && (
                <div className="form-section">
                  <h3>حواله ارزی</h3>
                  
                  <div className="form-grid">
                    <div className="form-group">
                      <label>نام گیرنده *</label>
                      <input
                        type="text"
                        name="recipientName"
                        value={transactionForm.values.recipientName}
                        onChange={transactionForm.handleChange}
                        onBlur={transactionForm.handleBlur}
                        placeholder="نام کامل گیرنده"
                      />
                      {transactionForm.touched.recipientName && transactionForm.errors.recipientName && (
                        <div className="error">{transactionForm.errors.recipientName}</div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>شماره تلفن گیرنده *</label>
                      <input
                        type="tel"
                        name="recipientPhone"
                        value={transactionForm.values.recipientPhone}
                        onChange={transactionForm.handleChange}
                        onBlur={transactionForm.handleBlur}
                        placeholder="شماره تلفن گیرنده"
                      />
                      {transactionForm.touched.recipientPhone && transactionForm.errors.recipientPhone && (
                        <div className="error">{transactionForm.errors.recipientPhone}</div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>نوع ارز *</label>
                      <select
                        name="currency"
                        value={transactionForm.values.currency}
                        onChange={transactionForm.handleChange}
                      >
                        {currencies.map(currency => (
                          <option key={currency.value} value={currency.value}>
                            {currency.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>مبلغ *</label>
                      <input
                        type="number"
                        name="amount"
                        value={transactionForm.values.amount}
                        onChange={transactionForm.handleChange}
                        placeholder="مبلغ حواله"
                        step="0.01"
                      />
                    </div>

                    <div className="form-group">
                      <label>شعبه مقصد *</label>
                      <select
                        name="destinationBranch"
                        value={transactionForm.values.destinationBranch}
                        onChange={transactionForm.handleChange}
                      >
                        <option value="">انتخاب شعبه</option>
                        <option value="branch1">شعبه تهران</option>
                        <option value="branch2">شعبه اصفهان</option>
                        <option value="branch3">شعبه شیراز</option>
                      </select>
                      {transactionForm.touched.destinationBranch && transactionForm.errors.destinationBranch && (
                        <div className="error">{transactionForm.errors.destinationBranch}</div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>کد امنیتی (4 رقم)</label>
                      <input
                        type="text"
                        name="securityCode"
                        value={transactionForm.values.securityCode}
                        onChange={transactionForm.handleChange}
                        placeholder="کد 4 رقمی برای تحویل"
                        maxLength="4"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="form-section">
                <h3>توضیحات</h3>
                <div className="form-group">
                  <label>توضیحات تراکنش</label>
                  <textarea
                    name="description"
                    value={transactionForm.values.description}
                    onChange={transactionForm.handleChange}
                    placeholder="توضیحات اضافی برای تراکنش..."
                    rows="3"
                  />
                  {transactionForm.touched.description && transactionForm.errors.description && (
                    <div className="error">{transactionForm.errors.description}</div>
                  )}
                </div>
              </div>

              <div className="step-actions">
                <button
                  type="button"
                  className="prev-btn"
                  onClick={() => setCurrentStep(2)}
                >
                  مرحله قبل
                </button>
                <button
                  type="button"
                  className="next-btn"
                  onClick={() => setCurrentStep(4)}
                  disabled={!transactionForm.values.amount || !transactionForm.values.currency}
                >
                  مرحله بعد
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Payments */}
          {currentStep === 4 && (
            <div className="form-step">
              <div className="step-header">
                <h2>پرداخت‌ها</h2>
                <p>اطلاعات پرداخت‌های دریافتی را وارد کنید</p>
              </div>

              <div className="payments-section">
                <div className="section-header">
                  <h3>لیست پرداخت‌ها</h3>
                  <button
                    type="button"
                    className="add-payment-btn"
                    onClick={addPayment}
                  >
                    <Plus size={16} />
                    افزودن پرداخت
                  </button>
                </div>

                {payments.length === 0 ? (
                  <div className="empty-payments">
                    <Receipt size={48} />
                    <h3>هیچ پرداختی ثبت نشده</h3>
                    <p>برای شروع، یک پرداخت اضافه کنید</p>
                    <button
                      type="button"
                      className="add-first-payment"
                      onClick={addPayment}
                    >
                      افزودن اولین پرداخت
                    </button>
                  </div>
                ) : (
                  <div className="payments-list">
                    {payments.map((payment, index) => (
                      <div key={payment.id} className="payment-card">
                        <div className="payment-header">
                          <h4>پرداخت {index + 1}</h4>
                          <button
                            type="button"
                            className="remove-payment"
                            onClick={() => removePayment(index)}
                          >
                            <X size={16} />
                          </button>
                        </div>

                        <div className="payment-form">
                          <div className="form-grid">
                            <div className="form-group">
                              <label>حساب مقصد</label>
                              <select
                                value={payment.accountId}
                                onChange={(e) => {
                                  updatePayment(index, 'accountId', e.target.value);
                                  const account = bankAccounts.find(acc => acc.id === e.target.value);
                                  updatePayment(index, 'accountName', account ? account.name : '');
                                }}
                              >
                                <option value="">انتخاب حساب</option>
                                {bankAccounts.map(account => (
                                  <option key={account.id} value={account.id}>
                                    {account.bankName} - {account.accountNumber}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="form-group">
                              <label>نام واریزکننده</label>
                              <input
                                type="text"
                                value={payment.senderName}
                                onChange={(e) => updatePayment(index, 'senderName', e.target.value)}
                                placeholder="نام شخص واریزکننده"
                              />
                            </div>

                            <div className="form-group">
                              <label>مبلغ (تومان)</label>
                              <input
                                type="number"
                                value={payment.amount}
                                onChange={(e) => updatePayment(index, 'amount', e.target.value)}
                                placeholder="مبلغ پرداختی"
                                step="0.01"
                              />
                            </div>

                            <div className="form-group">
                              <label>تاریخ</label>
                              <input
                                type="date"
                                value={payment.date}
                                onChange={(e) => updatePayment(index, 'date', e.target.value)}
                              />
                            </div>

                            <div className="form-group">
                              <label>ساعت</label>
                              <input
                                type="time"
                                value={payment.time}
                                onChange={(e) => updatePayment(index, 'time', e.target.value)}
                              />
                            </div>

                            <div className="form-group">
                              <label>توضیحات</label>
                              <input
                                type="text"
                                value={payment.description}
                                onChange={(e) => updatePayment(index, 'description', e.target.value)}
                                placeholder="توضیحات پرداخت"
                              />
                            </div>
                          </div>

                          {/* File Upload */}
                          <div className="receipt-upload">
                            <label>آپلود رسید</label>
                            <div className="upload-area">
                              {payment.receiptFile || payment.receiptUrl ? (
                                <div className="uploaded-file">
                                  <div className="file-info">
                                    <FileText size={20} />
                                    <span>{payment.receiptFile?.name || 'رسید آپلود شده'}</span>
                                  </div>
                                  <div className="file-actions">
                                    {payment.receiptUrl && (
                                      <button
                                        type="button"
                                        onClick={() => window.open(payment.receiptUrl, '_blank')}
                                      >
                                        <Eye size={14} />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updatePayment(index, 'receiptFile', null);
                                        updatePayment(index, 'receiptUrl', '');
                                      }}
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <label className="upload-trigger">
                                  <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={(e) => {
                                      const file = e.target.files[0];
                                      if (file) {
                                        handleFileUpload(file, index);
                                      }
                                    }}
                                    hidden
                                  />
                                  <Upload size={24} />
                                  <span>انتخاب فایل رسید</span>
                                  <small>تصویر یا PDF</small>
                                </label>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Payment Summary */}
                {payments.length > 0 && (
                  <div className="payment-summary">
                    <div className="summary-row">
                      <span>مبلغ قابل پرداخت:</span>
                      <span className="amount">
                        {parseFloat(transactionForm.values.finalAmount || 0).toLocaleString()} تومان
                      </span>
                    </div>
                    <div className="summary-row">
                      <span>مبلغ پرداخت شده:</span>
                      <span className="paid">
                        {getTotalPaid().toLocaleString()} تومان
                      </span>
                    </div>
                    <div className={`summary-row ${getRemainingAmount() > 0 ? 'remaining' : 'completed'}`}>
                      <span>مانده:</span>
                      <span className="remaining">
                        {getRemainingAmount().toLocaleString()} تومان
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="step-actions">
                <button
                  type="button"
                  className="prev-btn"
                  onClick={() => setCurrentStep(3)}
                >
                  مرحله قبل
                </button>
                <button
                  type="button"
                  className="next-btn"
                  onClick={() => setCurrentStep(5)}
                >
                  بررسی نهایی
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div className="form-step">
              <div className="step-header">
                <h2>بررسی و تأیید نهایی</h2>
                <p>اطلاعات تراکنش را بررسی کنید</p>
              </div>

              <TransactionReview
                transaction={transactionForm.values}
                payments={payments}
                getTotalPaid={getTotalPaid}
                getRemainingAmount={getRemainingAmount}
              />

              <div className="step-actions">
                <button
                  type="button"
                  className="prev-btn"
                  onClick={() => setCurrentStep(4)}
                >
                  مرحله قبل
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={16} className="spinning" />
                      در حال ایجاد...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      ایجاد تراکنش
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
};

// Transaction Preview Component
const TransactionPreview = ({ 
  transaction, 
  payments, 
  getTotalPaid, 
  getRemainingAmount, 
  onEdit, 
  onSubmit, 
  loading 
}) => {
  return (
    <div className="transaction-preview">
      <div className="preview-header">
        <h2>پیش‌نمایش تراکنش</h2>
        <button className="edit-btn" onClick={onEdit}>
          ویرایش
        </button>
      </div>
      
      <TransactionReview
        transaction={transaction}
        payments={payments}
        getTotalPaid={getTotalPaid}
        getRemainingAmount={getRemainingAmount}
      />
      
      <div className="preview-actions">
        <button className="cancel-btn" onClick={onEdit}>
          بازگشت به ویرایش
        </button>
        <button 
          className="submit-btn" 
          onClick={onSubmit}
          disabled={loading}
        >
          {loading ? 'در حال ایجاد...' : 'تأیید و ایجاد'}
        </button>
      </div>
    </div>
  );
};

// Transaction Review Component
const TransactionReview = ({ 
  transaction, 
  payments, 
  getTotalPaid, 
  getRemainingAmount 
}) => {
  const getTransactionTypeLabel = (type) => {
    const types = {
      'currency_exchange': 'خرید/فروش ارز',
      'money_transfer': 'حواله ارزی',
      'p2p_trade': 'معامله P2P',
      'account_deposit': 'واریز به حساب',
      'account_withdrawal': 'برداشت از حساب'
    };
    return types[type] || type;
  };

  return (
    <div className="transaction-review">
      {/* Basic Info */}
      <div className="review-section">
        <h3>اطلاعات کلی</h3>
        <div className="review-grid">
          <div className="review-item">
            <span>نوع تراکنش:</span>
            <span>{getTransactionTypeLabel(transaction.type)}</span>
          </div>
          {transaction.type === 'currency_exchange' && (
            <div className="review-item">
              <span>نوع عملیات:</span>
              <span>{transaction.operationType === 'buy' ? 'خرید' : 'فروش'} ارز</span>
            </div>
          )}
          <div className="review-item">
            <span>ارز:</span>
            <span>{transaction.currency}</span>
          </div>
          <div className="review-item">
            <span>مقدار:</span>
            <span>{parseFloat(transaction.amount || 0).toLocaleString()}</span>
          </div>
          {transaction.rate && (
            <div className="review-item">
              <span>نرخ:</span>
              <span>{parseFloat(transaction.rate).toLocaleString()} تومان</span>
            </div>
          )}
        </div>
      </div>

      {/* Customer Info */}
      <div className="review-section">
        <h3>اطلاعات مشتری</h3>
        <div className="review-grid">
          <div className="review-item">
            <span>نام:</span>
            <span>{transaction.customerName}</span>
          </div>
          <div className="review-item">
            <span>تلفن:</span>
            <span>{transaction.customerPhone}</span>
          </div>
          {transaction.customerEmail && (
            <div className="review-item">
              <span>ایمیل:</span>
              <span>{transaction.customerEmail}</span>
            </div>
          )}
          {transaction.customerNationalId && (
            <div className="review-item">
              <span>کد ملی:</span>
              <span>{transaction.customerNationalId}</span>
            </div>
          )}
        </div>
      </div>

      {/* Financial Summary */}
      <div className="review-section">
        <h3>خلاصه مالی</h3>
        <div className="financial-summary">
          <div className="summary-item">
            <span>مبلغ کل:</span>
            <span>{parseFloat(transaction.totalAmount || 0).toLocaleString()} تومان</span>
          </div>
          {transaction.commission && (
            <div className="summary-item">
              <span>کمیسیون:</span>
              <span>{parseFloat(transaction.commission).toLocaleString()} تومان</span>
            </div>
          )}
          <div className="summary-item highlight">
            <span>مبلغ نهایی:</span>
            <span>{parseFloat(transaction.finalAmount || 0).toLocaleString()} تومان</span>
          </div>
          <div className="summary-item">
            <span>مبلغ پرداخت شده:</span>
            <span>{getTotalPaid().toLocaleString()} تومان</span>
          </div>
          <div className={`summary-item ${getRemainingAmount() > 0 ? 'remaining' : 'completed'}`}>
            <span>مانده:</span>
            <span>{getRemainingAmount().toLocaleString()} تومان</span>
          </div>
        </div>
      </div>

      {/* Payments */}
      {payments.length > 0 && (
        <div className="review-section">
          <h3>پرداخت‌ها ({payments.length})</h3>
          <div className="payments-review">
            {payments.map((payment, index) => (
              <div key={payment.id} className="payment-review-item">
                <div className="payment-number">#{index + 1}</div>
                <div className="payment-details">
                  <div>حساب: {payment.accountName}</div>
                  <div>واریزکننده: {payment.senderName}</div>
                  <div>مبلغ: {parseFloat(payment.amount || 0).toLocaleString()} تومان</div>
                  <div>تاریخ: {payment.date} - {payment.time}</div>
                  {payment.receiptFile && (
                    <div className="receipt-indicator">
                      <FileText size={14} />
                      رسید ضمیمه شده
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      {transaction.description && (
        <div className="review-section">
          <h3>توضیحات</h3>
          <div className="description-text">
            {transaction.description}
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionCreate;
