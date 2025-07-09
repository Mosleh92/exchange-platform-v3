// frontend/src/components/p2p/P2PChat.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Image, Phone, Video, MoreVertical, CheckCircle, XCircle } from 'lucide-react';
import { io } from 'socket.io-client';
import { useQuery, useMutation } from 'react-query';
import axios from 'axios';

const P2PChat = ({ transactionId, onClose }) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [showNegotiation, setShowNegotiation] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Get transaction and chat data
  const { data: transactionData } = useQuery(
    ['p2p-transaction', transactionId],
    () => axios.get(`/api/p2p/transactions/${transactionId}`)
  );

  const { data: chatData, refetch: refetchMessages } = useQuery(
    ['p2p-chat', transactionData?.data?.data?.chatId],
    () => axios.get(`/api/p2p/chat/${transactionData?.data?.data?.chatId}`),
    {
      enabled: !!transactionData?.data?.data?.chatId
    }
  );

  const transaction = transactionData?.data?.data;
  const chat = chatData?.data?.data?.chat;
  const chatMessages = chatData?.data?.data?.messages || [];

  // Send message mutation
  const sendMessageMutation = useMutation(
    ({ chatId, message, messageType, file }) => {
      const formData = new FormData();
      formData.append('message', message);
      formData.append('messageType', messageType);
      if (file) formData.append('attachment', file);

      return axios.post(`/api/p2p/chat/${chatId}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    {
      onSuccess: () => {
        setNewMessage('');
        refetchMessages();
      }
    }
  );

  // Mark as read mutation
  const markAsReadMutation = useMutation(
    (chatId) => axios.patch(`/api/p2p/chat/${chatId}/read`)
  );

  // Initialize socket connection
  useEffect(() => {
    if (!chat?._id) return;

    const newSocket = io(process.env.REACT_APP_WS_URL || 'http://localhost:3000', {
      auth: {
        token: localStorage.getItem('token')
      }
    });

    setSocket(newSocket);

    // Connection events
    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('join_p2p_chat', chat._id);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Message events
    newSocket.on('new_message', (data) => {
      if (data.chatId === chat._id) {
        setMessages(prev => [...prev, data.message]);
        scrollToBottom();
      }
    });

    // Typing events
    newSocket.on('user_typing', (data) => {
      if (data.chatId === chat._id && data.userId !== getCurrentUserId()) {
        setTypingUsers(prev => [...prev.filter(id => id !== data.userId), data.userId]);
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(id => id !== data.userId));
        }, 3000);
      }
    });

    newSocket.on('user_stopped_typing', (data) => {
      if (data.chatId === chat._id) {
        setTypingUsers(prev => prev.filter(id => id !== data.userId));
      }
    });

    // Negotiation events
    newSocket.on('negotiation_update', (data) => {
      if (data.chatId === chat._id) {
        refetchMessages();
        // Show notification
        showNotification('پیشنهاد جدید دریافت شد');
      }
    });

    return () => {
      newSocket.close();
    };
  }, [chat?._id, refetchMessages]);

  // Update messages when chat data changes
  useEffect(() => {
    if (chatMessages.length > 0) {
      setMessages(chatMessages);
      scrollToBottom();
      
      // Mark messages as read
      if (chat?._id) {
        markAsReadMutation.mutate(chat._id);
      }
    }
  }, [chatMessages, chat?._id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getCurrentUserId = () => {
    // Get from auth context or localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.id;
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !chat?._id) return;

    sendMessageMutation.mutate({
      chatId: chat._id,
      message: newMessage,
      messageType: 'text'
    });

    // Emit typing stopped
    if (socket) {
      socket.emit('stop_typing', { chatId: chat._id });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    // Emit typing event
    if (socket && e.target.value) {
      socket.emit('typing', { chatId: chat._id });
      
      // Clear typing after 1 second of no activity
      clearTimeout(window.typingTimeout);
      window.typingTimeout = setTimeout(() => {
        socket.emit('stop_typing', { chatId: chat._id });
      }, 1000);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !chat?._id) return;

    const messageType = file.type.startsWith('image/') ? 'image' : 'file';
    
    sendMessageMutation.mutate({
      chatId: chat._id,
      message: file.name,
      messageType,
      file
    });
  };

  const formatMessageTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMessageStatus = (message) => {
    const currentUserId = getCurrentUserId();
    if (message.senderId !== currentUserId) return null;

    const isRead = message.readBy?.some(r => r.userId !== currentUserId);
    return isRead ? 'read' : 'sent';
  };

  const showNotification = (message) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('P2P Chat', { body: message });
    }
  };

  if (!transaction || !chat) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] bg-white border rounded-lg shadow-lg">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
              {getOtherParticipant()?.profile?.firstName?.charAt(0)}
            </div>
            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
              isConnected ? 'bg-green-500' : 'bg-gray-400'
            }`}></div>
          </div>
          <div>
            <h3 className="font-semibold">
              {getOtherParticipant()?.profile?.firstName} {getOtherParticipant()?.profile?.lastName}
            </h3>
            <p className="text-sm text-gray-600">
              {transaction.transactionNumber} - {transaction.status === 'completed' ? 'تکمیل شده' : 'فعال'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowNegotiation(true)}
            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
            title="مذاکره"
          >
            <Phone size={20} />
          </button>
          <button
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            title="تماس تصویری"
          >
            <Video size={20} />
          </button>
          <button
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            title="گزینه‌های بیشتر"
          >
            <MoreVertical size={20} />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Transaction Info Banner */}
      <div className="p-3 bg-blue-50 border-b">
        <div className="flex justify-between text-sm">
          <span>
            {transaction.type === 'buy' ? 'خرید' : 'فروش'} {' '}
            {transaction.amount.agreed || transaction.amount.requested} {transaction.currencies.from}
          </span>
          <span>
            نرخ: {(transaction.rate.negotiated || transaction.rate.initial).toLocaleString()} {transaction.currencies.to}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs ${getTransactionStatusColor(transaction.status)}`}>
            {getTransactionStatusText(transaction.status)}
          </span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message, index) => (
          <MessageBubble
            key={message.messageId || index}
            message={message}
            isOwn={message.senderId === getCurrentUserId()}
            showTime={shouldShowTime(messages, index)}
            status={getMessageStatus(message)}
          />
        ))}
        
        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-gray-200 px-3 py-2 rounded-lg max-w-xs">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t">
        <div className="flex items-center space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,application/pdf,.doc,.docx,.txt"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <Paperclip size={20} />
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <Image size={20} />
          </button>
          
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            onKeyPress={handleKeyPress}
            placeholder="پیام خود را بنویسید..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={transaction.status === 'completed' || transaction.status === 'cancelled'}
          />
          
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sendMessageMutation.isLoading}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </div>
      </div>

      {/* Negotiation Modal */}
      {showNegotiation && (
        <NegotiationModal
          transaction={transaction}
          chatId={chat._id}
          onClose={() => setShowNegotiation(false)}
          onSuccess={() => {
            setShowNegotiation(false);
            refetchMessages();
          }}
        />
      )}
    </div>
  );

  function getOtherParticipant() {
    const currentUserId = getCurrentUserId();
    return chat?.participants?.find(p => p.userId._id !== currentUserId)?.userId;
  }

  function shouldShowTime(messages, index) {
    if (index === 0) return true;
    
    const currentMessage = messages[index];
    const previousMessage = messages[index - 1];
    
    const currentTime = new Date(currentMessage.sentAt);
    const previousTime = new Date(previousMessage.sentAt);
    
    return currentTime - previousTime > 5 * 60 * 1000; // 5 minutes
  }
};

// Message Bubble Component
const MessageBubble = ({ message, isOwn, showTime, status }) => {
  const renderMessageContent = () => {
    switch (message.messageType) {
      case 'image':
        return (
          <div>
            <img 
              src={message.attachments?.[0]?.url} 
              alt="Shared image"
              className="max-w-xs rounded-lg cursor-pointer"
              onClick={() => window.open(message.attachments[0].url, '_blank')}
            />
            {message.message && <p className="mt-2">{message.message}</p>}
          </div>
        );
      
      case 'file':
        return (
          <div className="flex items-center space-x-2 p-2 bg-gray-100 rounded-lg">
            <Paperclip size={16} />
            <a 
              href={message.attachments?.[0]?.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {message.attachments?.[0]?.originalName || message.message}
            </a>
          </div>
        );
      
      case 'system':
        return (
          <div className="text-center">
            <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
              {message.message}
            </span>
          </div>
        );
      
      default:
        return <p className="whitespace-pre-wrap">{message.message}</p>;
    }
  };

  if (message.messageType === 'system') {
    return (
      <div className="flex justify-center my-4">
        {renderMessageContent()}
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
        isOwn 
          ? 'bg-blue-500 text-white' 
          : 'bg-gray-200 text-gray-800'
      }`}>
        {/* Reply Context */}
        {message.replyTo && (
          <div className={`mb-2 p-2 rounded border-l-2 text-sm opacity-75 ${
            isOwn ? 'border-blue-200 bg-blue-400' : 'border-gray-400 bg-gray-100'
          }`}>
            <p className="truncate">{message.replyTo.preview}</p>
          </div>
        )}

        {renderMessageContent()}

        <div className="flex items-center justify-between mt-1 text-xs opacity-75">
          <span>{formatMessageTime(message.sentAt)}</span>
          {isOwn && status && (
            <span className="ml-2">
              {status === 'read' ? (
                <CheckCircle size={14} className="text-green-300" />
              ) : (
                <CheckCircle size={14} className="text-gray-300" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Negotiation Modal Component
const NegotiationModal = ({ transaction, chatId, onClose, onSuccess }) => {
  const [offer, setOffer] = useState({
    amount: transaction.amount.agreed || transaction.amount.requested,
    rate: transaction.rate.negotiated || transaction.rate.initial,
    paymentMethod: transaction.paymentMethod,
    message: ''
  });

  const negotiationMutation = useMutation(
    (data) => axios.post(`/api/p2p/chat/${chatId}/negotiate`, data),
    {
      onSuccess: () => {
        onSuccess();
      }
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    negotiationMutation.mutate(offer);
  };

  const totalValue = offer.amount * offer.rate;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">پیشنهاد مذاکره</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              مقدار ({transaction.currencies.from})
            </label>
            <input
              type="number"
              value={offer.amount}
              onChange={(e) => setOffer(prev => ({...prev, amount: parseFloat(e.target.value)}))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نرخ ({transaction.currencies.to})
            </label>
            <input
              type="number"
              value={offer.rate}
              onChange={(e) => setOffer(prev => ({...prev, rate: parseFloat(e.target.value)}))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ارزش کل
            </label>
            <div className="px-3 py-2 bg-gray-100 rounded-lg">
              {totalValue.toLocaleString('fa-IR')} {transaction.currencies.to}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              روش پرداخت
            </label>
            <select
              value={offer.paymentMethod}
              onChange={(e) => setOffer(prev => ({...prev, paymentMethod: e.target.value}))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="cash">نقدی</option>
              <option value="bank_transfer">انتقال بانکی</option>
              <option value="online_payment">پرداخت آنلاین</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              پیام (اختیاری)
            </label>
            <textarea
              value={offer.message}
              onChange={(e) => setOffer(prev => ({...prev, message: e.target.value}))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows="3"
              placeholder="توضیحات اضافی برای پیشنهادتان..."
            />
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={negotiationMutation.isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {negotiationMutation.isLoading ? 'در حال ارسال...' : 'ارسال پیشنهاد'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Helper functions
const formatMessageTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString('fa-IR', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getTransactionStatusColor = (status) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    accepted: 'bg-blue-100 text-blue-800',
    negotiating: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    disputed: 'bg-orange-100 text-orange-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getTransactionStatusText = (status) => {
  const texts = {
    pending: 'در انتظار',
    accepted: 'پذیرفته شده',
    negotiating: 'در حال مذاکره',
    agreed: 'توافق شده',
    meeting_scheduled: 'جلسه تعیین شده',
    in_progress: 'در حال انجام',
    payment_pending: 'در انتظار پرداخت',
    completed: 'تکمیل شده',
    cancelled: 'لغو شده',
    disputed: 'اختلاف',
    expired: 'منقضی شده'
  };
  return texts[status] || status;
};

export default P2PChat;
