// src/components/MockSMSSender.jsx
import React, { useState } from 'react';

const MockSMSSender = ({ phoneNumber, message, onSent }) => {
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const mockSendSMS = async () => {
    setIsSending(true);
    
    setTimeout(() => {
      setIsSending(false);
      setSent(true);
      onSent?.();
      
      setTimeout(() => setSent(false), 3000);
    }, 1500);
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            💬
          </div>
          <div>
            <h4 className="font-semibold text-blue-800">SMS Notification</h4>
            <p className="text-sm text-blue-600">To: {phoneNumber}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {sent && <span className="text-blue-600 text-sm">✅ Sent</span>}
          <button
            onClick={mockSendSMS}
            disabled={isSending || sent}
            className={`px-4 py-2 rounded-lg font-medium ${
              sent 
                ? 'bg-blue-100 text-blue-700' 
                : isSending
                ? 'bg-gray-100 text-gray-500'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isSending ? 'Sending...' : sent ? 'Sent' : 'Send SMS'}
          </button>
        </div>
      </div>
      
      <div className="bg-white border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-gray-700">{message}</p>
      </div>
      
      {isSending && (
        <div className="mt-3 flex items-center space-x-2 text-blue-600">
          <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="text-sm">Sending SMS...</span>
        </div>
      )}
    </div>
  );
};

export default MockSMSSender;