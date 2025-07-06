import React, { useState, useRef } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import api from '../services/api';

const MultiPaymentForm = ({ transaction, onPaymentComplete, onCancel }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    amount: transaction?.remainingAmount || 0,
    currency: transaction?.currency || 'IRR',
    paymentMethod: 'bank_transfer',
    referenceNumber: '',
    paymentDate: new Date().toISOString().split('T')[0],
    sender: {
      name: '',
      phone: '',
      nationalId: '',
      email: ''
    },
    bankAccount: {
      bankName: '',
      accountNumber: '',
      accountHolder: '',
      iban: '',
      destinationAccount: {
        bankName: '',
        accountNumber: '',
        accountHolder: '',
        iban: ''
      }
    },
    receipts: []
  });

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleFileUpload = async (files) => {
    setUploading(true);
    const uploadedReceipts = [];

    try {
      for (let file of files) {
        const formData = new FormData();
        formData.append('receipt', file);
        
        const response = await api.post('/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        uploadedReceipts.push({
          filePath: response.data.url,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          description: ''
        });
      }
      
      setFormData(prev => ({
        ...prev,
        receipts: [...prev.receipts, ...uploadedReceipts]
      }));
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    handleFileUpload(files);
  };

  const removeReceipt = (index) => {
    setFormData(prev => ({
      ...prev,
      receipts: prev.receipts.filter((_, i) => i !== index)
    }));
  };

  const updateReceiptDescription = (index, description) => {
    setFormData(prev => ({
      ...prev,
      receipts: prev.receipts.map((receipt, i) => 
        i === index ? { ...receipt, description } : receipt
      )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.amount || formData.amount <= 0) {
      alert(t('payment.amountRequired'));
      return;
    }

    if (!formData.sender.name) {
      alert(t('payment.senderNameRequired'));
      return;
    }

    if (formData.paymentMethod === 'bank_transfer' && !formData.referenceNumber) {
      alert(t('payment.referenceNumberRequired'));
      return;
    }

    setLoading(true);

    try {
      const paymentData = {
        transactionId: transaction._id,
        customerId: transaction.customerId,
        amount: formData.amount,
        currency: formData.currency,
        paymentMethod: formData.paymentMethod,
        sender: formData.sender,
        bankAccount: formData.bankAccount,
        referenceNumber: formData.referenceNumber,
        paymentDate: formData.paymentDate,
        receipts: formData.receipts
      };

      const response = await api.post('/payments', paymentData);
      
      if (response.data.success) {
        onPaymentComplete(response.data.data);
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      alert(error.response?.data?.message || t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {t('payment.create')}
        </h2>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payment Amount */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('payment.amount')}
            </label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="0.01"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('payment.currency')}
            </label>
            <select
              value={formData.currency}
              onChange={(e) => handleInputChange('currency', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="IRR">IRR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('payment.method')}
          </label>
          <select
            value={formData.paymentMethod}
            onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="bank_transfer">{t('payment.methods.bankTransfer')}</option>
            <option value="cash">{t('payment.methods.cash')}</option>
            <option value="card">{t('payment.methods.card')}</option>
            <option value="digital_wallet">{t('payment.methods.digitalWallet')}</option>
            <option value="crypto">{t('payment.methods.crypto')}</option>
          </select>
        </div>

        {/* Sender Information */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {t('payment.senderInfo')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('payment.senderName')}
              </label>
              <input
                type="text"
                value={formData.sender.name}
                onChange={(e) => handleInputChange('sender.name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('payment.senderPhone')}
              </label>
              <input
                type="text"
                value={formData.sender.phone}
                onChange={(e) => handleInputChange('sender.phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('payment.senderNationalId')}
              </label>
              <input
                type="text"
                value={formData.sender.nationalId}
                onChange={(e) => handleInputChange('sender.nationalId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('payment.senderEmail')}
              </label>
              <input
                type="email"
                value={formData.sender.email}
                onChange={(e) => handleInputChange('sender.email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Bank Account Details */}
        {formData.paymentMethod === 'bank_transfer' && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {t('payment.bankDetails')}
            </h3>
            
            {/* Source Account */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-700 mb-3">
                {t('payment.sourceAccount')}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('payment.bankName')}
                  </label>
                  <input
                    type="text"
                    value={formData.bankAccount.bankName}
                    onChange={(e) => handleInputChange('bankAccount.bankName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('payment.accountNumber')}
                  </label>
                  <input
                    type="text"
                    value={formData.bankAccount.accountNumber}
                    onChange={(e) => handleInputChange('bankAccount.accountNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('payment.accountHolder')}
                  </label>
                  <input
                    type="text"
                    value={formData.bankAccount.accountHolder}
                    onChange={(e) => handleInputChange('bankAccount.accountHolder', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('payment.iban')}
                  </label>
                  <input
                    type="text"
                    value={formData.bankAccount.iban}
                    onChange={(e) => handleInputChange('bankAccount.iban', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Destination Account */}
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-3">
                {t('payment.destinationAccount')}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('payment.bankName')}
                  </label>
                  <input
                    type="text"
                    value={formData.bankAccount.destinationAccount.bankName}
                    onChange={(e) => handleInputChange('bankAccount.destinationAccount.bankName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('payment.accountNumber')}
                  </label>
                  <input
                    type="text"
                    value={formData.bankAccount.destinationAccount.accountNumber}
                    onChange={(e) => handleInputChange('bankAccount.destinationAccount.accountNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('payment.accountHolder')}
                  </label>
                  <input
                    type="text"
                    value={formData.bankAccount.destinationAccount.accountHolder}
                    onChange={(e) => handleInputChange('bankAccount.destinationAccount.accountHolder', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('payment.iban')}
                  </label>
                  <input
                    type="text"
                    value={formData.bankAccount.destinationAccount.iban}
                    onChange={(e) => handleInputChange('bankAccount.destinationAccount.iban', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Reference */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('payment.referenceNumber')}
            </label>
            <input
              type="text"
              value={formData.referenceNumber}
              onChange={(e) => handleInputChange('referenceNumber', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('payment.referenceNumberPlaceholder')}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('payment.paymentDate')}
            </label>
            <input
              type="date"
              value={formData.paymentDate}
              onChange={(e) => handleInputChange('paymentDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Receipt Upload */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {t('payment.receipts')}
          </h3>
          
          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? t('common.loading') : t('payment.uploadMultipleReceipts')}
            </button>
            <p className="text-sm text-gray-500 mt-2">
              {t('payment.receiptsHelp')}
            </p>
          </div>

          {/* Uploaded Receipts */}
          {formData.receipts.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-md font-medium text-gray-700">
                {t('payment.uploadedReceipts')} ({formData.receipts.length})
              </h4>
              {formData.receipts.map((receipt, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-md">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700">
                        {receipt.fileName}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({(receipt.fileSize / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <input
                      type="text"
                      value={receipt.description}
                      onChange={(e) => updateReceiptDescription(index, e.target.value)}
                      placeholder={t('payment.receiptDescription')}
                      className="mt-1 w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeReceipt(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? t('common.loading') : t('payment.create')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MultiPaymentForm; 