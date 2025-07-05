import React, { useState, useEffect } from 'react';
import LANGUAGE_UTILS from '../../utils/language';

const ExchangeRateManager = () => {
    const [rates, setRates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedRate, setSelectedRate] = useState(null);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [newRate, setNewRate] = useState('');

    useEffect(() => {
        fetchRates();
    }, []);

    const fetchRates = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/exchange-rates');
            const data = await response.json();
            setRates(data);
        } catch (err) {
            setError(LANGUAGE_UTILS.getTranslation('rates.fetchError', 'خطا در دریافت نرخ‌ها'));
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateRate = async () => {
        try {
            const response = await fetch(`/api/exchange-rates/${selectedRate.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ rate: parseFloat(newRate) }),
            });

            if (!response.ok) {
                throw new Error(LANGUAGE_UTILS.getTranslation('rates.updateError', 'خطا در بروزرسانی نرخ'));
            }

            await fetchRates();
            setShowUpdateModal(false);
            setSelectedRate(null);
            setNewRate('');
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
                    {LANGUAGE_UTILS.getTranslation('rates.management', 'مدیریت نرخ ارز')}
                </h1>
            </div>

            <div className="overflow-x-auto">
                <table className="table w-full">
                    <thead>
                        <tr>
                            <th>{LANGUAGE_UTILS.getTranslation('rates.currencyPair', 'جفت ارز')}</th>
                            <th>{LANGUAGE_UTILS.getTranslation('rates.currentRate', 'نرخ فعلی')}</th>
                            <th>{LANGUAGE_UTILS.getTranslation('rates.lastUpdate', 'آخرین بروزرسانی')}</th>
                            <th>{LANGUAGE_UTILS.getTranslation('common.actions', 'عملیات')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rates.map((rate) => (
                            <tr key={rate.id}>
                                <td>{rate.currency_pair}</td>
                                <td>{LANGUAGE_UTILS.formatNumber(rate.rate)}</td>
                                <td>{LANGUAGE_UTILS.formatDate(rate.updated_at)}</td>
                                <td>
                                    <button
                                        onClick={() => {
                                            setSelectedRate(rate);
                                            setNewRate(rate.rate.toString());
                                            setShowUpdateModal(true);
                                        }}
                                        className="btn btn-primary btn-sm"
                                    >
                                        {LANGUAGE_UTILS.getTranslation('rates.update', 'بروزرسانی')}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Update Rate Modal */}
            {showUpdateModal && selectedRate && (
                <div className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg mb-4">
                            {LANGUAGE_UTILS.getTranslation('rates.updateRate', 'بروزرسانی نرخ')}
                        </h3>
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">
                                    {LANGUAGE_UTILS.getTranslation('rates.currencyPair', 'جفت ارز')}
                                </span>
                            </label>
                            <input
                                type="text"
                                value={selectedRate.currency_pair}
                                disabled
                                className="input input-bordered"
                            />
                        </div>
                        <div className="form-control mt-4">
                            <label className="label">
                                <span className="label-text">
                                    {LANGUAGE_UTILS.getTranslation('rates.newRate', 'نرخ جدید')}
                                </span>
                            </label>
                            <input
                                type="number"
                                value={newRate}
                                onChange={(e) => setNewRate(e.target.value)}
                                className="input input-bordered"
                                step="0.000001"
                            />
                        </div>
                        <div className="modal-action">
                            <button
                                onClick={() => {
                                    setShowUpdateModal(false);
                                    setSelectedRate(null);
                                    setNewRate('');
                                }}
                                className="btn"
                            >
                                {LANGUAGE_UTILS.getTranslation('common.cancel', 'انصراف')}
                            </button>
                            <button onClick={handleUpdateRate} className="btn btn-primary">
                                {LANGUAGE_UTILS.getTranslation('common.save', 'ذخیره')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExchangeRateManager; 