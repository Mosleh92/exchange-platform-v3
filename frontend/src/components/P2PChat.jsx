import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { t } from '../utils/i18n';
import api from '../services/api';

const P2PChat = () => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const messagesEndRef = useRef(null);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerData, setOfferData] = useState({
    amount: '',
    rate: '',
    paymentMethod: '',
    terms: '',
    expiresInHours: 24
  });

  useEffect(() => {
    loadChats();
    updateOnlineStatus(true);
    
    // Update online status every 30 seconds
    const interval = setInterval(() => {
      updateOnlineStatus(true);
    }, 30000);

    return () => {
      clearInterval(interval);
      updateOnlineStatus(false);
    };
  }, []);

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat.chatId);
    }
  }, [selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChats = async () => {
    try {
      const response = await api.get('/p2p/chats');
      setChats(response.data.data);
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  const loadMessages = async (chatId, page = 1) => {
    try {
      const response = await api.get(`/p2p/chats/${chatId}/messages?page=${page}`);
      if (page === 1) {
        setMessages(response.data.data.messages);
      } else {
        setMessages(prev => [...response.data.data.messages, ...prev]);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    try {
      await api.post(`/p2p/chats/${selectedChat.chatId}/messages`, {
        content: newMessage,
        type: 'text'
      });
      
      setNewMessage('');
      loadMessages(selectedChat.chatId);
    } catch (error) {
      console.error('Error sending message:', error);
      alert(t('error.messageSendFailed'));
    }
  };

  const makeOffer = async () => {
    if (!selectedChat || !offerData.amount || !offerData.rate) return;

    try {
      await api.post(`/p2p/chats/${selectedChat.chatId}/offers`, offerData);
      
      setShowOfferForm(false);
      setOfferData({
        amount: '',
        rate: '',
        paymentMethod: '',
        terms: '',
        expiresInHours: 24
      });
      
      loadMessages(selectedChat.chatId);
      alert(t('p2p.offerMade'));
    } catch (error) {
      console.error('Error making offer:', error);
      alert(t('error.offerCreationFailed'));
    }
  };

  const respondToOffer = async (offerId, response) => {
    try {
      await api.put(`/p2p/chats/${selectedChat.chatId}/offers/${offerId}/respond`, {
        response
      });
      
      loadMessages(selectedChat.chatId);
      alert(t('p2p.offerResponded'));
    } catch (error) {
      console.error('Error responding to offer:', error);
      alert(t('error.offerResponseFailed'));
    }
  };

  const updateOnlineStatus = async (isOnline) => {
    try {
      await api.put('/p2p/status', { isOnline });
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getParticipantName = (chat, participantId) => {
    const participant = chat.participants.find(p => p.userId._id === participantId);
    return participant ? participant.userId.name : 'Unknown';
  };

  const isParticipantOnline = (chat, participantId) => {
    const participant = chat.participants.find(p => p.userId._id === participantId);
    return participant ? participant.isOnline : false;
  };

  const formatMessageTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getMessageTypeIcon = (type) => {
    const icons = {
      text: '💬',
      image: '🖼️',
      file: '📎',
      offer: '💰',
      counter_offer: '💱',
      accept: '✅',
      reject: '❌'
    };
    return icons[type] || '💬';
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="flex h-[600px]">
          {/* Chat List */}
          <div className="w-1/3 border-r border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">
                {t('p2p.chats')}
              </h2>
            </div>
            
            <div className="overflow-y-auto h-full">
              {chats.map(chat => (
                <div
                  key={chat.chatId}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                    selectedChat?.chatId === chat.chatId ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedChat(chat)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="font-medium text-sm">
                        {chat.orderId?.orderId || 'Order'}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      chat.orderId?.type === 'buy' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {t(`p2p.${chat.orderId?.type}`)}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-1">
                    {chat.orderId?.currencyFrom} → {chat.orderId?.currencyTo}
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    {chat.messages.length > 0 ? 
                      chat.messages[chat.messages.length - 1].content.substring(0, 50) + '...' : 
                      t('p2p.noMessages')
                    }
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex space-x-1">
                      {chat.participants.map(participant => (
                        <div key={participant.userId._id} className="flex items-center space-x-1">
                          <div className={`w-2 h-2 rounded-full ${
                            participant.isOnline ? 'bg-green-500' : 'bg-gray-400'
                          }`}></div>
                          <span className="text-xs text-gray-600">
                            {participant.userId.name}
                          </span>
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">
                      {chat.messages.length > 0 ? 
                        formatMessageTime(chat.messages[chat.messages.length - 1].createdAt) : ''
                      }
                    </span>
                  </div>
                </div>
              ))}
              
              {chats.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  {t('p2p.noChats')}
                </div>
              )}
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 flex flex-col">
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {selectedChat.orderId?.orderId} - {t(`p2p.${selectedChat.orderId?.type}`)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {selectedChat.orderId?.currencyFrom} {selectedChat.orderId?.amountFrom} → {selectedChat.orderId?.currencyTo} {selectedChat.orderId?.amountTo}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setShowOfferForm(true)}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                      >
                        {t('p2p.makeOffer')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${
                        message.sender.userId === user.id ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.sender.userId === user.id 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 text-gray-800'
                      }`}>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm">{getMessageTypeIcon(message.type)}</span>
                          <span className="text-xs opacity-75">
                            {getParticipantName(selectedChat, message.sender.userId)}
                          </span>
                          <span className="text-xs opacity-75">
                            {formatMessageTime(message.createdAt)}
                          </span>
                        </div>
                        
                        {message.type === 'text' && (
                          <div className="text-sm">{message.content}</div>
                        )}
                        
                        {message.type === 'offer' && (
                          <div className="bg-white bg-opacity-20 rounded p-2">
                            <div className="text-sm font-medium">{t('p2p.offer')}</div>
                            <div className="text-xs space-y-1">
                              <div>{t('p2p.amount')}: {message.content.amount}</div>
                              <div>{t('p2p.rate')}: {message.content.rate}</div>
                              <div>{t('p2p.paymentMethod')}: {message.content.paymentMethod}</div>
                              {message.content.terms && (
                                <div>{t('p2p.terms')}: {message.content.terms}</div>
                              )}
                            </div>
                            {message.status === 'pending' && message.sender.userId !== user.id && (
                              <div className="flex space-x-2 mt-2">
                                <button
                                  onClick={() => respondToOffer(message.offerId, 'accept')}
                                  className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                                >
                                  {t('p2p.accept')}
                                </button>
                                <button
                                  onClick={() => respondToOffer(message.offerId, 'reject')}
                                  className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                                >
                                  {t('p2p.reject')}
                                </button>
                              </div>
                            )}
                            {message.status !== 'pending' && (
                              <div className={`text-xs mt-1 ${
                                message.status === 'accepted' ? 'text-green-300' : 'text-red-300'
                              }`}>
                                {t(`p2p.${message.status}`)}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2">
                            {message.attachments.map((attachment, idx) => (
                              <div key={idx} className="text-xs opacity-75">
                                📎 {attachment.fileName}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder={t('p2p.typeMessage')}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('p2p.send')}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="text-4xl mb-4">💬</div>
                  <p>{t('p2p.selectChat')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Offer Form Modal */}
      {showOfferForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">
                  {t('p2p.makeOffer')}
                </h3>
                <button
                  onClick={() => setShowOfferForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); makeOffer(); }} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('p2p.amount')}
                  </label>
                  <input
                    type="number"
                    value={offerData.amount}
                    onChange={(e) => setOfferData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('p2p.rate')}
                  </label>
                  <input
                    type="number"
                    value={offerData.rate}
                    onChange={(e) => setOfferData(prev => ({ ...prev, rate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.000000"
                    step="0.000001"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('p2p.paymentMethod')}
                  </label>
                  <input
                    type="text"
                    value={offerData.paymentMethod}
                    onChange={(e) => setOfferData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('p2p.paymentMethodPlaceholder')}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('p2p.terms')}
                  </label>
                  <textarea
                    value={offerData.terms}
                    onChange={(e) => setOfferData(prev => ({ ...prev, terms: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder={t('p2p.termsPlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('p2p.expiresIn')}
                  </label>
                  <select
                    value={offerData.expiresInHours}
                    onChange={(e) => setOfferData(prev => ({ ...prev, expiresInHours: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>1 {t('p2p.hour')}</option>
                    <option value={6}>6 {t('p2p.hours')}</option>
                    <option value={12}>12 {t('p2p.hours')}</option>
                    <option value={24}>24 {t('p2p.hours')}</option>
                    <option value={48}>48 {t('p2p.hours')}</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowOfferForm(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  {t('p2p.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  {t('p2p.makeOffer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default P2PChat; 