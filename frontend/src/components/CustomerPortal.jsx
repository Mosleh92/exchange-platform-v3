import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { formatCurrency } from '../utils/format';

const CustomerPortal = () => {
    const { transactionId } = useParams();
    const [transaction, setTransaction] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
    const [paymentReference, setPaymentReference] = useState('');

    useEffect(() => {
        fetchTransactionDetails();
    }, [transactionId]);

    const fetchTransactionDetails = async () => {
        try {
            const response = await axios.get(`/api/transactions/payment/${transactionId}/summary`);
            setTransaction(response.data.data);
            setLoading(false);
        } catch (err) {
            setError('Error loading transaction details');
            setLoading(false);
        }
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`/api/transactions/payment/${transactionId}`, {
                paid_amount: parseFloat(paymentAmount),
                payment_method: paymentMethod,
                payment_reference: paymentReference
            });
            fetchTransactionDetails();
            setPaymentAmount('');
            setPaymentReference('');
        } catch (err) {
            setError('Error updating payment');
        }
    };

    const handlePortalAction = async (action) => {
        try {
            await axios.post(`/api/transactions/payment/${transactionId}/portal-action`, {
                action,
                notes: `Customer ${action}ed the transaction`
            });
            fetchTransactionDetails();
        } catch (err) {
            setError('Error recording portal action');
        }
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div className="text-red-500">{error}</div>;
    if (!transaction) return <div>Transaction not found</div>;

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white shadow-lg rounded-lg p-6">
                <h1 className="text-2xl font-bold mb-6">Transaction Details</h1>
                
                {/* Transaction Summary */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <h2 className="text-lg font-semibold mb-2">Transaction Information</h2>
                        <p>Status: <span className="font-medium">{transaction.payment_status}</span></p>
                        <p>Total Amount: <span className="font-medium">{formatCurrency(transaction.total_amount)}</span></p>
                        <p>Paid Amount: <span className="font-medium">{formatCurrency(transaction.paid_amount)}</span></p>
                        <p>Remaining Amount: <span className="font-medium">{formatCurrency(transaction.remaining_amount)}</span></p>
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold mb-2">Payment Details</h2>
                        <p>Payment Method: <span className="font-medium">{transaction.payment_method}</span></p>
                        <p>Payment Reference: <span className="font-medium">{transaction.payment_reference || 'N/A'}</span></p>
                        <p>Payment Deadline: <span className="font-medium">{new Date(transaction.payment_deadline).toLocaleString()}</span></p>
                    </div>
                </div>

                {/* Payment Form */}
                {transaction.payment_status !== 'completed' && (
                    <form onSubmit={handlePaymentSubmit} className="mb-6">
                        <h2 className="text-lg font-semibold mb-4">Record Payment</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Amount</label>
                                <input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                >
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="cash">Cash</option>
                                    <option value="card">Card</option>
                                    <option value="crypto">Crypto</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Reference</label>
                                <input
                                    type="text"
                                    value={paymentReference}
                                    onChange={(e) => setPaymentReference(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    placeholder="Payment reference number"
                                />
                            </div>
                        </div>
                        <div className="mt-4">
                            <button
                                type="submit"
                                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                            >
                                Record Payment
                            </button>
                        </div>
                    </form>
                )}

                {/* Portal Actions */}
                <div className="border-t pt-6">
                    <h2 className="text-lg font-semibold mb-4">Portal Actions</h2>
                    <div className="flex space-x-4">
                        <button
                            onClick={() => handlePortalAction('approve')}
                            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                            disabled={transaction.portal_status === 'approved'}
                        >
                            Approve Transaction
                        </button>
                        <button
                            onClick={() => handlePortalAction('reject')}
                            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                            disabled={transaction.portal_status === 'rejected'}
                        >
                            Reject Transaction
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerPortal; 