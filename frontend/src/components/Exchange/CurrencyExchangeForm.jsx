import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import CurrencyInput from '../common/CurrencyInput';
import ExchangeRateWidget from './ExchangeRateWidget';
import FeeCalculator from './FeeCalculator';
import './CurrencyExchangeForm.css';

/**
 * Comprehensive Currency Exchange Form
 * Handles currency selection, rate calculation, and fee computation
 */
const CurrencyExchangeForm = ({ onSubmit, loading = false }) => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  
  const [formData, setFormData] = useState({
    fromCurrency: 'IRR',
    toCurrency: 'USD',
    amount: '',
    exchangeRate: 0,
    commission: 0,
    totalAmount: 0,
    paymentMethod: 'bank_transfer',
    deliveryMethod: 'account_credit'
  });

  const [rates, setRates] = useState({});
  const [errors, setErrors] = useState({});
  const [isCalculating, setIsCalculating] = useState(false);

  // Available currencies
  const currencies = [
    { code: 'IRR', name: 'Iranian Rial', symbol: 'ریال', flag: '🇮🇷' },
    { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
    { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
    { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪' },
    { code: 'TRY', name: 'Turkish Lira', symbol: '₺', flag: '🇹🇷' }
  ];

  // Payment methods
  const paymentMethods = [
    { value: 'cash', label: 'نقدی', icon: '💵' },
    { value: 'bank_transfer', label: 'انتقال بانکی', icon: '🏦' },
    { value: 'card', label: 'کارت بانکی', icon: '💳' },
    { value: 'crypto', label: 'ارز دیجیتال', icon: '₿' },
    { value: 'check', label: 'چک', icon: '📄' }
  ];

  // Delivery methods
  const deliveryMethods = [
    { value: 'physical', label: 'تحویل فیزیکی', icon: '📦' },
    { value: 'bank_transfer', label: 'انتقال به حساب', icon: '🏦' },
    { value: 'account_credit', label: 'اعتبار حساب', icon: '💳' },
    { value: 'crypto_wallet', label: 'کیف ارز دیجیتال', icon: '₿' }
  ];

  // Load exchange rates
  useEffect(() => {
    loadExchangeRates();
  }, []);

  // Calculate totals when form data changes
  useEffect(() => {
    calculateTotals();
  }, [formData.amount, formData.exchangeRate, formData.fromCurrency, formData.toCurrency]);

  const loadExchangeRates = async () => {
    try {
      setIsCalculating(true);
      const response = await fetch('/api/exchange/rates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'x-tenant-id': currentTenant?.id
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRates(data.rates);
        
        // Set initial exchange rate
        const rate = data.rates.find(r => 
          r.fromCurrency === formData.fromCurrency && 
          r.toCurrency === formData.toCurrency
        );
        
        if (rate) {
          setFormData(prev => ({ ...prev, exchangeRate: rate.rate }));
        }
      }
    } catch (error) {
      console.error('Error loading exchange rates:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const calculateTotals = () => {
    const amount = parseFloat(formData.amount) || 0;
    const rate = parseFloat(formData.exchangeRate) || 0;
    
    if (amount > 0 && rate > 0) {
      const convertedAmount = amount / rate;
      const commission = calculateCommission(amount);
      const totalAmount = amount + commission;
      
      setFormData(prev => ({
        ...prev,
        convertedAmount,
        commission,
        totalAmount
      }));
    }
  };

  const calculateCommission = (amount) => {
    const commissionRate = currentTenant?.settings?.commission || 0.005; // 0.5%
    return Math.round(amount * commissionRate);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleCurrencySwap = () => {
    setFormData(prev => ({
      ...prev,
      fromCurrency: prev.toCurrency,
      toCurrency: prev.fromCurrency,
      amount: prev.convertedAmount?.toString() || ''
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'مبلغ باید بیشتر از صفر باشد';
    }

    if (parseFloat(formData.amount) > (currentTenant?.settings?.limits?.maxTransaction || 1000000000)) {
      newErrors.amount = 'مبلغ از حد مجاز بیشتر است';
    }

    if (formData.fromCurrency === formData.toCurrency) {
      newErrors.toCurrency = 'ارز مبدا و مقصد نمی‌تواند یکسان باشد';
    }

    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'روش پرداخت را انتخاب کنید';
    }

    if (!formData.deliveryMethod) {
      newErrors.deliveryMethod = 'روش تحویل را انتخاب کنید';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit({
        ...formData,
        amount: parseFloat(formData.amount),
        exchangeRate: parseFloat(formData.exchangeRate),
        commission: parseFloat(formData.commission),
        totalAmount: parseFloat(formData.totalAmount)
      });
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const getCurrencyInfo = (code) => {
    return currencies.find(c => c.code === code) || currencies[0];
  };

  return (
    <div className="currency-exchange-form">
      <div className="form-header">
        <h2>تبدیل ارز</h2>
        <p>نرخ تبدیل به‌روز و محاسبه خودکار کارمزد</p>
      </div>

      <form onSubmit={handleSubmit} className="exchange-form">
        {/* Exchange Rate Widget */}
        <div className="rate-widget-container">
          <ExchangeRateWidget 
            fromCurrency={formData.fromCurrency}
            toCurrency={formData.toCurrency}
            rate={formData.exchangeRate}
            loading={isCalculating}
            onRateChange={(rate) => handleInputChange('exchangeRate', rate)}
          />
        </div>

        {/* Currency Selection */}
        <div className="currency-selection">
          <div className="currency-input-group">
            <label>ارز مبدا</label>
            <div className="currency-selector">
              <select
                value={formData.fromCurrency}
                onChange={(e) => handleInputChange('fromCurrency', e.target.value)}
                className={errors.fromCurrency ? 'error' : ''}
              >
                {currencies.map(currency => (
                  <option key={currency.code} value={currency.code}>
                    {currency.flag} {currency.name} ({currency.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            className="swap-button"
            onClick={handleCurrencySwap}
            disabled={isCalculating}
          >
            🔄
          </button>

          <div className="currency-input-group">
            <label>ارز مقصد</label>
            <div className="currency-selector">
              <select
                value={formData.toCurrency}
                onChange={(e) => handleInputChange('toCurrency', e.target.value)}
                className={errors.toCurrency ? 'error' : ''}
              >
                {currencies.map(currency => (
                  <option key={currency.code} value={currency.code}>
                    {currency.flag} {currency.name} ({currency.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Amount Input */}
        <div className="amount-input-group">
          <label>مبلغ ({getCurrencyInfo(formData.fromCurrency).symbol})</label>
          <CurrencyInput
            value={formData.amount}
            onChange={(value) => handleInputChange('amount', value)}
            currency={formData.fromCurrency}
            placeholder="مبلغ را وارد کنید"
            error={errors.amount}
            disabled={isCalculating}
          />
        </div>

        {/* Conversion Result */}
        {formData.convertedAmount > 0 && (
          <div className="conversion-result">
            <div className="result-item">
              <span>مبلغ تبدیل شده:</span>
              <span className="result-value">
                {formData.convertedAmount.toLocaleString()} {getCurrencyInfo(formData.toCurrency).symbol}
              </span>
            </div>
          </div>
        )}

        {/* Fee Calculator */}
        <FeeCalculator
          amount={parseFloat(formData.amount) || 0}
          commission={formData.commission}
          totalAmount={formData.totalAmount}
          fromCurrency={formData.fromCurrency}
          toCurrency={formData.toCurrency}
        />

        {/* Payment Method */}
        <div className="payment-method-group">
          <label>روش پرداخت</label>
          <div className="payment-methods">
            {paymentMethods.map(method => (
              <label key={method.value} className="payment-method-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.value}
                  checked={formData.paymentMethod === method.value}
                  onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                />
                <span className="method-icon">{method.icon}</span>
                <span className="method-label">{method.label}</span>
              </label>
            ))}
          </div>
          {errors.paymentMethod && <span className="error-message">{errors.paymentMethod}</span>}
        </div>

        {/* Delivery Method */}
        <div className="delivery-method-group">
          <label>روش تحویل</label>
          <div className="delivery-methods">
            {deliveryMethods.map(method => (
              <label key={method.value} className="delivery-method-option">
                <input
                  type="radio"
                  name="deliveryMethod"
                  value={method.value}
                  checked={formData.deliveryMethod === method.value}
                  onChange={(e) => handleInputChange('deliveryMethod', e.target.value)}
                />
                <span className="method-icon">{method.icon}</span>
                <span className="method-label">{method.label}</span>
              </label>
            ))}
          </div>
          {errors.deliveryMethod && <span className="error-message">{errors.deliveryMethod}</span>}
        </div>

        {/* Submit Button */}
        <div className="form-actions">
          <button
            type="submit"
            className="submit-button"
            disabled={loading || isCalculating || !formData.amount}
          >
            {loading ? 'در حال پردازش...' : 'ثبت درخواست تبدیل'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CurrencyExchangeForm; 