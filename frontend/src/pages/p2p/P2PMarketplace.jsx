// frontend/src/pages/p2p/P2PMarketplace.jsx
import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, TrendingUp, TrendingDown, MapPin, Clock, Star } from 'lucide-react';
import { useQuery } from 'react-query';
import axios from 'axios';

const P2PMarketplace = () => {
  const [filters, setFilters] = useState({
    type: 'all',
    fromCurrency: '',
    toCurrency: '',
    city: '',
    paymentMethod: '',
    sortBy: 'createdAt'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: announcementsData, isLoading, refetch } = useQuery(
    ['p2p-announcements', filters, searchTerm],
    () => axios.get('/api/p2p/announcements', {
      params: {
        ...filters,
        search: searchTerm,
        page: 1,
        limit: 20
      }
    }),
    {
      refetchInterval: 30000 // Refresh every 30 seconds
    }
  );

  const { data: statsData } = useQuery(
    'p2p-stats',
    () => axios.get('/api/p2p/stats'),
    {
      refetchInterval: 60000 // Refresh every minute
    }
  );

  const announcements = announcementsData?.data?.data?.announcements || [];
  const stats = statsData?.data?.data || {};

  const handleSearch = (e) => {
    e.preventDefault();
    refetch();
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat('fa-IR').format(amount) + ' ' + currency;
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} روز پیش`;
    if (hours > 0) return `${hours} ساعت پیش`;
    return 'چند دقیقه پیش';
  };

  const getStatusBadge = (status, validUntil) => {
    const isExpired = new Date(validUntil) < new Date();
    
    if (isExpired) {
      return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">منقضی شده</span>;
    }
    
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', text: 'فعال' },
      inactive: { color: 'bg-gray-100 text-gray-600', text: 'غیرفعال' },
      completed: { color: 'bg-blue-100 text-blue-800', text: 'تکمیل شده' }
    };

    const config = statusConfig[status] || statusConfig.active;
    return <span className={`px-2 py-1 rounded-full text-xs ${config.color}`}>{config.text}</span>;
  };

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">بازار P2P</h1>
          <p className="text-gray-600 mt-2">خرید و فروش ارز مستقیم با سایر کاربران</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus size={20} className="ml-2" />
          ایجاد آگهی
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">آگهی‌های فعال</p>
              <p className="text-2xl font-bold text-gray-900">{stats.announcements?.active || 0}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <TrendingUp className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">معاملات امروز</p>
              <p className="text-2xl font-bold text-gray-900">{stats.transactions?.total || 0}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingUp className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">نرخ موفقیت</p>
              <p className="text-2xl font-bold text-gray-900">{stats.transactions?.successRate || 0}%</p>
            </div>
            
