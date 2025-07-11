import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { formatCurrency, formatDate } from '../../utils/format';
import './TransactionTable.css';

/**
 * Comprehensive Transaction Table Component
 * Features: Filtering, Sorting, Pagination, Export
 */
const TransactionTable = ({ transactions = [], onTransactionClick, onStatusChange }) => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  
  // State management
  const [filteredTransactions, setFilteredTransactions] = useState(transactions);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    currency: '',
    dateRange: { start: '', end: '' },
    search: ''
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'createdAt',
    direction: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedTransactions, setSelectedTransactions] = useState([]);

  // Process transactions with filters and sorting
  const processedTransactions = useMemo(() => {
    let result = [...transactions];

    // Apply filters
    if (filters.status) {
      result = result.filter(t => t.status === filters.status);
    }
    if (filters.type) {
      result = result.filter(t => t.type === filters.type);
    }
    if (filters.currency) {
      result = result.filter(t => 
        t.fromCurrency === filters.currency || t.toCurrency === filters.currency
      );
    }
    if (filters.dateRange.start) {
      result = result.filter(t => new Date(t.createdAt) >= new Date(filters.dateRange.start));
    }
    if (filters.dateRange.end) {
      result = result.filter(t => new Date(t.createdAt) <= new Date(filters.dateRange.end));
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(t => 
        t.transactionId.toLowerCase().includes(searchLower) ||
        t.customerName?.toLowerCase().includes(searchLower) ||
        t.type.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return result;
  }, [transactions, filters, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(processedTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTransactions = processedTransactions.slice(startIndex, endIndex);

  // Handle sorting
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Handle bulk selection
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedTransactions(currentTransactions.map(t => t._id));
    } else {
      setSelectedTransactions([]);
    }
  };

  const handleSelectTransaction = (transactionId, checked) => {
    if (checked) {
      setSelectedTransactions(prev => [...prev, transactionId]);
    } else {
      setSelectedTransactions(prev => prev.filter(id => id !== transactionId));
    }
  };

  // Export functionality
  const exportToCSV = () => {
    const headers = [
      'Transaction ID',
      'Type',
      'Status',
      'Amount',
      'From Currency',
      'To Currency',
      'Exchange Rate',
      'Commission',
      'Total Amount',
      'Customer',
      'Created Date'
    ];

    const csvContent = [
      headers.join(','),
      ...currentTransactions.map(t => [
        t.transactionId,
        t.type,
        t.status,
        t.amount,
        t.fromCurrency,
        t.toCurrency,
        t.exchangeRate,
        t.commission,
        t.totalAmount,
        t.customerName,
        formatDate(t.createdAt)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${formatDate(new Date())}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    // PDF export implementation
    console.log('Exporting to PDF...');
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    const statusClasses = {
      pending: 'status-pending',
      partial_paid: 'status-partial',
      completed: 'status-completed',
      cancelled: 'status-cancelled',
      failed: 'status-failed'
    };
    return statusClasses[status] || 'status-default';
  };

  return (
    <div className="transaction-table-container">
      {/* Filters and Actions */}
      <div className="table-controls">
        <div className="filters-section">
          <div className="filter-group">
            <label>Status:</label>
            <select 
              value={filters.status} 
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="partial_paid">Partial Paid</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Type:</label>
            <select 
              value={filters.type} 
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              <option value="">All Types</option>
              <option value="currency_buy">Currency Buy</option>
              <option value="currency_sell">Currency Sell</option>
              <option value="transfer">Transfer</option>
              <option value="remittance">Remittance</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Currency:</label>
            <select 
              value={filters.currency} 
              onChange={(e) => handleFilterChange('currency', e.target.value)}
            >
              <option value="">All Currencies</option>
              <option value="IRR">IRR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Search:</label>
            <input
              type="text"
              placeholder="Search transactions..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
        </div>

        <div className="actions-section">
          <button 
            className="btn btn-primary"
            onClick={exportToCSV}
            disabled={currentTransactions.length === 0}
          >
            Export CSV
          </button>
          <button 
            className="btn btn-secondary"
            onClick={exportToPDF}
            disabled={currentTransactions.length === 0}
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="transaction-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectedTransactions.length === currentTransactions.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
              <th onClick={() => handleSort('transactionId')}>
                Transaction ID
                {sortConfig.key === 'transactionId' && (
                  <span className={`sort-arrow ${sortConfig.direction}`}>▼</span>
                )}
              </th>
              <th onClick={() => handleSort('type')}>
                Type
                {sortConfig.key === 'type' && (
                  <span className={`sort-arrow ${sortConfig.direction}`}>▼</span>
                )}
              </th>
              <th onClick={() => handleSort('status')}>
                Status
                {sortConfig.key === 'status' && (
                  <span className={`sort-arrow ${sortConfig.direction}`}>▼</span>
                )}
              </th>
              <th onClick={() => handleSort('amount')}>
                Amount
                {sortConfig.key === 'amount' && (
                  <span className={`sort-arrow ${sortConfig.direction}`}>▼</span>
                )}
              </th>
              <th>Currencies</th>
              <th onClick={() => handleSort('exchangeRate')}>
                Rate
                {sortConfig.key === 'exchangeRate' && (
                  <span className={`sort-arrow ${sortConfig.direction}`}>▼</span>
                )}
              </th>
              <th>Commission</th>
              <th>Total</th>
              <th onClick={() => handleSort('createdAt')}>
                Date
                {sortConfig.key === 'createdAt' && (
                  <span className={`sort-arrow ${sortConfig.direction}`}>▼</span>
                )}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentTransactions.map(transaction => (
              <tr 
                key={transaction._id}
                className={`transaction-row ${selectedTransactions.includes(transaction._id) ? 'selected' : ''}`}
                onClick={() => onTransactionClick?.(transaction)}
              >
                <td>
                  <input
                    type="checkbox"
                    checked={selectedTransactions.includes(transaction._id)}
                    onChange={(e) => handleSelectTransaction(transaction._id, e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
                <td className="transaction-id">
                  {transaction.transactionId}
                </td>
                <td>
                  <span className={`type-badge type-${transaction.type}`}>
                    {transaction.type.replace('_', ' ')}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${getStatusBadgeClass(transaction.status)}`}>
                    {transaction.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="amount-cell">
                  {formatCurrency(transaction.amount, transaction.fromCurrency)}
                </td>
                <td className="currencies-cell">
                  <div className="currency-pair">
                    <span className="currency-icon">{transaction.fromCurrency}</span>
                    <span className="arrow">→</span>
                    <span className="currency-icon">{transaction.toCurrency}</span>
                  </div>
                </td>
                <td className="rate-cell">
                  {formatCurrency(transaction.exchangeRate, 'IRR')}
                </td>
                <td className="commission-cell">
                  {formatCurrency(transaction.commission, transaction.fromCurrency)}
                </td>
                <td className="total-cell">
                  {formatCurrency(transaction.totalAmount, transaction.fromCurrency)}
                </td>
                <td className="date-cell">
                  {formatDate(transaction.createdAt)}
                </td>
                <td className="actions-cell">
                  <div className="action-buttons">
                    <button 
                      className="btn btn-sm btn-outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTransactionClick?.(transaction);
                      }}
                    >
                      View
                    </button>
                    {transaction.status === 'pending' && (
                      <button 
                        className="btn btn-sm btn-success"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStatusChange?.(transaction._id, 'completed');
                        }}
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination-controls">
        <div className="pagination-info">
          Showing {startIndex + 1} to {Math.min(endIndex, processedTransactions.length)} of {processedTransactions.length} transactions
        </div>
        
        <div className="pagination-buttons">
          <button 
            className="btn btn-outline"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
          >
            Previous
          </button>
          
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const page = i + 1;
            return (
              <button
                key={page}
                className={`btn ${currentPage === page ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            );
          })}
          
          <button 
            className="btn btn-outline"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => prev + 1)}
          >
            Next
          </button>
        </div>

        <div className="items-per-page">
          <label>Items per page:</label>
          <select 
            value={itemsPerPage} 
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default TransactionTable; 