import React, { useState, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { motion } from 'framer-motion';
import PersianUtils from '../utils/persian';
import PersianCalendar from '../utils/persianCalendar';
import '../styles/rtl.css';

const VirtualizedTransactionList = ({ 
  transactions = [], 
  onTransactionClick = () => {}, 
  height = 600,
  itemHeight = 80 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Memoized filtered and sorted transactions
  const processedTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(transaction =>
        transaction.customerName?.toLowerCase().includes(searchLower) ||
        transaction.id?.toLowerCase().includes(searchLower) ||
        transaction.type?.toLowerCase().includes(searchLower) ||
        transaction.currency?.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (filterStatus) {
      filtered = filtered.filter(transaction => transaction.status === filterStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'date') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (sortBy === 'amount') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [transactions, searchTerm, filterStatus, sortBy, sortOrder]);

  // Transaction row component
  const TransactionRow = useCallback(({ index, style }) => {
    const transaction = processedTransactions[index];
    
    if (!transaction) return null;

    const getStatusColor = (status) => {
      switch (status) {
        case 'completed': return 'text-green-600 bg-green-50';
        case 'pending': return 'text-yellow-600 bg-yellow-50';
        case 'processing': return 'text-blue-600 bg-blue-50';
        case 'cancelled': return 'text-red-600 bg-red-50';
        case 'failed': return 'text-red-600 bg-red-50';
        default: return 'text-gray-600 bg-gray-50';
      }
    };

    const getStatusLabel = (status) => {
      switch (status) {
        case 'completed': return 'تکمیل شده';
        case 'pending': return 'در انتظار';
        case 'processing': return 'در حال پردازش';
        case 'cancelled': return 'لغو شده';
        case 'failed': return 'ناموفق';
        default: return status;
      }
    };

    return (
      <div style={style} className="px-4">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.02, backgroundColor: '#f8fafc' }}
          onClick={() => onTransactionClick(transaction)}
          className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-gray-200 cursor-pointer mb-2 rtl-container"
        >
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3 space-x-reverse">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                  {transaction.type === 'buy' ? '📈' : transaction.type === 'sell' ? '📉' : '💱'}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{transaction.customerName || 'نامشخص'}</div>
                  <div className="text-sm text-gray-600">کد: {transaction.id}</div>
                </div>
              </div>
              <div className="text-left">
                <div className="font-bold text-lg">
                  {PersianUtils.formatCurrency(transaction.amount, transaction.currency)}
                </div>
                <div className="text-sm text-gray-600">
                  {PersianCalendar.formatWithTime(transaction.date)}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 space-x-reverse">
                <span className="text-sm text-gray-600">نوع:</span>
                <span className="text-sm font-medium">
                  {transaction.type === 'buy' ? 'خرید' : 
                   transaction.type === 'sell' ? 'فروش' : 
                   transaction.type === 'exchange' ? 'تبدیل' : 
                   transaction.type === 'remittance' ? 'حواله' : transaction.type}
                </span>
                {transaction.fromCurrency && transaction.toCurrency && (
                  <>
                    <span className="text-sm text-gray-600">از</span>
                    <span className="text-sm font-medium">{transaction.fromCurrency}</span>
                    <span className="text-sm text-gray-600">به</span>
                    <span className="text-sm font-medium">{transaction.toCurrency}</span>
                  </>
                )}
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(transaction.status)}`}>
                {getStatusLabel(transaction.status)}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }, [processedTransactions, onTransactionClick]);

  return (
    <div className="rtl-container font-persian">
      {/* Controls */}
      <div className="mb-6 persian-card">
        <div className="persian-card-body">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">جستجو</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="نام مشتری، کد تراکنش..."
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">وضعیت</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">همه وضعیت‌ها</option>
                <option value="completed">تکمیل شده</option>
                <option value="pending">در انتظار</option>
                <option value="processing">در حال پردازش</option>
                <option value="cancelled">لغو شده</option>
                <option value="failed">ناموفق</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">مرتب‌سازی بر اساس</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="date">تاریخ</option>
                <option value="amount">مبلغ</option>
                <option value="customerName">نام مشتری</option>
                <option value="type">نوع تراکنش</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ترتیب</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="desc">نزولی</option>
                <option value="asc">صعودی</option>
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">تعداد کل:</span>
                <span className="font-bold mr-2">{PersianUtils.formatNumber(transactions.length, true)}</span>
              </div>
              <div>
                <span className="text-gray-600">فیلتر شده:</span>
                <span className="font-bold mr-2">{PersianUtils.formatNumber(processedTransactions.length, true)}</span>
              </div>
              <div>
                <span className="text-gray-600">تکمیل شده:</span>
                <span className="font-bold mr-2 text-green-600">
                  {PersianUtils.formatNumber(
                    processedTransactions.filter(t => t.status === 'completed').length, 
                    true
                  )}
                </span>
              </div>
              <div>
                <span className="text-gray-600">در انتظار:</span>
                <span className="font-bold mr-2 text-yellow-600">
                  {PersianUtils.formatNumber(
                    processedTransactions.filter(t => t.status === 'pending').length, 
                    true
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Virtual List */}
      <div className="persian-card">
        <div className="persian-card-header">
          <h3 className="text-lg font-semibold">
            لیست تراکنش‌ها ({PersianUtils.formatNumber(processedTransactions.length, true)} مورد)
          </h3>
        </div>
        <div className="persian-card-body p-0">
          {processedTransactions.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 text-4xl mb-4">📄</div>
              <p className="text-gray-600">
                {searchTerm || filterStatus ? 'هیچ تراکنشی با فیلترهای انتخابی یافت نشد' : 'هیچ تراکنشی یافت نشد'}
              </p>
              {(searchTerm || filterStatus) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('');
                  }}
                  className="mt-4 text-blue-600 hover:text-blue-800"
                >
                  پاک کردن فیلترها
                </button>
              )}
            </div>
          ) : (
            <List
              height={height}
              itemCount={processedTransactions.length}
              itemSize={itemHeight}
              className="rtl-container"
              direction="rtl"
            >
              {TransactionRow}
            </List>
          )}
        </div>
      </div>
    </div>
  );
};

// Generate sample transaction data for demonstration
export const generateSampleTransactions = (count = 1000) => {
  const transactions = [];
  const types = ['buy', 'sell', 'exchange', 'remittance'];
  const currencies = ['USD', 'EUR', 'GBP', 'AED', 'CAD', 'AUD', 'IRR'];
  const statuses = ['completed', 'pending', 'processing', 'cancelled', 'failed'];
  const customers = [
    'احمد محمدی', 'فاطمه احمدی', 'علی رضایی', 'مریم صادقی', 'حسن کریمی',
    'زهرا موسوی', 'محمد جوادی', 'نرگس احمدی', 'رضا حسینی', 'سارا کاظمی'
  ];

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const fromCurrency = currencies[Math.floor(Math.random() * currencies.length)];
    let toCurrency = currencies[Math.floor(Math.random() * currencies.length)];
    
    // Ensure different currencies for exchange
    while (toCurrency === fromCurrency && type === 'exchange') {
      toCurrency = currencies[Math.floor(Math.random() * currencies.length)];
    }

    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30)); // Last 30 days
    date.setHours(Math.floor(Math.random() * 24));
    date.setMinutes(Math.floor(Math.random() * 60));

    transactions.push({
      id: `TXN${(1000000 + i).toString().slice(1)}`,
      type: type,
      customerName: customers[Math.floor(Math.random() * customers.length)],
      amount: Math.floor(Math.random() * 10000000) + 100000, // 100K to 10M
      currency: type === 'exchange' ? fromCurrency : (fromCurrency === 'IRR' ? toCurrency : fromCurrency),
      fromCurrency: type === 'exchange' ? fromCurrency : null,
      toCurrency: type === 'exchange' ? toCurrency : null,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      date: date.toISOString(),
      description: `تراکنش ${type} ${fromCurrency}${type === 'exchange' ? ` به ${toCurrency}` : ''}`,
      branchId: 'branch-1',
      userId: Math.floor(Math.random() * 10) + 1
    });
  }

  return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
};

export default VirtualizedTransactionList;