import React, { useState, useEffect } from 'react';
import LANGUAGE_UTILS from '../../utils/language';

const TransactionManager = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [filters, setFilters] = useState({
        status: '',
        type: '',
        dateRange: {
            start: '',
            end: ''
        }
    });

    useEffect(() => {
        fetchTransactions();
    }, [filters]);

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams();
            if (filters.status) queryParams.append('status', filters.status);
            if (filters.type) queryParams.append('type', filters.type);
            if (filters.dateRange.start) queryParams.append('start_date', filters.dateRange.start);
            if (filters.dateRange.end) queryParams.append('end_date', filters.dateRange.end);

            const response = await fetch(`/api/transactions?${queryParams.toString()}`);
            const data = await response.json();
            setTransactions(data);
        } catch (err) {
            setError(LANGUAGE_UTILS.getTranslation('transactions.fetchError', 'خطا در دریافت تراکنش‌ها'));
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (transactionId, newStatus) => {
        try {
            const response = await fetch(`/api/transactions/${transactionId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) {
                throw new Error(LANGUAGE_UTILS.getTranslation('transactions.updateError', 'خطا در بروزرسانی وضعیت'));
            }

            await fetchTransactions();
        } catch (err) {
            setError(err.message);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-4">
                <div className="loading loading-spinner loading-lg"></div>
                <span className="ml-2">{LANGUAGE_UTILS.getTranslation('common.loading', 'در حال بارگذاری...')}</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert alert-error">
                <span>{error}</span>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">
                    {LANGUAGE_UTILS.getTranslation('transactions.management', 'مدیریت تراکنش‌ها')}
                </h1>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">
                                {LANGUAGE_UTILS.getTranslation('transactions.status', 'وضعیت')}
                            </span>
                        </label>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="select select-bordered"
                        >
                            <option value="">{LANGUAGE_UTILS.getTranslation('common.all', 'همه')}</option>
                            <option value="pending">{LANGUAGE_UTILS.getTranslation('transactions.pending', 'در انتظار')}</option>
                            <option value="completed">{LANGUAGE_UTILS.getTranslation('transactions.completed', 'تکمیل شده')}</option>
                            <option value="failed">{LANGUAGE_UTILS.getTranslation('transactions.failed', 'ناموفق')}</option>
                        </select>
                    </div>
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">
                                {LANGUAGE_UTILS.getTranslation('transactions.type', 'نوع')}
                            </span>
                        </label>
                        <select
                            value={filters.type}
                            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                            className="select select-bordered"
                        >
                            <option value="">{LANGUAGE_UTILS.getTranslation('common.all', 'همه')}</option>
                            <option value="deposit">{LANGUAGE_UTILS.getTranslation('transactions.deposit', 'واریز')}</option>
                            <option value="withdrawal">{LANGUAGE_UTILS.getTranslation('transactions.withdrawal', 'برداشت')}</option>
                            <option value="transfer">{LANGUAGE_UTILS.getTranslation('transactions.transfer', 'انتقال')}</option>
                        </select>
                    </div>
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">
                                {LANGUAGE_UTILS.getTranslation('transactions.startDate', 'تاریخ شروع')}
                            </span>
                        </label>
                        <input
                            type="date"
                            value={filters.dateRange.start}
                            onChange={(e) => setFilters({
                                ...filters,
                                dateRange: { ...filters.dateRange, start: e.target.value }
                            })}
                            className="input input-bordered"
                        />
                    </div>
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">
                                {LANGUAGE_UTILS.getTranslation('transactions.endDate', 'تاریخ پایان')}
                            </span>
                        </label>
                        <input
                            type="date"
                            value={filters.dateRange.end}
                            onChange={(e) => setFilters({
                                ...filters,
                                dateRange: { ...filters.dateRange, end: e.target.value }
                            })}
                            className="input input-bordered"
                        />
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="overflow-x-auto">
                <table className="table w-full">
                    <thead>
                        <tr>
                            <th>{LANGUAGE_UTILS.getTranslation('transactions.id', 'شناسه')}</th>
                            <th>{LANGUAGE_UTILS.getTranslation('transactions.type', 'نوع')}</th>
                            <th>{LANGUAGE_UTILS.getTranslation('transactions.amount', 'مبلغ')}</th>
                            <th>{LANGUAGE_UTILS.getTranslation('transactions.status', 'وضعیت')}</th>
                            <th>{LANGUAGE_UTILS.getTranslation('transactions.date', 'تاریخ')}</th>
                            <th>{LANGUAGE_UTILS.getTranslation('common.actions', 'عملیات')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map((transaction) => (
                            <tr key={transaction.id}>
                                <td>{transaction.id}</td>
                                <td>
                                    {LANGUAGE_UTILS.getTranslation(`transactions.${transaction.type}`, transaction.type)}
                                </td>
                                <td>{LANGUAGE_UTILS.formatCurrency(transaction.amount, transaction.currency)}</td>
                                <td>
                                    <span className={`badge ${
                                        transaction.status === 'completed' ? 'badge-success' :
                                        transaction.status === 'pending' ? 'badge-warning' :
                                        'badge-error'
                                    }`}>
                                        {LANGUAGE_UTILS.getTranslation(`transactions.${transaction.status}`, transaction.status)}
                                    </span>
                                </td>
                                <td>{LANGUAGE_UTILS.formatDate(transaction.created_at)}</td>
                                <td>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => {
                                                setSelectedTransaction(transaction);
                                                setShowDetailsModal(true);
                                            }}
                                            className="btn btn-sm btn-info"
                                        >
                                            {LANGUAGE_UTILS.getTranslation('common.details', 'جزئیات')}
                                        </button>
                                        {transaction.status === 'pending' && (
                                            <select
                                                onChange={(e) => handleStatusChange(transaction.id, e.target.value)}
                                                className="select select-bordered select-sm"
                                            >
                                                <option value="">{LANGUAGE_UTILS.getTranslation('common.changeStatus', 'تغییر وضعیت')}</option>
                                                <option value="completed">{LANGUAGE_UTILS.getTranslation('transactions.complete', 'تکمیل')}</option>
                                                <option value="failed">{LANGUAGE_UTILS.getTranslation('transactions.fail', 'ناموفق')}</option>
                                            </select>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Transaction Details Modal */}
            {showDetailsModal && selectedTransaction && (
                <div className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg mb-4">
                            {LANGUAGE_UTILS.getTranslation('transactions.details', 'جزئیات تراکنش')}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="font-semibold">
                                    {LANGUAGE_UTILS.getTranslation('transactions.id', 'شناسه')}:
                                </label>
                                <p>{selectedTransaction.id}</p>
                            </div>
                            <div>
                                <label className="font-semibold">
                                    {LANGUAGE_UTILS.getTranslation('transactions.type', 'نوع')}:
                                </label>
                                <p>
                                    {LANGUAGE_UTILS.getTranslation(`transactions.${selectedTransaction.type}`, selectedTransaction.type)}
                                </p>
                            </div>
                            <div>
                                <label className="font-semibold">
                                    {LANGUAGE_UTILS.getTranslation('transactions.amount', 'مبلغ')}:
                                </label>
                                <p>{LANGUAGE_UTILS.formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}</p>
                            </div>
                            <div>
                                <label className="font-semibold">
                                    {LANGUAGE_UTILS.getTranslation('transactions.status', 'وضعیت')}:
                                </label>
                                <p>
                                    {LANGUAGE_UTILS.getTranslation(`transactions.${selectedTransaction.status}`, selectedTransaction.status)}
                                </p>
                            </div>
                            <div>
                                <label className="font-semibold">
                                    {LANGUAGE_UTILS.getTranslation('transactions.date', 'تاریخ')}:
                                </label>
                                <p>{LANGUAGE_UTILS.formatDate(selectedTransaction.created_at)}</p>
                            </div>
                            {selectedTransaction.description && (
                                <div>
                                    <label className="font-semibold">
                                        {LANGUAGE_UTILS.getTranslation('transactions.description', 'توضیحات')}:
                                    </label>
                                    <p>{selectedTransaction.description}</p>
                                </div>
                            )}
                        </div>
                        <div className="modal-action">
                            <button
                                onClick={() => {
                                    setShowDetailsModal(false);
                                    setSelectedTransaction(null);
                                }}
                                className="btn"
                            >
                                {LANGUAGE_UTILS.getTranslation('common.close', 'بستن')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransactionManager; 