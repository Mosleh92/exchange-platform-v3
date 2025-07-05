import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { formatCurrency } from '../utils/format';
import LANGUAGE_UTILS from '../utils/language';

const TransactionStatus = () => {
    const { transactionId } = useParams();
    const [transaction, setTransaction] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [statusHistory, setStatusHistory] = useState([]);

    useEffect(() => {
        if (transactionId) {
            fetchTransaction();
            fetchStatusHistory();
        }
    }, [transactionId]);

    const fetchTransaction = async () => {
        try {
            const response = await axios.get(`/api/transactions/${transactionId}`);
            setTransaction(response.data.data);
        } catch (err) {
            setError(LANGUAGE_UTILS.getTranslation('transactions.fetchError', 'خطا در دریافت اطلاعات تراکنش'));
        } finally {
            setLoading(false);
        }
    };

    const fetchStatusHistory = async () => {
        try {
            const response = await axios.get(`/api/transactions/${transactionId}/history`);
            setStatusHistory(response.data.data);
        } catch (err) {
            console.error(LANGUAGE_UTILS.getTranslation('transactions.historyError', 'خطا در دریافت تاریخچه وضعیت'));
        }
    };

    const handleFileChange = (e) => {
        setSelectedFile(e.target.files[0]);
    };

    const handleReceiptUpload = async (accountNumber) => {
        if (!selectedFile) return;

        const formData = new FormData();
        formData.append('receipt', selectedFile);
        formData.append('amount', transaction.split_payments.find(p => p.account_number === accountNumber).amount);

        try {
            const response = await axios.post(
                `/api/transactions/workflow/${transactionId}/split-payments/${accountNumber}/receipt`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            setTransaction(response.data.data);
            setSelectedFile(null);
            setSelectedAccount(null);
        } catch (err) {
            setError('Error uploading receipt');
        }
    };

    const calculateProgress = () => {
        if (!transaction || !transaction.split_payments) return 0;
        const completed = transaction.split_payments.filter(p => p.status === 'completed').length;
        return (completed / transaction.split_payments.length) * 100;
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed':
                return 'text-green-600';
            case 'pending':
                return 'text-yellow-600';
            case 'failed':
                return 'text-red-600';
            default:
                return 'text-gray-600';
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

    if (!transaction) {
        return (
            <div className="alert alert-warning">
                <span>{LANGUAGE_UTILS.getTranslation('transactions.notFound', 'تراکنش یافت نشد')}</span>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold">
                            {LANGUAGE_UTILS.getTranslation('transactions.status', 'وضعیت تراکنش')}
                        </h1>
                        <span className={`text-lg font-semibold ${getStatusColor(transaction.status)}`}>
                            {LANGUAGE_UTILS.getTranslation(`transactions.${transaction.status}`, transaction.status)}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-4">
                                {LANGUAGE_UTILS.getTranslation('transactions.details', 'جزئیات تراکنش')}
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-gray-600">
                                        {LANGUAGE_UTILS.getTranslation('transactions.id', 'شناسه تراکنش')}:
                                    </label>
                                    <p className="font-medium">{transaction.id}</p>
                                </div>
                                <div>
                                    <label className="text-gray-600">
                                        {LANGUAGE_UTILS.getTranslation('transactions.type', 'نوع تراکنش')}:
                                    </label>
                                    <p className="font-medium">
                                        {LANGUAGE_UTILS.getTranslation(`transactions.${transaction.type}`, transaction.type)}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-gray-600">
                                        {LANGUAGE_UTILS.getTranslation('transactions.amount', 'مبلغ')}:
                                    </label>
                                    <p className="font-medium">
                                        {LANGUAGE_UTILS.formatCurrency(transaction.amount, transaction.currency)}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-gray-600">
                                        {LANGUAGE_UTILS.getTranslation('transactions.date', 'تاریخ')}:
                                    </label>
                                    <p className="font-medium">
                                        {LANGUAGE_UTILS.formatDate(transaction.created_at)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold mb-4">
                                {LANGUAGE_UTILS.getTranslation('transactions.parties', 'طرفین تراکنش')}
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-gray-600">
                                        {LANGUAGE_UTILS.getTranslation('transactions.sender', 'فرستنده')}:
                                    </label>
                                    <p className="font-medium">{transaction.sender_name}</p>
                                </div>
                                <div>
                                    <label className="text-gray-600">
                                        {LANGUAGE_UTILS.getTranslation('transactions.receiver', 'گیرنده')}:
                                    </label>
                                    <p className="font-medium">{transaction.receiver_name}</p>
                                </div>
                                {transaction.reference_number && (
                                    <div>
                                        <label className="text-gray-600">
                                            {LANGUAGE_UTILS.getTranslation('transactions.reference', 'شماره مرجع')}:
                                        </label>
                                        <p className="font-medium">{transaction.reference_number}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {statusHistory.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-4">
                                {LANGUAGE_UTILS.getTranslation('transactions.history', 'تاریخچه وضعیت')}
                            </h3>
                            <div className="space-y-4">
                                {statusHistory.map((history, index) => (
                                    <div key={index} className="flex items-start space-x-4">
                                        <div className={`w-2 h-2 rounded-full mt-2 ${
                                            history.status === 'completed' ? 'bg-green-500' :
                                            history.status === 'pending' ? 'bg-yellow-500' :
                                            'bg-red-500'
                                        }`}></div>
                                        <div>
                                            <p className="font-medium">
                                                {LANGUAGE_UTILS.getTranslation(`transactions.${history.status}`, history.status)}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {LANGUAGE_UTILS.formatDate(history.created_at)}
                                            </p>
                                            {history.note && (
                                                <p className="text-sm text-gray-600 mt-1">{history.note}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {transaction.status === 'pending' && (
                        <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                            <p className="text-yellow-800">
                                {LANGUAGE_UTILS.getTranslation('transactions.pendingNote', 'این تراکنش در حال پردازش است. لطفا صبر کنید.')}
                            </p>
                        </div>
                    )}

                    {/* Transaction Summary */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <h2 className="text-lg font-semibold mb-2">
                                {LANGUAGE_UTILS.getTranslation('transactions.information', 'اطلاعات تراکنش')}
                            </h2>
                            <div className="space-y-2">
                                <p>
                                    {LANGUAGE_UTILS.getTranslation('transactions.status', 'وضعیت')}:{' '}
                                    <span className="font-medium">
                                        {LANGUAGE_UTILS.getTranslation(`transactions.${transaction.transaction_flow.status}`, transaction.transaction_flow.status)}
                                    </span>
                                </p>
                                <p>
                                    {LANGUAGE_UTILS.getTranslation('transactions.customer', 'مشتری')}:{' '}
                                    <span className="font-medium">{transaction.customer_name}</span>
                                </p>
                                <p>
                                    {LANGUAGE_UTILS.getTranslation('transactions.customerType', 'نوع مشتری')}:{' '}
                                    <span className="font-medium">
                                        {LANGUAGE_UTILS.getTranslation(`customers.types.${transaction.customer_type}`, transaction.customer_type)}
                                    </span>
                                </p>
                                <p>
                                    {LANGUAGE_UTILS.getTranslation('transactions.totalAmount', 'مبلغ کل')}:{' '}
                                    <span className="font-medium">
                                        {LANGUAGE_UTILS.formatCurrency(transaction.amount_from, transaction.currency_from)}
                                    </span>
                                </p>
                                <p>
                                    {LANGUAGE_UTILS.getTranslation('transactions.equivalent', 'معادل')}:{' '}
                                    <span className="font-medium">
                                        {LANGUAGE_UTILS.formatCurrency(transaction.amount_to, transaction.currency_to)}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold mb-2">
                                {LANGUAGE_UTILS.getTranslation('transactions.progress', 'پیشرفت پرداخت')}
                            </h2>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                                <div
                                    className="bg-blue-600 h-2.5 rounded-full"
                                    style={{ width: `${calculateProgress()}%` }}
                                ></div>
                            </div>
                            <p className="text-sm text-gray-600">
                                {LANGUAGE_UTILS.getTranslation('transactions.progressText', 'پرداخت شده')}: {calculateProgress()}%
                            </p>
                        </div>
                    </div>

                    {/* Split Payments Section */}
                    {transaction.split_payments && transaction.split_payments.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-4">
                                {LANGUAGE_UTILS.getTranslation('transactions.splitPayments', 'پرداخت‌های تقسیم شده')}
                            </h3>
                            <div className="space-y-4">
                                {transaction.split_payments.map((payment, index) => (
                                    <div key={index} className="border rounded-lg p-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <div>
                                                <p className="font-medium">
                                                    {LANGUAGE_UTILS.getTranslation('transactions.account', 'حساب')}: {payment.account_number}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    {LANGUAGE_UTILS.getTranslation('transactions.bank', 'بانک')}: {payment.bank_name}
                                                </p>
                                            </div>
                                            <span className={`badge ${
                                                payment.status === 'completed' ? 'badge-success' :
                                                payment.status === 'pending' ? 'badge-warning' :
                                                'badge-error'
                                            }`}>
                                                {LANGUAGE_UTILS.getTranslation(`transactions.${payment.status}`, payment.status)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <p className="font-medium">
                                                {LANGUAGE_UTILS.formatCurrency(payment.amount, transaction.currency_from)}
                                            </p>
                                            {payment.status === 'pending' && !payment.receipt && (
                                                <div className="flex space-x-2">
                                                    <input
                                                        type="file"
                                                        onChange={handleFileChange}
                                                        className="file-input file-input-bordered file-input-sm"
                                                        accept="image/*,.pdf"
                                                    />
                                                    <button
                                                        onClick={() => handleReceiptUpload(payment.account_number)}
                                                        disabled={!selectedFile}
                                                        className="btn btn-sm btn-primary"
                                                    >
                                                        {LANGUAGE_UTILS.getTranslation('transactions.uploadReceipt', 'آپلود رسید')}
                                                    </button>
                                                </div>
                                            )}
                                            {payment.receipt && (
                                                <a
                                                    href={payment.receipt}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="btn btn-sm btn-info"
                                                >
                                                    {LANGUAGE_UTILS.getTranslation('transactions.viewReceipt', 'مشاهده رسید')}
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-6 flex justify-end space-x-4">
                        <button
                            onClick={() => window.print()}
                            className="btn btn-outline"
                        >
                            {LANGUAGE_UTILS.getTranslation('common.print', 'چاپ')}
                        </button>
                        <button
                            onClick={() => window.location.href = '/transactions'}
                            className="btn btn-primary"
                        >
                            {LANGUAGE_UTILS.getTranslation('common.backToList', 'بازگشت به لیست')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TransactionStatus; 