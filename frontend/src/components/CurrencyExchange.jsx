import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

const CurrencyExchange = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { currentTenant } = useTenant();
    const [loading, setLoading] = useState(false);
    const [currencies, setCurrencies] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [vipCustomers, setVipCustomers] = useState([]);
    const [exchangeRates, setExchangeRates] = useState({});
    const [formData, setFormData] = useState({
        customerId: '',
        type: 'buy',
        currencyFrom: 'IRR',
        amountFrom: '',
        currencyTo: 'AED',
        amountTo: '',
        exchangeRate: '',
        rateType: 'buy',
        counterparty: {
            tenantId: '',
            name: '',
            country: '',
            contactPerson: '',
            phone: '',
            email: ''
        },
        fees: {
            amount: 0,
            currency: 'IRR',
            description: ''
        },
        discount: {
            amount: 0,
            currency: 'IRR',
            reason: ''
        },
        paymentSplit: {
            totalAmount: 0,
            accounts: []
        },
        delivery: {
            method: 'bank_transfer',
            recipient: {
                name: '',
                idNumber: '',
                phone: '',
                email: ''
            },
            bankAccount: {
                bankName: '',
                accountNumber: '',
                accountHolder: '',
                iban: ''
            },
            pickupLocation: {
                address: '',
                city: '',
                country: ''
            }
        }
    });

    // Load initial data
    useEffect(() => {
        loadCurrencies();
        loadCustomers();
        loadVIPCustomers();
        loadExchangeRates();
    }, []);

    const loadCurrencies = async () => {
        try {
            const response = await api.get('/currencies');
            setCurrencies(response.data.data);
        } catch (error) {
            console.error('Error loading currencies:', error);
        }
    };

    const loadCustomers = async () => {
        try {
            const response = await api.get('/customers');
            setCustomers(response.data.data);
        } catch (error) {
            console.error('Error loading customers:', error);
        }
    };

    const loadVIPCustomers = async () => {
        try {
            const response = await api.get('/vip-customers');
            setVipCustomers(response.data.data);
        } catch (error) {
            console.error('Error loading VIP customers:', error);
        }
    };

    const loadExchangeRates = async () => {
        try {
            const response = await api.get('/exchange-rates');
            const rates = {};
            response.data.data.forEach(rate => {
                const key = `${rate.currencyPair.from}_${rate.currencyPair.to}`;
                rates[key] = rate;
            });
            setExchangeRates(rates);
        } catch (error) {
            console.error('Error loading exchange rates:', error);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleNestedInputChange = (parent, field, value) => {
        setFormData(prev => ({
            ...prev,
            [parent]: {
                ...prev[parent],
                [field]: value
            }
        }));
    };

    const handleCustomerChange = (customerId) => {
        const customer = customers.find(c => c._id === customerId);
        const vipCustomer = vipCustomers.find(v => v.customerId === customerId);
        
        setFormData(prev => ({
            ...prev,
            customerId,
            customerType: vipCustomer ? vipCustomer.vipLevel : 'regular'
        }));

        // Apply VIP discounts if applicable
        if (vipCustomer) {
            setFormData(prev => ({
                ...prev,
                discount: {
                    amount: vipCustomer.discounts.commission || 0,
                    currency: 'IRR',
                    reason: `VIP ${vipCustomer.vipLevel} discount`
                }
            }));
        }
    };

    const calculateExchangeRate = () => {
        const { currencyFrom, currencyTo, rateType } = formData;
        const rateKey = `${currencyFrom}_${currencyTo}`;
        const rate = exchangeRates[rateKey];
        
        if (rate) {
            const finalRate = rateType === 'buy' ? rate.rates.buy : rate.rates.sell;
            setFormData(prev => ({
                ...prev,
                exchangeRate: finalRate
            }));
            
            // Calculate amountTo if amountFrom is provided
            if (formData.amountFrom) {
                const amountTo = formData.amountFrom / finalRate;
                setFormData(prev => ({
                    ...prev,
                    amountTo: amountTo.toFixed(2)
                }));
            }
        }
    };

    const handleAmountFromChange = (value) => {
        setFormData(prev => ({
            ...prev,
            amountFrom: value
        }));

        if (formData.exchangeRate && value) {
            const amountTo = value / formData.exchangeRate;
            setFormData(prev => ({
                ...prev,
                amountTo: amountTo.toFixed(2)
            }));
        }
    };

    const addPaymentAccount = () => {
        setFormData(prev => ({
            ...prev,
            paymentSplit: {
                ...prev.paymentSplit,
                accounts: [
                    ...prev.paymentSplit.accounts,
                    {
                        accountNumber: '',
                        accountName: '',
                        bankName: '',
                        iban: '',
                        amount: 0,
                        status: 'pending'
                    }
                ]
            }
        }));
    };

    const updatePaymentAccount = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            paymentSplit: {
                ...prev.paymentSplit,
                accounts: prev.paymentSplit.accounts.map((account, i) => 
                    i === index ? { ...account, [field]: value } : account
                )
            }
        }));
    };

    const removePaymentAccount = (index) => {
        setFormData(prev => ({
            ...prev,
            paymentSplit: {
                ...prev.paymentSplit,
                accounts: prev.paymentSplit.accounts.filter((_, i) => i !== index)
            }
        }));
    };

    const calculatePaymentSplit = () => {
        const { amountFrom, paymentSplit } = formData;
        if (amountFrom && paymentSplit.accounts.length > 0) {
            const amountPerAccount = amountFrom / paymentSplit.accounts.length;
            setFormData(prev => ({
                ...prev,
                paymentSplit: {
                    ...prev.paymentSplit,
                    totalAmount: amountFrom,
                    accounts: prev.paymentSplit.accounts.map(account => ({
                        ...account,
                        amount: amountPerAccount
                    }))
                }
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Calculate payment split before submission
            calculatePaymentSplit();

            const response = await api.post('/currency-transactions', formData);
            
            alert(t('transaction.created'));
            
            // Reset form
            setFormData({
                customerId: '',
                type: 'buy',
                currencyFrom: 'IRR',
                amountFrom: '',
                currencyTo: 'AED',
                amountTo: '',
                exchangeRate: '',
                rateType: 'buy',
                counterparty: {
                    tenantId: '',
                    name: '',
                    country: '',
                    contactPerson: '',
                    phone: '',
                    email: ''
                },
                fees: {
                    amount: 0,
                    currency: 'IRR',
                    description: ''
                },
                discount: {
                    amount: 0,
                    currency: 'IRR',
                    reason: ''
                },
                paymentSplit: {
                    totalAmount: 0,
                    accounts: []
                },
                delivery: {
                    method: 'bank_transfer',
                    recipient: {
                        name: '',
                        idNumber: '',
                        phone: '',
                        email: ''
                    },
                    bankAccount: {
                        bankName: '',
                        accountNumber: '',
                        accountHolder: '',
                        iban: ''
                    },
                    pickupLocation: {
                        address: '',
                        city: '',
                        country: ''
                    }
                }
            });
        } catch (error) {
            console.error('Error creating transaction:', error);
            alert(t('error.transactionCreationFailed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">
                    {t('currencyExchange.title')}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Customer Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('currencyExchange.customer')}
                            </label>
                            <select
                                value={formData.customerId}
                                onChange={(e) => handleCustomerChange(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">{t('currencyExchange.selectCustomer')}</option>
                                {customers.map(customer => (
                                    <option key={customer._id} value={customer._id}>
                                        {customer.name} - {customer.phone}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('currencyExchange.customerType')}
                            </label>
                            <input
                                type="text"
                                value={formData.customerType || 'regular'}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                                readOnly
                            />
                        </div>
                    </div>

                    {/* Transaction Type and Currencies */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('currencyExchange.type')}
                            </label>
                            <select
                                value={formData.type}
                                onChange={(e) => handleInputChange('type', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="buy">{t('currencyExchange.buy')}</option>
                                <option value="sell">{t('currencyExchange.sell')}</option>
                                <option value="exchange">{t('currencyExchange.exchange')}</option>
                                <option value="remittance">{t('currencyExchange.remittance')}</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('currencyExchange.currencyFrom')}
                            </label>
                            <select
                                value={formData.currencyFrom}
                                onChange={(e) => {
                                    handleInputChange('currencyFrom', e.target.value);
                                    calculateExchangeRate();
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                {currencies.map(currency => (
                                    <option key={currency.code} value={currency.code}>
                                        {currency.code} - {currency.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('currencyExchange.currencyTo')}
                            </label>
                            <select
                                value={formData.currencyTo}
                                onChange={(e) => {
                                    handleInputChange('currencyTo', e.target.value);
                                    calculateExchangeRate();
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                {currencies.map(currency => (
                                    <option key={currency.code} value={currency.code}>
                                        {currency.code} - {currency.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('currencyExchange.rateType')}
                            </label>
                            <select
                                value={formData.rateType}
                                onChange={(e) => {
                                    handleInputChange('rateType', e.target.value);
                                    calculateExchangeRate();
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="buy">{t('currencyExchange.buyRate')}</option>
                                <option value="sell">{t('currencyExchange.sellRate')}</option>
                            </select>
                        </div>
                    </div>

                    {/* Amounts and Exchange Rate */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('currencyExchange.amountFrom')}
                            </label>
                            <input
                                type="number"
                                value={formData.amountFrom}
                                onChange={(e) => handleAmountFromChange(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0.00"
                                step="0.01"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('currencyExchange.exchangeRate')}
                            </label>
                            <input
                                type="number"
                                value={formData.exchangeRate}
                                onChange={(e) => handleInputChange('exchangeRate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0.000000"
                                step="0.000001"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('currencyExchange.amountTo')}
                            </label>
                            <input
                                type="number"
                                value={formData.amountTo}
                                onChange={(e) => handleInputChange('amountTo', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0.00"
                                step="0.01"
                                required
                            />
                        </div>
                    </div>

                    {/* Counterparty Information */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold mb-4">{t('currencyExchange.counterparty')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                type="text"
                                placeholder={t('currencyExchange.counterpartyName')}
                                value={formData.counterparty.name}
                                onChange={(e) => handleNestedInputChange('counterparty', 'name', e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                                type="text"
                                placeholder={t('currencyExchange.counterpartyCountry')}
                                value={formData.counterparty.country}
                                onChange={(e) => handleNestedInputChange('counterparty', 'country', e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                                type="text"
                                placeholder={t('currencyExchange.contactPerson')}
                                value={formData.counterparty.contactPerson}
                                onChange={(e) => handleNestedInputChange('counterparty', 'contactPerson', e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                                type="tel"
                                placeholder={t('currencyExchange.phone')}
                                value={formData.counterparty.phone}
                                onChange={(e) => handleNestedInputChange('counterparty', 'phone', e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Payment Split */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">{t('currencyExchange.paymentSplit')}</h3>
                            <button
                                type="button"
                                onClick={addPaymentAccount}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                {t('currencyExchange.addAccount')}
                            </button>
                        </div>

                        {formData.paymentSplit.accounts.map((account, index) => (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 p-4 bg-white rounded border">
                                <input
                                    type="text"
                                    placeholder={t('currencyExchange.accountNumber')}
                                    value={account.accountNumber}
                                    onChange={(e) => updatePaymentAccount(index, 'accountNumber', e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <input
                                    type="text"
                                    placeholder={t('currencyExchange.accountName')}
                                    value={account.accountName}
                                    onChange={(e) => updatePaymentAccount(index, 'accountName', e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <input
                                    type="text"
                                    placeholder={t('currencyExchange.bankName')}
                                    value={account.bankName}
                                    onChange={(e) => updatePaymentAccount(index, 'bankName', e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <input
                                    type="number"
                                    placeholder={t('currencyExchange.amount')}
                                    value={account.amount}
                                    onChange={(e) => updatePaymentAccount(index, 'amount', parseFloat(e.target.value) || 0)}
                                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => removePaymentAccount(index)}
                                    className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                >
                                    {t('currencyExchange.remove')}
                                </button>
                            </div>
                        ))}

                        {formData.paymentSplit.accounts.length > 0 && (
                            <div className="flex justify-between items-center">
                                <button
                                    type="button"
                                    onClick={calculatePaymentSplit}
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                >
                                    {t('currencyExchange.calculateSplit')}
                                </button>
                                <div className="text-lg font-semibold">
                                    {t('currencyExchange.totalAmount')}: {formData.paymentSplit.totalAmount.toLocaleString()}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Delivery Information */}
                    <div className="bg-green-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold mb-4">{t('currencyExchange.delivery')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <select
                                value={formData.delivery.method}
                                onChange={(e) => handleNestedInputChange('delivery', 'method', e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="bank_transfer">{t('currencyExchange.bankTransfer')}</option>
                                <option value="cash_pickup">{t('currencyExchange.cashPickup')}</option>
                                <option value="account_credit">{t('currencyExchange.accountCredit')}</option>
                            </select>

                            {formData.delivery.method === 'cash_pickup' && (
                                <>
                                    <input
                                        type="text"
                                        placeholder={t('currencyExchange.recipientName')}
                                        value={formData.delivery.recipient.name}
                                        onChange={(e) => handleNestedInputChange('delivery', 'recipient', {
                                            ...formData.delivery.recipient,
                                            name: e.target.value
                                        })}
                                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <input
                                        type="text"
                                        placeholder={t('currencyExchange.idNumber')}
                                        value={formData.delivery.recipient.idNumber}
                                        onChange={(e) => handleNestedInputChange('delivery', 'recipient', {
                                            ...formData.delivery.recipient,
                                            idNumber: e.target.value
                                        })}
                                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </>
                            )}

                            {formData.delivery.method === 'bank_transfer' && (
                                <>
                                    <input
                                        type="text"
                                        placeholder={t('currencyExchange.bankName')}
                                        value={formData.delivery.bankAccount.bankName}
                                        onChange={(e) => handleNestedInputChange('delivery', 'bankAccount', {
                                            ...formData.delivery.bankAccount,
                                            bankName: e.target.value
                                        })}
                                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <input
                                        type="text"
                                        placeholder={t('currencyExchange.accountNumber')}
                                        value={formData.delivery.bankAccount.accountNumber}
                                        onChange={(e) => handleNestedInputChange('delivery', 'bankAccount', {
                                            ...formData.delivery.bankAccount,
                                            accountNumber: e.target.value
                                        })}
                                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </>
                            )}
                        </div>
                    </div>

                    {/* Fees and Discounts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-yellow-50 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold mb-4">{t('currencyExchange.fees')}</h3>
                            <div className="space-y-4">
                                <input
                                    type="number"
                                    placeholder={t('currencyExchange.feeAmount')}
                                    value={formData.fees.amount}
                                    onChange={(e) => handleNestedInputChange('fees', 'amount', parseFloat(e.target.value) || 0)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <input
                                    type="text"
                                    placeholder={t('currencyExchange.feeDescription')}
                                    value={formData.fees.description}
                                    onChange={(e) => handleNestedInputChange('fees', 'description', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="bg-green-50 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold mb-4">{t('currencyExchange.discount')}</h3>
                            <div className="space-y-4">
                                <input
                                    type="number"
                                    placeholder={t('currencyExchange.discountAmount')}
                                    value={formData.discount.amount}
                                    onChange={(e) => handleNestedInputChange('discount', 'amount', parseFloat(e.target.value) || 0)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <input
                                    type="text"
                                    placeholder={t('currencyExchange.discountReason')}
                                    value={formData.discount.reason}
                                    onChange={(e) => handleNestedInputChange('discount', 'reason', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? t('currencyExchange.creating') : t('currencyExchange.createTransaction')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CurrencyExchange; 