// src/components/CurrencyExchange/CurrencyExchangeForm.jsx
import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useTenantContext } from '../../contexts/TenantContext';

const CurrencyExchangeForm = () => {
  const [payments, setPayments] = useState([]);
  const { tenant } = useTenantContext();

  const validationSchema = Yup.object({
    type: Yup.string().required('نوع معامله الزامی است'),
    currency: Yup.string().required('نوع ارز الزامی است'),
    amount: Yup.number().positive('مقدار باید مثبت باشد').required('مقدار الزامی است'),
    rate: Yup.number().positive('نرخ باید مثبت باشد').required('نرخ الزامی است'),
    customerName: Yup.string().required('نام مشتری الزامی است'),
    customerPhone: Yup.string().required('شماره تلفن الزامی است')
  });

  const formik = useFormik({
    initialValues: {
      type: 'buy',
      currency: 'USD',
      amount: '',
      rate: '',
      customerName: '',
      customerPhone: '',
      customerNationalId: '',
      description: ''
    },
    validationSchema,
    onSubmit: async (values) => {
      const transactionData = {
        ...values,
        payments,
        totalAmount: values.amount * values.rate,
        paidAmount: payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0),
        tenantId: tenant.id,
        status: 'pending'
      };
      
      try {
        const response = await fetch('/api/exchange/transaction', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'X-Tenant-ID': tenant.id
          },
          body: JSON.stringify(transactionData)
        });
        
        if (response.ok) {
          alert('معامله با موفقیت ثبت شد');
          formik.resetForm();
          setPayments([]);
        }
      } catch (error) {
        console.error('خطا در ثبت معامله:', error);
      }
    }
  });

  const addPayment = () => {
    const newPayment = {
      id: Date.now(),
      accountName: '',
      senderName: '',
      amount: '',
      receiptFile: null,
      date: new Date().toISOString().split('T')[0]
    };
    setPayments([...payments, newPayment]);
  };

  const updatePayment = (index, field, value) => {
    const updated = [...payments];
    updated[index][field] = value;
    setPayments(updated);
  };

  const removePayment = (index) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const getTotalPaid = () => {
    return payments.reduce((total, payment) => {
      return total + (parseFloat(payment.amount) || 0);
    }, 0);
  };

  const getRemainingAmount = () => {
    const total = formik.values.amount * formik.values.rate;
    return total - getTotalPaid();
  };

  return (
    <div className="currency-exchange-form">
      <div className="form-header">
        <h2>خرید و فروش ارز</h2>
        <div className="tenant-info">
          <span>صرافی: {tenant.name}</span>
        </div>
      </div>

      <form onSubmit={formik.handleSubmit} className="exchange-form">
        {/* اطلاعات معامله */}
        <div className="section">
          <h3>اطلاعات معامله</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>نوع معامله</label>
              <select
                name="type"
                value={formik.values.type}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              >
                <option value="buy">خرید ارز</option>
                <option value="sell">فروش ارز</option>
              </select>
              {formik.touched.type && formik.errors.type && (
                <div className="error">{formik.errors.type}</div>
              )}
            </div>

            <div className="form-group">
              <label>نوع ارز</label>
              <select
                name="currency"
                value={formik.values.currency}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              >
                <option value="USD">دلار آمریکا</option>
                <option value="EUR">یورو</option>
                <option value="AED">درهم امارات</option>
                <option value="TRY">لیر ترکیه</option>
                <option value="CAD">دلار کانادا</option>
              </select>
            </div>

            <div className="form-group">
              <label>مقدار</label>
              <input
                type="number"
                name="amount"
                value={formik.values.amount}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="مقدار ارز"
              />
              {formik.touched.amount && formik.errors.amount && (
                <div className="error">{formik.errors.amount}</div>
              )}
            </div>

            <div className="form-group">
              <label>نرخ (تومان)</label>
              <input
                type="number"
                name="rate"
                value={formik.values.rate}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="نرخ هر واحد"
              />
              {formik.touched.rate && formik.errors.rate && (
                <div className="error">{formik.errors.rate}</div>
              )}
            </div>
          </div>

          <div className="total-display">
            <h3>مبلغ کل: {(formik.values.amount * formik.values.rate || 0).toLocaleString()} تومان</h3>
          </div>
        </div>

        {/* اطلاعات مشتری */}
        <div className="section">
          <h3>اطلاعات مشتری</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>نام و نام خانوادگی</label>
              <input
                type="text"
                name="customerName"
                value={formik.values.customerName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="نام کامل مشتری"
              />
              {formik.touched.customerName && formik.errors.customerName && (
                <div className="error">{formik.errors.customerName}</div>
              )}
            </div>

            <div className="form-group">
              <label>شماره تلفن</label>
              <input
                type="tel"
                name="customerPhone"
                value={formik.values.customerPhone}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="09xxxxxxxxx"
              />
              {formik.touched.customerPhone && formik.errors.customerPhone && (
                <div className="error">{formik.errors.customerPhone}</div>
              )}
            </div>

            <div className="form-group">
              <label>کد ملی (اختیاری)</label>
              <input
                type="text"
                name="customerNationalId"
                value={formik.values.customerNationalId}
                onChange={formik.handleChange}
                placeholder="کد ملی"
              />
            </div>
          </div>
        </div>

        {/* پرداخت‌ها */}
        <div className="section">
          <div className="section-header">
            <h3>پرداخت‌ها</h3>
            <button type="button" onClick={addPayment} className="add-btn">
              افزودن پرداخت
            </button>
          </div>

          {payments.map((payment, index) => (
            <div key={payment.id} className="payment-card">
              <div className="payment-header">
                <h4>پرداخت {index + 1}</h4>
                <button type="button" onClick={() => removePayment(index)} className="remove-btn">
                  حذف
                </button>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>نام حساب مقصد</label>
                  <input
                    type="text"
                    value={payment.accountName}
                    onChange={(e) => updatePayment(index, 'accountName', e.target.value)}
                    placeholder="نام حساب بانکی"
                  />
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
                  <label>مبلغ پرداختی</label>
                  <input
                    type="number"
                    value={payment.amount}
                    onChange={(e) => updatePayment(index, 'amount', e.target.value)}
                    placeholder="مبلغ به تومان"
                  />
                </div>

                <div className="form-group">
                  <label>تاریخ پرداخت</label>
                  <input
                    type="date"
                    value={payment.date}
                    onChange={(e) => updatePayment(index, 'date', e.target.value)}
                  />
                </div>

                <div className="form-group full-width">
                  <label>آپلود رسید</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => updatePayment(index, 'receiptFile', e.target.files[0])}
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="payment-summary">
            <div className="summary-row">
              <span>مبلغ کل:</span>
              <span>{(formik.values.amount * formik.values.rate || 0).toLocaleString()} تومان</span>
            </div>
            <div className="summary-row">
              <span>پرداخت شده:</span>
              <span>{getTotalPaid().toLocaleString()} تومان</span>
            </div>
            <div className={`summary-row ${getRemainingAmount() > 0 ? 'remaining' : 'completed'}`}>
              <span>مانده:</span>
              <span>{getRemainingAmount().toLocaleString()} تومان</span>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="submit-btn" disabled={formik.isSubmitting}>
            {formik.isSubmitting ? 'در حال ثبت...' : 'ثبت معامله'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CurrencyExchangeForm;
