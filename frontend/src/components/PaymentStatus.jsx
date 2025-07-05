import React, { useState } from 'react';
import { useTranslation } from '../contexts/LanguageContext';

const PaymentStatus = ({ payment, onVerify, onReject }) => {
  const { t } = useTranslation();
  const [showReceipts, setShowReceipts] = useState(false);
  const [verificationNote, setVerificationNote] = useState('');

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'verified':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'rejected':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleVerify = () => {
    if (onVerify) {
      onVerify(payment._id, {
        notes: verificationNote,
        paymentDate: payment.verification?.paymentDate || new Date()
      });
    }
  };

  const handleReject = () => {
    if (onReject) {
      onReject(payment._id, verificationNote);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Payment Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {t('payment.id')}: {payment.tracking?.paymentNumber || payment._id}
          </h3>
          <p className="text-sm text-gray-500">
            {formatDate(payment.created_at)}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(payment.status)}`}>
            {getStatusIcon(payment.status)}
            <span className="ml-1">{t(`payment.status.${payment.status}`)}</span>
          </span>
        </div>
      </div>

      {/* Payment Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h4 className="font-medium text-gray-900 mb-3">{t('payment.details')}</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">{t('payment.amount')}:</span>
              <span className="font-medium">
                {payment.amount.toLocaleString()} {payment.currency}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t('payment.method')}:</span>
              <span className="font-medium">
                {t(`payment.methods.${payment.paymentMethod}`)}
              </span>
            </div>
            {payment.referenceNumber && (
              <div className="flex justify-between">
                <span className="text-gray-600">{t('payment.referenceNumber')}:</span>
                <span className="font-medium">{payment.referenceNumber}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-900 mb-3">{t('payment.senderInfo')}</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">{t('payment.senderName')}:</span>
              <span className="font-medium">{payment.sender?.name}</span>
            </div>
            {payment.sender?.phone && (
              <div className="flex justify-between">
                <span className="text-gray-600">{t('payment.senderPhone')}:</span>
                <span className="font-medium">{payment.sender.phone}</span>
              </div>
            )}
            {payment.sender?.nationalId && (
              <div className="flex justify-between">
                <span className="text-gray-600">{t('payment.senderNationalId')}:</span>
                <span className="font-medium">{payment.sender.nationalId}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bank Account Details */}
      {payment.paymentMethod === 'bank_transfer' && payment.bankAccount && (
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3">{t('payment.bankDetails')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">{t('payment.sourceAccount')}</h5>
              <div className="space-y-1 text-sm">
                {payment.bankAccount.bankName && (
                  <div><span className="text-gray-600">{t('payment.bankName')}:</span> {payment.bankAccount.bankName}</div>
                )}
                {payment.bankAccount.accountNumber && (
                  <div><span className="text-gray-600">{t('payment.accountNumber')}:</span> {payment.bankAccount.accountNumber}</div>
                )}
                {payment.bankAccount.accountHolder && (
                  <div><span className="text-gray-600">{t('payment.accountHolder')}:</span> {payment.bankAccount.accountHolder}</div>
                )}
              </div>
            </div>
            {payment.bankAccount.destinationAccount && (
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">{t('payment.destinationAccount')}</h5>
                <div className="space-y-1 text-sm">
                  {payment.bankAccount.destinationAccount.bankName && (
                    <div><span className="text-gray-600">{t('payment.bankName')}:</span> {payment.bankAccount.destinationAccount.bankName}</div>
                  )}
                  {payment.bankAccount.destinationAccount.accountNumber && (
                    <div><span className="text-gray-600">{t('payment.accountNumber')}:</span> {payment.bankAccount.destinationAccount.accountNumber}</div>
                  )}
                  {payment.bankAccount.destinationAccount.accountHolder && (
                    <div><span className="text-gray-600">{t('payment.accountHolder')}:</span> {payment.bankAccount.destinationAccount.accountHolder}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Receipts */}
      {payment.receipts && payment.receipts.length > 0 && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-gray-900">
              {t('payment.receipts')} ({payment.receipts.length})
            </h4>
            <button
              onClick={() => setShowReceipts(!showReceipts)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              {showReceipts ? t('common.hide') : t('common.show')}
            </button>
          </div>
          
          {showReceipts && (
            <div className="space-y-3">
              {payment.receipts.map((receipt, index) => (
                <div key={index} className="border border-gray-200 rounded-md p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-medium text-sm">{receipt.fileName}</span>
                        <span className="text-xs text-gray-500">
                          {formatFileSize(receipt.fileSize)}
                        </span>
                        {receipt.verified && (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                            {t('payment.verified')}
                          </span>
                        )}
                      </div>
                      {receipt.description && (
                        <p className="text-sm text-gray-600 mb-2">{receipt.description}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        {formatDate(receipt.uploadedAt)}
                      </p>
                    </div>
                    <a
                      href={receipt.filePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      {t('common.view')}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Verification Actions */}
      {payment.status === 'pending' && (onVerify || onReject) && (
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-3">{t('payment.verification')}</h4>
          <div className="space-y-3">
            <textarea
              value={verificationNote}
              onChange={(e) => setVerificationNote(e.target.value)}
              placeholder={t('payment.verificationNote')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
            <div className="flex space-x-3">
              {onVerify && (
                <button
                  onClick={handleVerify}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  {t('payment.verify')}
                </button>
              )}
              {onReject && (
                <button
                  onClick={handleReject}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  {t('payment.reject')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Verification History */}
      {payment.verification && (
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-3">{t('payment.verificationHistory')}</h4>
          <div className="space-y-2 text-sm">
            {payment.verification.verifiedAt && (
              <div>
                <span className="text-gray-600">{t('payment.verifiedAt')}:</span>
                <span className="ml-2">{formatDate(payment.verification.verifiedAt)}</span>
              </div>
            )}
            {payment.verification.notes && (
              <div>
                <span className="text-gray-600">{t('payment.verificationNotes')}:</span>
                <p className="mt-1 text-gray-800">{payment.verification.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentStatus; 