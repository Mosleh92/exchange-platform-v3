import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatCurrency } from '../../utils/format';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import LANGUAGE_UTILS from '../../utils/language';

const ExchangeRateDashboard = () => {
    const [currencies, setCurrencies] = useState([]);
    const [selectedCurrency, setSelectedCurrency] = useState('');
    const [statistics, setStatistics] = useState({
        daily: [],
        monthly: [],
        highest_rate: 0,
        lowest_rate: 0,
        highest_rate_date: null,
        lowest_rate_date: null,
        average_rate: 0,
        total_volume: 0
    });
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPeriod, setSelectedPeriod] = useState('daily');

    useEffect(() => {
        fetchCurrencies();
    }, []);

    useEffect(() => {
        if (selectedCurrency) {
            fetchStatistics();
            fetchChartData();
        }
    }, [selectedCurrency]);

    useEffect(() => {
        fetchStatistics();
    }, [selectedPeriod]);

    const fetchCurrencies = async () => {
        try {
            const response = await axios.get('/api/currencies');
            setCurrencies(response.data.data);
        } catch (err) {
            setError('Error loading currencies');
        }
    };

    const fetchStatistics = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/exchange-rates/statistics?period=${selectedPeriod}`);
            const data = await response.json();
            setStatistics(data);
        } catch (err) {
            setError(LANGUAGE_UTILS.getTranslation('rates.fetchError', 'خطا در دریافت آمار'));
        } finally {
            setLoading(false);
        }
    };

    const fetchChartData = async () => {
        try {
            const response = await axios.get(`/api/currencies/${selectedCurrency}/chart-data`);
            setChartData(response.data.data);
        } catch (err) {
            setError('Error loading chart data');
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

    const chartDataToDisplay = selectedPeriod === 'daily' ? statistics.daily : statistics.monthly;

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">
                    {LANGUAGE_UTILS.getTranslation('rates.dashboard', 'داشبورد نرخ ارز')}
                </h1>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setSelectedPeriod('daily')}
                        className={`btn ${selectedPeriod === 'daily' ? 'btn-primary' : 'btn-ghost'}`}
                    >
                        {LANGUAGE_UTILS.getTranslation('rates.daily', 'روزانه')}
                    </button>
                    <button
                        onClick={() => setSelectedPeriod('monthly')}
                        className={`btn ${selectedPeriod === 'monthly' ? 'btn-primary' : 'btn-ghost'}`}
                    >
                        {LANGUAGE_UTILS.getTranslation('rates.monthly', 'ماهانه')}
                    </button>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="card bg-white p-4 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-2">
                        {LANGUAGE_UTILS.getTranslation('rates.highestRate', 'بالاترین نرخ')}
                    </h3>
                    <p className="text-2xl font-bold text-green-600">
                        {LANGUAGE_UTILS.formatNumber(statistics.highest_rate)}
                    </p>
                    <p className="text-sm text-gray-500">
                        {LANGUAGE_UTILS.formatDate(statistics.highest_rate_date)}
                    </p>
                </div>
                <div className="card bg-white p-4 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-2">
                        {LANGUAGE_UTILS.getTranslation('rates.lowestRate', 'پایین‌ترین نرخ')}
                    </h3>
                    <p className="text-2xl font-bold text-red-600">
                        {LANGUAGE_UTILS.formatNumber(statistics.lowest_rate)}
                    </p>
                    <p className="text-sm text-gray-500">
                        {LANGUAGE_UTILS.formatDate(statistics.lowest_rate_date)}
                    </p>
                </div>
                <div className="card bg-white p-4 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-2">
                        {LANGUAGE_UTILS.getTranslation('rates.averageRate', 'میانگین نرخ')}
                    </h3>
                    <p className="text-2xl font-bold text-blue-600">
                        {LANGUAGE_UTILS.formatNumber(statistics.average_rate)}
                    </p>
                </div>
                <div className="card bg-white p-4 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-2">
                        {LANGUAGE_UTILS.getTranslation('rates.totalVolume', 'حجم کل معاملات')}
                    </h3>
                    <p className="text-2xl font-bold text-purple-600">
                        {LANGUAGE_UTILS.formatCurrency(statistics.total_volume, 'USD')}
                    </p>
                </div>
            </div>

            {/* Rate Chart */}
            <div className="card bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">
                    {LANGUAGE_UTILS.getTranslation('rates.chart', 'نمودار نرخ')}
                </h3>
                <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartDataToDisplay}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(date) => LANGUAGE_UTILS.formatDate(date, { month: 'short', day: 'numeric' })}
                            />
                            <YAxis
                                tickFormatter={(value) => LANGUAGE_UTILS.formatNumber(value)}
                            />
                            <Tooltip
                                labelFormatter={(date) => LANGUAGE_UTILS.formatDate(date)}
                                formatter={(value) => [LANGUAGE_UTILS.formatNumber(value), LANGUAGE_UTILS.getTranslation('rates.rate', 'نرخ')]}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="rate"
                                stroke="#3B82F6"
                                name={LANGUAGE_UTILS.getTranslation('rates.rate', 'نرخ')}
                            />
                            <Line
                                type="monotone"
                                dataKey="volume"
                                stroke="#10B981"
                                name={LANGUAGE_UTILS.getTranslation('rates.volume', 'حجم')}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default ExchangeRateDashboard; 