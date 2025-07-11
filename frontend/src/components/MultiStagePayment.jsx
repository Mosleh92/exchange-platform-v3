import React, { useState, useEffect } from 'react';

/**
 * Multi-Stage Payment Component
 * Handles complex payment workflows with multiple receipts
 */
const MultiStagePayment = ({ dealId, onPaymentComplete }) => {
  const [payment, setPayment] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newReceipt, setNewReceipt] = useState({
    receiverName: '',
    amount: '',
    bankInfo: {
      accountNumber: '',
      bankName: ''
    },
    notes: ''
  });

  // Mock payment data for demonstration
  useEffect(() => {
    setPayment({
      id: 'payment-123',
      dealId: dealId,
      totalAmount: 10000000,
      paidAmount: 3000000,
      remainingAmount: 7000000,
      currency: 'IRR',
      status: 'پرداخت جزئی',
      receipts: [
        {
          id: 'receipt-1',
          receiverName: 'محمد احمدی',
          amount: 3000000,
          status: 'VERIFIED',
          uploadedAt: '2024-01-15T10:30:00Z'
        }
      ]
    });
  }, [dealId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setNewReceipt(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setNewReceipt(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleAddReceipt = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const receipt = {
        id: `receipt-${Date.now()}`,
        ...newReceipt,
        amount: parseFloat(newReceipt.amount),
        status: 'UPLOADED',
        uploadedAt: new Date().toISOString()
      };

      const updatedPayment = {
        ...payment,
        paidAmount: payment.paidAmount + receipt.amount,
        remainingAmount: payment.remainingAmount - receipt.amount,
        receipts: [...payment.receipts, receipt]
      };

      updatedPayment.status = updatedPayment.remainingAmount <= 0 ? 'پرداخت کامل' : 'پرداخت جزئی';

      setPayment(updatedPayment);
      setNewReceipt({
        receiverName: '',
        amount: '',
        bankInfo: { accountNumber: '', bankName: '' },
        notes: ''
      });

      if (updatedPayment.status === 'پرداخت کامل' && onPaymentComplete) {
        onPaymentComplete(updatedPayment);
      }
    } catch (error) {
      console.error('Error adding receipt:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fa-IR').format(amount);
  };

  const getProgressPercentage = () => {
    if (!payment) return 0;
    return (payment.paidAmount / payment.totalAmount) * 100;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'پرداخت کامل': return 'text-green-600 bg-green-100';
      case 'پرداخت جزئی': return 'text-yellow-600 bg-yellow-100';
      case 'در انتظار': return 'text-gray-600 bg-gray-100';
      case 'VERIFIED': return 'text-green-600 bg-green-100';
      case 'UPLOADED': return 'text-blue-600 bg-blue-100';
      case 'REJECTED': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!payment) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Payment Overview */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">پرداخت چندمرحله‌ای</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(payment.status)}`}>
            {payment.status}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>پیشرفت پرداخت</span>
            <span>{Math.round(getProgressPercentage())}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">مبلغ کل</p>
            <p className="text-xl font-semibold text-gray-900">
              {formatCurrency(payment.totalAmount)} ریال
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">پرداخت شده</p>
            <p className="text-xl font-semibold text-green-600">
              {formatCurrency(payment.paidAmount)} ریال
            </p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">باقی‌مانده</p>
            <p className="text-xl font-semibold text-orange-600">
              {formatCurrency(payment.remainingAmount)} ریال
            </p>
          </div>
        </div>
      </div>

      {/* Add New Receipt Form */}
      {payment.status !== 'پرداخت کامل' && (
        <div className="mb-8 p-6 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">افزودن رسید جدید</h3>
          <form onSubmit={handleAddReceipt} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نام دریافت کننده
                </label>
                <input
                  type="text"
                  name="receiverName"
                  value={newReceipt.receiverName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  مبلغ (ریال)
                </label>
                <input
                  type="number"
                  name="amount"
                  value={newReceipt.amount}
                  onChange={handleInputChange}
                  max={payment.remainingAmount}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  شماره حساب
                </label>
                <input
                  type="text"
                  name="bankInfo.accountNumber"
                  value={newReceipt.bankInfo.accountNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نام بانک
                </label>
                <input
                  type="text"
                  name="bankInfo.bankName"
                  value={newReceipt.bankInfo.bankName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                توضیحات
              </label>
              <textarea
                name="notes"
                value={newReceipt.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="توضیحات اضافی..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'در حال ارسال...' : 'افزودن رسید'}
            </button>
          </form>
        </div>
      )}

      {/* Receipts List */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          رسیدهای پرداخت ({payment.receipts.length})
        </h3>
        <div className="space-y-4">
          {payment.receipts.map((receipt, index) => (
            <div key={receipt.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 space-x-reverse mb-2">
                    <span className="font-medium text-gray-900">
                      رسید #{index + 1} - {receipt.receiverName}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(receipt.status)}`}>
                      {receipt.status === 'VERIFIED' ? 'تایید شده' : 
                       receipt.status === 'UPLOADED' ? 'آپلود شده' : 'رد شده'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">مبلغ: </span>
                      <span className="font-medium">{formatCurrency(receipt.amount)} ریال</span>
                    </div>
                    <div>
                      <span className="text-gray-600">تاریخ: </span>
                      <span className="font-medium">
                        {new Date(receipt.uploadedAt).toLocaleDateString('fa-IR')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2 space-x-reverse">
                  <button className="text-blue-600 hover:text-blue-800 text-sm">
                    مشاهده
                  </button>
                  {receipt.status === 'UPLOADED' && (
                    <button className="text-green-600 hover:text-green-800 text-sm">
                      تایید
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MultiStagePayment;