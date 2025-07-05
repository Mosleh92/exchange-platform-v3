// src/pages/RemittanceManager.jsx - Updated version
import React, { useState, useEffect } from 'react';
import MockSMSSender from '../components/MockSMSSender';
import LANGUAGE_UTILS from '../utils/LanguageUtils';

const RemittanceManager = () => {
  const [remittances, setRemittances] = useState([]);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [showSMS, setShowSMS] = useState(false);
  const [currentRemittance, setCurrentRemittance] = useState(null);
  const [newRemittance, setNewRemittance] = useState({
    customerName: '',
    customerPhone: '',
    fromCountry: '',
    toCountry: '',
    fromCurrency: '',
    toCurrency: '',
    amount: '',
    exchangeRate: '',
    receiverName: '',
    receiverAccount: '',
    whatsappGroup: 'Tehran Exchange Group',
    status: 'pending',
    description: ''
  });
  const [showNewRemittanceModal, setShowNewRemittanceModal] = useState(false);
  const [selectedRemittance, setSelectedRemittance] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const createRemittance = async () => {
    const remittance = {
      id: `REM${Date.now()}`,
      ...newRemittance,
      createdAt: new Date().toISOString(),
      createdBy: 'current_user',
      trackingNumber: `TR${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      totalAmount: (parseFloat(newRemittance.amount) * parseFloat(newRemittance.exchangeRate)).toFixed(2)
    };

    setRemittances([...remittances, remittance]);
    setCurrentRemittance(remittance);
    setShowWhatsApp(true);
    
    // Reset form
    setNewRemittance({
      customerName: '',
      customerPhone: '',
      fromCountry: '',
      toCountry: '',
      fromCurrency: '',
      toCurrency: '',
      amount: '',
      exchangeRate: '',
      receiverName: '',
      receiverAccount: '',
      whatsappGroup: 'Tehran Exchange Group',
      status: 'pending',
      description: ''
    });
  };

  const generateWhatsAppMessage = (remittance) => {
    return `🔄 *حواله جدید / New Remittance*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 شماره پیگیری: ${remittance.trackingNumber}
👤 فرستنده: ${remittance.customerName}
📞 موبایل: ${remittance.customerPhone}

💰 مبلغ ارسالی: ${remittance.amount} ${remittance.fromCurrency}
💱 نرخ تبدیل: ${remittance.exchangeRate}
💵 مبلغ دریافتی: ${remittance.totalAmount} ${remittance.toCurrency}

📍 مسیر: ${remittance.fromCountry} → ${remittance.toCountry}
👥 گیرنده: ${remittance.receiverName}
🏦 حساب: ${remittance.receiverAccount}

📝 توضیحات: ${remittance.description || 'ندارد'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏰ زمان: ${new Date().toLocaleString('fa-IR')}
✅ آماده پرداخت`;
  };

  const generateSMSMessage = (remittance) => {
    return `حواله شما با شماره ${remittance.trackingNumber} ثبت شد. مبلغ ${remittance.amount} ${remittance.fromCurrency} به ${remittance.receiverName} ارسال می‌شود. وضعیت: ${remittance.status}`;
  };

  const updateRemittanceStatus = (id, status) => {
    setRemittances(remittances.map(r => 
      r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r
    ));
  };

  const countries = [
    { code: 'UAE', name: 'UAE', flag: '🇦🇪', currency: 'AED' },
    { code: 'Iran', name: 'Iran', flag: '🇮🇷', currency: 'IRR' },
    { code: 'Turkey', name: 'Turkey', flag: '🇹🇷', currency: 'TRY' },
    { code: 'China', name: 'China', flag: '🇨🇳', currency: 'CNY' },
    { code: 'Canada', name: 'Canada', flag: '🇨🇦', currency: 'CAD' },
    { code: 'USA', name: 'USA', flag: '🇺🇸', currency: 'USD' }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleNewRemittanceSubmit = (e) => {
    e.preventDefault();
    createRemittance();
  };

  const handleViewRemittance = (remittance) => {
    setSelectedRemittance(remittance);
  };

  const handleApproveRemittance = (remittance) => {
    updateRemittanceStatus(remittance.id, 'completed');
  };

  const handleRejectRemittance = (remittance) => {
    updateRemittanceStatus(remittance.id, 'cancelled');
  };

  const filteredRemittances = remittances.filter(r => {
    const queryMatch = r.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    const statusMatch = statusFilter === 'all' || r.status === statusFilter;
    return queryMatch && statusMatch;
  });

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {LANGUAGE_UTILS.getTranslation('remittances.title', 'مدیریت حواله‌ها')}
        </h1>
        <div className="flex space-x-4">
          <button
            onClick={() => setShowNewRemittanceModal(true)}
            className="btn btn-primary"
          >
            {LANGUAGE_UTILS.getTranslation('remittances.newRemittance', 'حواله جدید')}
          </button>
          <button
            onClick={handleExport}
            className="btn btn-secondary"
          >
            {LANGUAGE_UTILS.getTranslation('common.export', 'خروجی')}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">
            {LANGUAGE_UTILS.getTranslation('remittances.totalRemittances', 'کل حواله‌ها')}
          </h3>
          <p className="text-2xl font-bold text-blue-600">
            {LANGUAGE_UTILS.formatNumber(remittances.length)}
          </p>
        </div>
        <div className="card bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">
            {LANGUAGE_UTILS.getTranslation('remittances.totalAmount', 'مبلغ کل')}
          </h3>
          <p className="text-2xl font-bold text-green-600">
            {LANGUAGE_UTILS.formatCurrency(
              remittances.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0),
              'USD'
            )}
          </p>
        </div>
        <div className="card bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">
            {LANGUAGE_UTILS.getTranslation('remittances.pendingRemittances', 'حواله‌های در انتظار')}
          </h3>
          <p className="text-2xl font-bold text-orange-600">
            {LANGUAGE_UTILS.formatNumber(
              remittances.filter(r => r.status === 'pending').length
            )}
          </p>
        </div>
      </div>

      {/* Remittance List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              {LANGUAGE_UTILS.getTranslation('remittances.list', 'لیست حواله‌ها')}
            </h2>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder={LANGUAGE_UTILS.getTranslation('common.search', 'جستجو')}
                className="input input-bordered"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select
                className="select select-bordered"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">
                  {LANGUAGE_UTILS.getTranslation('common.all', 'همه')}
                </option>
                <option value="pending">
                  {LANGUAGE_UTILS.getTranslation('status.pending', 'در انتظار')}
                </option>
                <option value="completed">
                  {LANGUAGE_UTILS.getTranslation('status.completed', 'تکمیل شده')}
                </option>
                <option value="cancelled">
                  {LANGUAGE_UTILS.getTranslation('status.cancelled', 'لغو شده')}
                </option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>{LANGUAGE_UTILS.getTranslation('remittances.code', 'کد حواله')}</th>
                <th>{LANGUAGE_UTILS.getTranslation('remittances.customer', 'مشتری')}</th>
                <th>{LANGUAGE_UTILS.getTranslation('remittances.amount', 'مبلغ')}</th>
                <th>{LANGUAGE_UTILS.getTranslation('remittances.currency', 'ارز')}</th>
                <th>{LANGUAGE_UTILS.getTranslation('remittances.status', 'وضعیت')}</th>
                <th>{LANGUAGE_UTILS.getTranslation('remittances.date', 'تاریخ')}</th>
                <th>{LANGUAGE_UTILS.getTranslation('common.actions', 'عملیات')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRemittances.map(remittance => (
                <tr key={remittance.id}>
                  <td>{remittance.trackingNumber}</td>
                  <td>{remittance.customerName}</td>
                  <td>
                    {LANGUAGE_UTILS.formatCurrency(remittance.amount, remittance.fromCurrency)}
                  </td>
                  <td>{remittance.fromCurrency}</td>
                  <td>
                    <span className={`badge badge-${getStatusColor(remittance.status)}`}>
                      {LANGUAGE_UTILS.getTranslation(`status.${remittance.status}`)}
                    </span>
                  </td>
                  <td>
                    {LANGUAGE_UTILS.formatDate(remittance.createdAt)}
                  </td>
                  <td>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewRemittance(remittance)}
                        className="btn btn-sm btn-info"
                      >
                        {LANGUAGE_UTILS.getTranslation('common.view', 'مشاهده')}
                      </button>
                      {remittance.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApproveRemittance(remittance)}
                            className="btn btn-sm btn-success"
                          >
                            {LANGUAGE_UTILS.getTranslation('common.approve', 'تأیید')}
                          </button>
                          <button
                            onClick={() => handleRejectRemittance(remittance)}
                            className="btn btn-sm btn-error"
                          >
                            {LANGUAGE_UTILS.getTranslation('common.reject', 'رد')}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Remittance Modal */}
      {showNewRemittanceModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {LANGUAGE_UTILS.getTranslation('remittances.newRemittance', 'حواله جدید')}
            </h3>
            <form onSubmit={handleNewRemittanceSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                  <input
                    placeholder="احمد محمدی"
                    value={newRemittance.customerName}
                    onChange={(e) => setNewRemittance({...newRemittance, customerName: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Phone</label>
                  <input
                    placeholder="+971501234567"
                    value={newRemittance.customerPhone}
                    onChange={(e) => setNewRemittance({...newRemittance, customerPhone: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Country</label>
                  <select
                    value={newRemittance.fromCountry}
                    onChange={(e) => {
                      const country = countries.find(c => c.code === e.target.value);
                      setNewRemittance({
                        ...newRemittance, 
                        fromCountry: e.target.value,
                        fromCurrency: country?.currency || ''
                      });
                    }}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Country</option>
                    {countries.map(country => (
                      <option key={country.code} value={country.code}>
                        {country.flag} {country.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Country</label>
                  <select
                    value={newRemittance.toCountry}
                    onChange={(e) => {
                      const country = countries.find(c => c.code === e.target.value);
                      setNewRemittance({
                        ...newRemittance, 
                        toCountry: e.target.value,
                        toCurrency: country?.currency || ''
                      });
                    }}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Country</option>
                    {countries.map(country => (
                      <option key={country.code} value={country.code}>
                        {country.flag} {country.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <div className="relative">
                    <input
                      placeholder="10000"
                      type="number"
                      value={newRemittance.amount}
                      onChange={(e) => setNewRemittance({...newRemittance, amount: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-16 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="absolute right-3 top-3 text-gray-500 font-medium">
                      {newRemittance.fromCurrency}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Exchange Rate</label>
                  <input
                    placeholder="91500"
                    type="number"
                    step="0.01"
                    value={newRemittance.exchangeRate}
                    onChange={(e) => setNewRemittance({...newRemittance, exchangeRate: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Receiver Name</label>
                  <input
                    placeholder="علی رضایی"
                    value={newRemittance.receiverName}
                    onChange={(e) => setNewRemittance({...newRemittance, receiverName: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Receiver Account/IBAN</label>
                  <input
                    placeholder="IR123456789012345678901234"
                    value={newRemittance.receiverAccount}
                    onChange={(e) => setNewRemittance({...newRemittance, receiverAccount: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Group</label>
                  <select
                    value={newRemittance.whatsappGroup}
                    onChange={(e) => setNewRemittance({...newRemittance, whatsappGroup: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Tehran Exchange Group">Tehran Exchange Group</option>
                    <option value="Dubai Exchange Group">Dubai Exchange Group</option>
                    <option value="Istanbul Exchange Group">Istanbul Exchange Group</option>
                    <option value="Beijing Exchange Group">Beijing Exchange Group</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea
                  placeholder="Additional notes or instructions..."
                  value={newRemittance.description}
                  onChange={(e) => setNewRemittance({...newRemittance, description: e.target.value})}
                  rows={2}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Preview */}
              {newRemittance.amount && newRemittance.exchangeRate && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                  <h3 className="font-semibold text-blue-800 mb-2">Preview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-blue-600">Send:</span> 
                      <span className="font-semibold ml-1">
                        {parseFloat(newRemittance.amount).toLocaleString()} {newRemittance.fromCurrency}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-600">Rate:</span> 
                      <span className="font-semibold ml-1">{parseFloat(newRemittance.exchangeRate).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-blue-600">Receive:</span> 
                      <span className="font-semibold ml-1">
                        {(parseFloat(newRemittance.amount) * parseFloat(newRemittance.exchangeRate)).toLocaleString()} {newRemittance.toCurrency}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="modal-action">
                <button type="submit" className="btn btn-primary">
                  {LANGUAGE_UTILS.getTranslation('common.submit', 'ثبت')}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowNewRemittanceModal(false)}
                >
                  {LANGUAGE_UTILS.getTranslation('common.cancel', 'لغو')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Remittance Modal */}
      {selectedRemittance && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {LANGUAGE_UTILS.getTranslation('remittances.details', 'جزئیات حواله')}
            </h3>
            <div className="space-y-4">
              {/* ... existing remittance details with translations ... */}
              <div className="modal-action">
                <button
                  className="btn"
                  onClick={() => setSelectedRemittance(null)}
                >
                  {LANGUAGE_UTILS.getTranslation('common.close', 'بستن')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RemittanceManager;