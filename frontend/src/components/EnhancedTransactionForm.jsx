import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatCurrency } from '../utils/format';
import { useAuth } from '../contexts/AuthContext';

const EnhancedTransactionForm = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [exchangeRates, setExchangeRates] = useState(null);
    const [transactionType, setTransactionType] = useState('buy');
    const [currencyFrom, setCurrencyFrom] = useState('IRR');
    const [currencyTo, setCurrencyTo] = useState('AED');
    const [amount, setAmount] = useState('');
    const [splitAccounts, setSplitAccounts] = useState([]);
    const [showSplitPayment, setShowSplitPayment] = useState(false);
    const [paymentProgress, setPaymentProgress] = useState(null);

    // Fetch customers and exchange rates on component mount
    useEffect(() => {
        fetchCustomers();
        fetchExchangeRates();
    }, []);

    const fetchCustomers = async () => {
        try {
            const response = await axios.get('/api/customers');
            setCustomers(response.data.data);
        } catch (err) {
            setError('Error loading customers');
        }
    };

    const fetchExchangeRates = async () => {
        try {
            const response = await axios.get('/api/exchange-rates');
            setExchangeRates(response.data.data);
        } catch (err) {
            setError('Error loading exchange rates');
        }
    };

    const handleCustomerSearch = (searchTerm) => {
        const filtered = customers.filter(customer => 
            customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.phone.includes(searchTerm)
        );
        return filtered;
    };

    const calculateAmount = (inputAmount, fromCurrency, toCurrency) => {
        if (!exchangeRates || !inputAmount) return 0;
        const rate = exchangeRates[`${fromCurrency}_${toCurrency}`];
        return inputAmount * rate;
    };

    const handleAmountChange = (e) => {
        const value = e.target.value;
        setAmount(value);
        if (value && exchangeRates) {
            const calculatedAmount = calculateAmount(value, currencyFrom, currencyTo);
            // Update split accounts if they exist
            if (splitAccounts.length > 0) {
                const newSplitAmount = calculatedAmount / splitAccounts.length;
                setSplitAccounts(prev => prev.map(account => ({
                    ...account,
                    amount: newSplitAmount
                })));
            }
        }
    };

    const handleSplitPaymentToggle = () => {
        if (!showSplitPayment) {
            // Initialize split accounts
            const defaultAccounts = [
                { account_name: '', account_number: '', bank_name: '', amount: 0 },
                { account_name: '', account_number: '', bank_name: '', amount: 0 },
                { account_name: '', account_number: '', bank_name: '', amount: 0 },
                { account_name: '', account_number: '', bank_name: '', amount: 0 },
                { account_name: '', account_number: '', bank_name: '', amount: 0 }
            ];
            setSplitAccounts(defaultAccounts);
        }
        setShowSplitPayment(!showSplitPayment);
    };

    const handleSplitAccountChange = (index, field, value) => {
        const newAccounts = [...splitAccounts];
        newAccounts[index] = {
            ...newAccounts[index],
            [field]: value
        };
        setSplitAccounts(newAccounts);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Create transaction
            const transactionResponse = await axios.post('/api/transactions/workflow', {
                customer_id: selectedCustomer.id,
                customer_type: selectedCustomer.type,
                type: transactionType,
                currency_from: currencyFrom,
                currency_to: currencyTo,
                amount_from: parseFloat(amount),
                amount_to: calculateAmount(amount, currencyFrom, currencyTo),
                rate: exchangeRates[`${currencyFrom}_${currencyTo}`],
                payment_method: 'bank_transfer'
            });

            const transactionId = transactionResponse.data.data.transaction_id;

            // Add split payments if enabled
            if (showSplitPayment && splitAccounts.length > 0) {
                await axios.post(`/api/transactions/workflow/${transactionId}/split-payments`, {
                    splitAccounts: splitAccounts.map(account => ({
                        ...account,
                        amount: parseFloat(account.amount)
                    }))
                });
            }

            // Reset form
            setAmount('');
            setSplitAccounts([]);
            setShowSplitPayment(false);
            setSelectedCustomer(null);

            // Show success message
            alert('Transaction created successfully!');

        } catch (err) {
            setError(err.response?.data?.message || 'Error creating transaction');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white shadow-lg rounded-lg p-6">
                <h1 className="text-2xl font-bold mb-6">Enhanced Currency Exchange</h1>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Customer Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Customer Search
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search by name or phone"
                                onChange={(e) => {
                                    const results = handleCustomerSearch(e.target.value);
                                    // Show results in a dropdown
                                }}
                                className="w-full border rounded-md px-3 py-2"
                            />
                        </div>
                        {selectedCustomer && (
                            <div className="mt-2 p-2 bg-gray-50 rounded">
                                <p className="font-medium">{selectedCustomer.name}</p>
                                <p className="text-sm text-gray-600">Type: {selectedCustomer.type}</p>
                                {selectedCustomer.type === 'vip' && (
                                    <p className="text-sm text-gray-600">
                                        Exchange Account: {selectedCustomer.exchange_account?.account_number}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Transaction Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Transaction Type
                        </label>
                        <div className="flex space-x-4">
                            <label className="inline-flex items-center">
                                <input
                                    type="radio"
                                    value="buy"
                                    checked={transactionType === 'buy'}
                                    onChange={(e) => setTransactionType(e.target.value)}
                                    className="form-radio"
                                />
                                <span className="ml-2">Buy</span>
                            </label>
                            <label className="inline-flex items-center">
                                <input
                                    type="radio"
                                    value="sell"
                                    checked={transactionType === 'sell'}
                                    onChange={(e) => setTransactionType(e.target.value)}
                                    className="form-radio"
                                />
                                <span className="ml-2">Sell</span>
                            </label>
                        </div>
                    </div>

                    {/* Currency Selection */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                From Currency
                            </label>
                            <select
                                value={currencyFrom}
                                onChange={(e) => setCurrencyFrom(e.target.value)}
                                className="w-full border rounded-md px-3 py-2"
                            >
                                <option value="IRR">Iranian Rial (IRR)</option>
                                <option value="AED">UAE Dirham (AED)</option>
                                <option value="USD">US Dollar (USD)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                To Currency
                            </label>
                            <select
                                value={currencyTo}
                                onChange={(e) => setCurrencyTo(e.target.value)}
                                className="w-full border rounded-md px-3 py-2"
                            >
                                <option value="AED">UAE Dirham (AED)</option>
                                <option value="IRR">Iranian Rial (IRR)</option>
                                <option value="USD">US Dollar (USD)</option>
                            </select>
                        </div>
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Amount ({currencyFrom})
                        </label>
                        <input
                            type="number"
                            value={amount}
                            onChange={handleAmountChange}
                            className="w-full border rounded-md px-3 py-2"
                            placeholder="Enter amount"
                        />
                        {amount && exchangeRates && (
                            <p className="mt-2 text-sm text-gray-600">
                                Equivalent: {formatCurrency(calculateAmount(amount, currencyFrom, currencyTo))} {currencyTo}
                            </p>
                        )}
                    </div>

                    {/* Split Payment Toggle */}
                    <div>
                        <label className="inline-flex items-center">
                            <input
                                type="checkbox"
                                checked={showSplitPayment}
                                onChange={handleSplitPaymentToggle}
                                className="form-checkbox"
                            />
                            <span className="ml-2">Enable Split Payment</span>
                        </label>
                    </div>

                    {/* Split Payment Accounts */}
                    {showSplitPayment && (
                        <div className="border rounded-md p-4">
                            <h3 className="text-lg font-medium mb-4">Split Payment Accounts</h3>
                            <div className="space-y-4">
                                {splitAccounts.map((account, index) => (
                                    <div key={index} className="grid grid-cols-4 gap-4">
                                        <input
                                            type="text"
                                            placeholder="Account Name"
                                            value={account.account_name}
                                            onChange={(e) => handleSplitAccountChange(index, 'account_name', e.target.value)}
                                            className="border rounded p-2"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Account Number"
                                            value={account.account_number}
                                            onChange={(e) => handleSplitAccountChange(index, 'account_number', e.target.value)}
                                            className="border rounded p-2"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Bank Name"
                                            value={account.bank_name}
                                            onChange={(e) => handleSplitAccountChange(index, 'bank_name', e.target.value)}
                                            className="border rounded p-2"
                                        />
                                        <input
                                            type="number"
                                            placeholder="Amount"
                                            value={account.amount}
                                            onChange={(e) => handleSplitAccountChange(index, 'amount', e.target.value)}
                                            className="border rounded p-2"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Submit Button */}
                    <div>
                        <button
                            type="submit"
                            disabled={loading || !selectedCustomer || !amount}
                            className={`w-full bg-blue-600 text-white px-4 py-2 rounded-md ${
                                loading || !selectedCustomer || !amount
                                    ? 'opacity-50 cursor-not-allowed'
                                    : 'hover:bg-blue-700'
                            }`}
                        >
                            {loading ? 'Creating Transaction...' : 'Create Transaction'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EnhancedTransactionForm; 