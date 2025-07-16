import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Upload, 
  Eye,
  DollarSign,
  Calendar,
  User,
  Shield,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import api from '../../services/api';
import './EnhancedP2PTransaction.css';

/**
 * Enhanced P2P Transaction Component
 * Supports multi-payment tracking and real-time updates
 */
const EnhancedP2PTransaction = ({ transaction, onStatusUpdate }) => {
  const { user } = useAuth();
  const { tenant } = useTenant();
  
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPayments, setShowPayments] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);

  const statusConfig = {
    PENDING: {
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      text: 'در انتظار پرداخت'
    },
    PENDING_PAYMENT: {
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      text: 'در انتظار تایید پرداخت'
    },
    PAYMENT_CONFIRMED: {
      icon: CheckCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      text: 'پرداخت تایید شده'
    },
    COMPLETED: {
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      text: 'تکمیل شده'
    },
    CANCELLED: {
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      text: 'لغو شده'
    },
    EXPIRED: {
      icon: XCircle,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      text: 'منقضی شده'
    }
  };

  useEffect(() => {
    if (transaction) {
      loadPayments();
      startTimer();
    }
  }, [transaction]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/p2p/transactions/${transaction._id}/payments`);
      setPayments(response.data);
    } catch (error) {
      console.error('Error loading payments:', error);
      toast.error('خطا در بارگذاری پرداخت‌ها');
    } finally {
      setLoading(false);
    }
  };

  const startTimer = () => {
    if (!transaction.expiresAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(transaction.expiresAt).getTime();
      const remaining = expiry - now;

      if (remaining <= 0) {
        setTimeRemaining(null);
        onStatusUpdate?.('EXPIRED');
      } else {
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  };

  const handlePaymentUpload = async (files) => {
    try {
      setUploading(true);
      const formData = new FormData();
      
      Array.from(files).forEach((file, index) => {
        formData.append('proofs', file);
      });

      formData.append('accountNumber', document.getElementById('accountNumber').value);
      formData.append('amount', document.getElementById('paymentAmount').value);

      const response = await api.post(
        `/p2p/transactions/${transaction._id}/payments`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );

      toast.success('پرداخت با موفقیت ثبت شد');
      loadPayments();
      onStatusUpdate?.('PAYMENT_CONFIRMED');
    } catch (error) {
      console.error('Error uploading payment:', error);
      toast.error('خطا در ثبت پرداخت');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmPayment = async (paymentId) => {
    try {
      setLoading(true);
      await api.post(`/p2p/transactions/${transaction._id}/payments/${paymentId}/confirm`);
      
      toast.success('پرداخت تایید شد');
      loadPayments();
      onStatusUpdate?.('COMPLETED');
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error('خطا در تایید پرداخت');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTransaction = async () => {
    if (!confirm('آیا از لغو این معامله اطمینان دارید؟')) return;

    try {
      setLoading(true);
      await api.post(`/p2p/transactions/${transaction._id}/cancel`, {
        reason: 'Cancelled by user'
      });
      
      toast.success('معامله لغو شد');
      onStatusUpdate?.('CANCELLED');
    } catch (error) {
      console.error('Error cancelling transaction:', error);
      toast.error('خطا در لغو معامله');
    } finally {
      setLoading(false);
    }
  };

  const canUploadPayment = () => {
    return transaction.status === 'PENDING_PAYMENT' && 
           user.id === transaction.buyerId;
  };

  const canConfirmPayment = () => {
    return transaction.status === 'PAYMENT_CONFIRMED' && 
           user.id === transaction.sellerId;
  };

  const canCancel = () => {
    return ['PENDING', 'PENDING_PAYMENT'].includes(transaction.status) &&
           (user.id === transaction.sellerId || user.id === transaction.buyerId);
  };

  const StatusIcon = statusConfig[transaction.status]?.icon || Clock;
  const statusColor = statusConfig[transaction.status]?.color || 'text-gray-600';
  const statusBgColor = statusConfig[transaction.status]?.bgColor || 'bg-gray-50';
  const statusText = statusConfig[transaction.status]?.text || 'نامشخص';

  return (
    <div className="enhanced-p2p-transaction">
      {/* Transaction Header */}
      <div className={`transaction-header ${statusBgColor} border-l-4 border-l-current ${statusColor}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <StatusIcon className="w-6 h-6" />
            <div>
              <h3 className="text-lg font-semibold">معامله P2P</h3>
              <p className="text-sm opacity-75">{statusText}</p>
            </div>
          </div>
          
          {timeRemaining && (
            <div className="flex items-center space-x-2 text-orange-600">
              <Clock className="w-4 h-4" />
              <span className="font-mono">{timeRemaining}</span>
            </div>
          )}
        </div>
      </div>

      {/* Transaction Details */}
      <div className="transaction-details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Amount and Currency */}
          <div className="detail-card">
            <div className="flex items-center space-x-2 mb-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <h4 className="font-semibold">مبلغ و ارز</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>مبلغ اصلی:</span>
                <span className="font-mono">
                  {transaction.amount.toLocaleString()} {transaction.currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span>معادل ریالی:</span>
                <span className="font-mono">
                  {transaction.irrAmount?.toLocaleString()} ریال
                </span>
              </div>
              <div className="flex justify-between">
                <span>نرخ ارز:</span>
                <span className="font-mono">
                  {transaction.exchangeRate?.toLocaleString()} ریال
                </span>
              </div>
            </div>
          </div>

          {/* Users */}
          <div className="detail-card">
            <div className="flex items-center space-x-2 mb-2">
              <User className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold">کاربران</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>فروشنده:</span>
                <span className="font-medium">{transaction.sellerName}</span>
              </div>
              <div className="flex justify-between">
                <span>خریدار:</span>
                <span className="font-medium">{transaction.buyerName}</span>
              </div>
              <div className="flex justify-between">
                <span>روش پرداخت:</span>
                <span className="font-medium">{transaction.paymentMethod}</span>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="detail-card">
            <div className="flex items-center space-x-2 mb-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              <h4 className="font-semibold">تاریخ‌ها</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>تاریخ ایجاد:</span>
                <span className="font-mono text-sm">
                  {new Date(transaction.createdAt).toLocaleDateString('fa-IR')}
                </span>
              </div>
              {transaction.completedAt && (
                <div className="flex justify-between">
                  <span>تاریخ تکمیل:</span>
                  <span className="font-mono text-sm">
                    {new Date(transaction.completedAt).toLocaleDateString('fa-IR')}
                  </span>
                </div>
              )}
              {transaction.expiresAt && (
                <div className="flex justify-between">
                  <span>تاریخ انقضا:</span>
                  <span className="font-mono text-sm">
                    {new Date(transaction.expiresAt).toLocaleDateString('fa-IR')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Security */}
          <div className="detail-card">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="w-5 h-5 text-red-600" />
              <h4 className="font-semibold">امنیت</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>وضعیت:</span>
                <span className={`px-2 py-1 rounded-full text-xs ${statusBgColor} ${statusColor}`}>
                  {statusText}
                </span>
              </div>
              <div className="flex justify-between">
                <span>تایید شده:</span>
                <span className={transaction.verified ? 'text-green-600' : 'text-red-600'}>
                  {transaction.verified ? 'بله' : 'خیر'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payments Section */}
      <div className="payments-section">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold">پرداخت‌ها</h4>
          <button
            onClick={() => setShowPayments(!showPayments)}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
          >
            <Eye className="w-4 h-4" />
            <span>{showPayments ? 'مخفی کردن' : 'نمایش'}</span>
          </button>
        </div>

        {showPayments && (
          <div className="payments-list">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin" />
                <span className="mr-2">در حال بارگذاری...</span>
              </div>
            ) : payments.length > 0 ? (
              <div className="space-y-4">
                {payments.map((payment) => (
                  <div key={payment._id} className="payment-item">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="payment-status">
                          {payment.status === 'CONFIRMED' && (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          )}
                          {payment.status === 'PENDING' && (
                            <Clock className="w-5 h-5 text-yellow-600" />
                          )}
                          {payment.status === 'REJECTED' && (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {payment.amount.toLocaleString()} ریال
                          </p>
                          <p className="text-sm text-gray-600">
                            شماره حساب: {payment.accountNumber}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {payment.proofImageUrl && (
                          <a
                            href={payment.proofImageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            مشاهده رسید
                          </a>
                        )}
                        
                        {payment.status === 'PENDING' && canConfirmPayment() && (
                          <button
                            onClick={() => handleConfirmPayment(payment._id)}
                            disabled={loading}
                            className="btn btn-success btn-sm"
                          >
                            تایید
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                هنوز پرداختی ثبت نشده است
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        {canUploadPayment() && (
          <div className="payment-upload-section">
            <h5 className="font-semibold mb-3">ثبت پرداخت جدید</h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                id="accountNumber"
                type="text"
                placeholder="شماره حساب"
                className="form-input"
              />
              <input
                id="paymentAmount"
                type="number"
                placeholder="مبلغ پرداختی"
                className="form-input"
              />
              <input
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={(e) => handlePaymentUpload(e.target.files)}
                disabled={uploading}
                className="form-input"
              />
            </div>
            {uploading && (
              <div className="flex items-center justify-center mt-2">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                <span>در حال آپلود...</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end space-x-3 space-x-reverse">
          {canCancel() && (
            <button
              onClick={handleCancelTransaction}
              disabled={loading}
              className="btn btn-danger"
            >
              لغو معامله
            </button>
          )}
          
          <button
            onClick={() => window.print()}
            className="btn btn-secondary"
          >
            چاپ
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedP2PTransaction; 