import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fa_IR } from 'date-fns/locale';
import Button from '../common/Button';
import { LoadingSpinner } from '../common/Loading';

interface P2POrder {
  id: string;
  type: 'buy' | 'sell';
  currencyFrom: string;
  currencyTo: string;
  amountFrom: number;
  amountTo: number;
  exchangeRate: number;
  status: 'active' | 'pending' | 'completed' | 'cancelled';
  createdAt: string;
  user: {
    id: string;
    name: string;
    rating?: number;
    completedOrders?: number;
  };
  paymentMethods: Array<{
    type: string;
    details: string;
  }>;
  location?: {
    country: string;
    city: string;
  };
  limits?: {
    minAmount: number;
    maxAmount: number;
  };
}

interface P2POrderCardProps {
  order: P2POrder;
  currentUserId?: string;
  onContact: (orderId: string) => void;
  onSelect: (order: P2POrder) => void;
  loading?: boolean;
  className?: string;
}

const P2POrderCard: React.FC<P2POrderCardProps> = ({
  order,
  currentUserId,
  onContact,
  onSelect,
  loading = false,
  className,
}) => {
  const isOwnOrder = order.user.id === currentUserId;
  const isActive = order.status === 'active';

  const getStatusColor = (status: string): string => {
    const colors = {
      active: 'text-green-600 bg-green-50',
      pending: 'text-yellow-600 bg-yellow-50',
      completed: 'text-blue-600 bg-blue-50',
      cancelled: 'text-red-600 bg-red-50',
    };
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-50';
  };

  const getTypeColor = (type: string): string => {
    return type === 'buy' ? 'text-green-600' : 'text-red-600';
  };

  const getTypeLabel = (type: string): string => {
    return type === 'buy' ? 'خرید' : 'فروش';
  };

  const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('fa-IR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatRate = (rate: number): string => {
    return new Intl.NumberFormat('fa-IR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(rate);
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 ${className}`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(order.type)} bg-opacity-10`}>
              {getTypeLabel(order.type)}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
              {order.status === 'active' && 'فعال'}
              {order.status === 'pending' && 'در انتظار'}
              {order.status === 'completed' && 'تکمیل شده'}
              {order.status === 'cancelled' && 'لغو شده'}
            </span>
          </div>
          
          <div className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(order.createdAt), {
              addSuffix: true,
              locale: fa_IR,
            })}
          </div>
        </div>

        {/* Exchange Details */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              {order.currencyFrom} → {order.currencyTo}
            </span>
            <span className="text-sm text-gray-500">
              نرخ: {formatRate(order.exchangeRate)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-lg font-bold text-gray-900">
              {formatCurrency(order.amountFrom, order.currencyFrom)}
            </div>
            <div className="text-gray-400 mx-2">→</div>
            <div className="text-lg font-bold text-gray-900">
              {formatCurrency(order.amountTo, order.currencyTo)}
            </div>
          </div>
        </div>

        {/* Limits */}
        {order.limits && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-600 mb-1">محدوده معامله:</div>
            <div className="flex justify-between text-sm">
              <span>حداقل: {formatCurrency(order.limits.minAmount, order.currencyFrom)}</span>
              <span>حداکثر: {formatCurrency(order.limits.maxAmount, order.currencyFrom)}</span>
            </div>
          </div>
        )}

        {/* User Info */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-blue-600">
                {order.user.name.charAt(0)}
              </span>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">
                {order.user.name}
              </div>
              {order.user.rating && (
                <div className="flex items-center text-xs text-gray-500">
                  <span className="text-yellow-400 mr-1">★</span>
                  <span>{order.user.rating.toFixed(1)}</span>
                  {order.user.completedOrders && (
                    <span className="mr-2">({order.user.completedOrders} معامله)</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Location */}
        {order.location && (
          <div className="mb-4 text-sm text-gray-600">
            <span className="mr-1">📍</span>
            {order.location.city}, {order.location.country}
          </div>
        )}

        {/* Payment Methods */}
        {order.paymentMethods.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-gray-600 mb-2">روش‌های پرداخت:</div>
            <div className="flex flex-wrap gap-1">
              {order.paymentMethods.map((method, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-50 text-blue-700"
                >
                  {method.type === 'bank_transfer' && '🏦'}
                  {method.type === 'cash' && '💵'}
                  {method.type === 'crypto' && '₿'}
                  {method.type === 'other' && '💳'}
                  <span className="mr-1">{method.details}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-2">
          {!isOwnOrder && isActive && (
            <Button
              onClick={() => onContact(order.id)}
              variant="primary"
              size="sm"
              className="flex-1"
              loading={loading}
            >
              تماس
            </Button>
          )}
          
          <Button
            onClick={() => onSelect(order)}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            جزئیات
          </Button>
        </div>
      </div>
    </div>
  );
};

export default P2POrderCard; 