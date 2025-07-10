// frontend/src/pages/p2p/P2PChat.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Send,
  Paperclip,
  Image,
  File,
  Download,
  MoreVertical,
  ArrowLeft,
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Camera,
  Mic,
  Phone,
  Video,
  Settings,
  Flag,
  X,
  Search,
  Star,
  Copy,
  Trash2,
  Edit,
  Reply,
  Forward
} from 'lucide-react';
import { useTenantContext } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useWebSocket } from '../../hooks/useWebSocket';
import './P2PChat.css';

const P2PChat = () => {
  const { tradeId, orderId } = useParams();
  const navigate = useNavigate();
  
  // States
  const [messages, setMessages] = useState([]);
  const [tradeInfo, setTradeInfo] = useState(null);
  const [typing, setTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showMessageActions, setShowMessageActions] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [unreadCount, setUnreadCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  // Refs
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  
  // Hooks
  const { tenant } = useTenantContext();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const { socket, isConnected, sendMessage } = useWebSocket();

  // Form validation
  const messageSchema = Yup.object({
    content: Yup.string()
      .max(1000, 'پیام نمی‌تواند بیشتر از 1000 کاراکتر باشد')
      .required('پیام نمی‌تواند خالی باشد')
  });

  // Message form
  const messageForm = useFormik({
    initialValues: {
      content: ''
    },
    validationSchema: messageSchema,
    onSubmit: async (values, { resetForm }) => {
      if (values.content.trim() || selectedFiles.length > 0) {
        await sendNewMessage(values.content.trim(), selectedFiles);
        resetForm();
        setSelectedFiles([]);
        setReplyToMessage(null);
      }
    }
  });

  // WebSocket message handler
  const handleWebSocketMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'new_message':
          if (data.payload.tradeId === tradeId) {
            setMessages(prev => [...prev, data.payload]);
            if (data.payload.senderId !== user.id) {
              setUnreadCount(prev => prev + 1);
              // Play notification sound
              playNotificationSound();
            }
            scrollToBottom();
          }
          break;
          
        case 'message_updated':
          setMessages(prev => prev.map(msg => 
            msg.id === data.payload.id ? { ...msg, ...data.payload } : msg
          ));
          break;
          
        case 'message_deleted':
          setMessages(prev => prev.filter(msg => msg.id !== data.payload.messageId));
          break;
          
        case 'typing_start':
          if (data.payload.userId !== user.id && data.payload.tradeId === tradeId) {
            setOtherUserTyping(true);
          }
          break;
          
        case 'typing_stop':
          if (data.payload.userId !== user.id && data.payload.tradeId === tradeId) {
            setOtherUserTyping(false);
          }
          break;
          
        case 'user_online':
          if (data.payload.tradeId === tradeId) {
            setOnlineStatus(true);
            setLastSeen(null);
          }
          break;
          
        case 'user_offline':
          if (data.payload.tradeId === tradeId) {
            setOnlineStatus(false);
            setLastSeen(data.payload.lastSeen);
          }
          break;
          
        case 'trade_status_update':
          if (data.payload.tradeId === tradeId) {
            setTradeInfo(prev => ({ ...prev, ...data.payload }));
          }
          break;
          
        case 'message_read':
          if (data.payload.tradeId === tradeId) {
            setMessages(prev => prev.map(msg => ({
              ...msg,
              readAt: data.payload.readAt,
              readBy: [...(msg.readBy || []), data.payload.userId]
            })));
          }
          break;
          
        default:
          break;
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }, [tradeId, user.id]);

  // Load initial data
  useEffect(() => {
    loadChatData();
    markMessagesAsRead();
  }, [tradeId]);

  // WebSocket setup
  useEffect(() => {
    if (socket && isConnected) {
      socket.addEventListener('message', handleWebSocketMessage);
      
      // Join chat room
      sendMessage({
        type: 'join_chat',
        tradeId,
        userId: user.id
      });
      
      setConnectionStatus('connected');
    } else {
      setConnectionStatus('disconnected');
    }

    return () => {
      if (socket) {
        socket.removeEventListener('message', handleWebSocketMessage);
        
        // Leave chat room
        sendMessage({
          type: 'leave_chat',
          tradeId,
          userId: user.id
        });
      }
    };
  }, [socket, isConnected, handleWebSocketMessage, tradeId, user.id, sendMessage]);

  // Auto scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle typing indicator
  useEffect(() => {
    const handleTyping = () => {
      if (!typing) {
        setTyping(true);
        sendMessage({
          type: 'typing_start',
          tradeId,
          userId: user.id
        });
      }
      
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(false);
        sendMessage({
          type: 'typing_stop',
          tradeId,
          userId: user.id
        });
      }, 1000);
    };

    const inputElement = messageInputRef.current;
    if (inputElement) {
      inputElement.addEventListener('input', handleTyping);
      
      return () => {
        inputElement.removeEventListener('input', handleTyping);
        clearTimeout(typingTimeoutRef.current);
      };
    }
  }, [tradeId, user.id, typing, sendMessage]);

  // Load chat data
  const loadChatData = async () => {
    try {
      const [messagesRes, tradeRes] = await Promise.all([
        fetch(`/api/p2p/trades/${tradeId}/messages`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'X-Tenant-ID': tenant.id
          }
        }),
        fetch(`/api/p2p/trades/${tradeId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'X-Tenant-ID': tenant.id
          }
        })
      ]);

      if (messagesRes.ok && tradeRes.ok) {
        const messagesData = await messagesRes.json();
        const tradeData = await tradeRes.json();
        
        setMessages(messagesData.messages || []);
        setTradeInfo(tradeData);
        setUnreadCount(messagesData.unreadCount || 0);
      }
    } catch (error) {
      showNotification({
        type: 'error',
        message: 'خطا در بارگیری چت',
        details: error.message
      });
    }
  };

  // Send new message
  const sendNewMessage = async (content, files = []) => {
    try {
      const formData = new FormData();
      formData.append('content', content);
      formData.append('tradeId', tradeId);
      formData.append('replyTo', replyToMessage?.id || '');
      
      files.forEach((file, index) => {
        formData.append(`files[${index}]`, file);
      });

      const response = await fetch('/api/p2p/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Tenant-ID': tenant.id
        },
        body: formData
      });

      if (response.ok) {
        const newMessage = await response.json();
        
        // Send via WebSocket for real-time
        sendMessage({
          type: 'new_message',
          data: newMessage
        });
        
        // Stop typing
        setTyping(false);
        sendMessage({
          type: 'typing_stop',
          tradeId,
          userId: user.id
        });
      }
    } catch (error) {
      showNotification({
        type: 'error',
        message: 'خطا در ارسال پیام',
        details: error.message
      });
    }
  };

  // Mark messages as read
  const markMessagesAsRead = async () => {
    try {
      const response = await fetch(`/api/p2p/trades/${tradeId}/messages/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Tenant-ID': tenant.id
        }
      });

      if (response.ok) {
        setUnreadCount(0);
        sendMessage({
          type: 'messages_read',
          tradeId,
          userId: user.id,
          readAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Handle file selection
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    const validFiles = files.filter(file => {
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB max
      const isValidType = ['image/', 'application/pdf', 'text/', 'application/'].some(type => 
        file.type.startsWith(type)
      );
      return isValidSize && isValidType;
    });

    if (validFiles.length !== files.length) {
      showNotification({
        type: 'warning',
        message: 'برخی فایل‌ها نامعتبر هستند',
        details: 'حداکثر سایز 10MB و فرمت‌های مجاز: تصویر، PDF، متن'
      });
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
    setShowAttachmentMenu(false);
  };

  // Remove selected file
  const removeSelectedFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Handle voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      const chunks = [];
      mediaRecorderRef.current.ondataavailable = (event) => {
        chunks.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        setSelectedFiles(prev => [...prev, file]);
        
        // Stop recording timer
        clearInterval(recordingIntervalRef.current);
        setRecordingDuration(0);
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      showNotification({
        type: 'error',
        message: 'خطا در ضبط صدا',
        details: 'لطفاً دسترسی میکروفون را بررسی کنید'
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  // Delete message
  const deleteMessage = async (messageId) => {
    try {
      const response = await fetch(`/api/p2p/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Tenant-ID': tenant.id
        }
      });

      if (response.ok) {
        sendMessage({
          type: 'message_deleted',
          messageId,
          tradeId
        });
      }
    } catch (error) {
      showNotification({
        type: 'error',
        message: 'خطا در حذف پیام',
        details: error.message
      });
    }
  };

  // Edit message
  const editMessage = async (messageId, newContent) => {
    try {
      const response = await fetch(`/api/p2p/messages/${messageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Tenant-ID': tenant.id
        },
        body: JSON.stringify({ content: newContent })
      });

      if (response.ok) {
        const updatedMessage = await response.json();
        sendMessage({
          type: 'message_updated',
          data: updatedMessage
        });
        setEditingMessage(null);
      }
    } catch (error) {
      showNotification({
        type: 'error',
        message: 'خطا در ویرایش پیام',
        details: error.message
      });
    }
  };

  // Utility functions
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('fa-IR', {
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

  const playNotificationSound = () => {
    const audio = new Audio('/notification.mp3');
    audio.play().catch(e => console.log('Cannot play sound:', e));
  };

  const getOtherUser = () => {
    if (!tradeInfo) return null;
    return tradeInfo.buyerId === user.id ? tradeInfo.seller : tradeInfo.buyer;
  };

  const otherUser = getOtherUser();

  return (
    <div className="p2p-chat">
      {/* Chat Header */}
      <div className="chat-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          
          <div className="user-info">
            <div className="user-avatar">
              {otherUser?.avatar ? (
                <img src={otherUser.avatar} alt={otherUser.name} />
              ) : (
                <div className="avatar-placeholder">
                  {otherUser?.name?.charAt(0)}
                </div>
              )}
              <div className={`status-indicator ${onlineStatus ? 'online' : 'offline'}`}></div>
            </div>
            
            <div className="user-details">
              <h3>{otherUser?.name}</h3>
              <div className="user-status">
                {onlineStatus ? (
                  <span className="online-status">آنلاین</span>
                ) : lastSeen ? (
                  <span className="last-seen">
                    آخرین بازدید: {formatTime(lastSeen)}
                  </span>
                ) : (
                  <span className="offline-status">آفلاین</span>
                )}
                {otherUserTyping && (
                  <span className="typing-indicator">
                    در حال تایپ...
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="header-right">
          <div className="connection-status">
            <div className={`connection-indicator ${connectionStatus}`}>
              <div className="status-dot"></div>
            </div>
          </div>

          <button 
            className="search-btn"
            onClick={() => setShowSearch(!showSearch)}
          >
            <Search size={18} />
          </button>

          <div className="header-actions">
            <button className="action-btn">
              <Phone size={18} />
            </button>
            <button className="action-btn">
              <Video size={18} />
            </button>
            <button className="action-btn">
              <MoreVertical size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="search-bar">
          <Search size={16} />
          <input
            type="text"
            placeholder="جستجو در پیام‌ها..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button onClick={() => setShowSearch(false)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Trade Info Banner */}
      {tradeInfo && (
        <div className="trade-info-banner">
          <div className="trade-details">
            <span className="trade-type">
              {tradeInfo.type === 'buy' ? 'خرید' : 'فروش'} {tradeInfo.currency}
            </span>
            <span className="trade-amount">
              {tradeInfo.amount.toLocaleString()} × {tradeInfo.rate.toLocaleString()} تومان
            </span>
            <span className={`trade-status ${tradeInfo.status}`}>
              {tradeInfo.status === 'pending' && 'در انتظار'}
              {tradeInfo.status === 'active' && 'فعال'}
              {tradeInfo.status === 'completed' && 'تکمیل شده'}
              {tradeInfo.status === 'cancelled' && 'لغو شده'}
            </span>
          </div>
          
          <div className="trade-actions">
            <button className="info-btn">
              <Shield size={14} />
              اطلاعات معامله
            </button>
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div className="messages-container" ref={chatContainerRef}>
        <div className="messages-list">
          {messages.length === 0 ? (
            <div className="empty-chat">
              <div className="empty-icon">💬</div>
              <h3>شروع گفتگو</h3>
              <p>هنوز پیامی رد و بدل نشده است</p>
            </div>
          ) : (
            messages
              .filter(msg => !searchTerm || msg.content.includes(searchTerm))
              .map((message, index) => (
                <MessageItem
                  key={message.id}
                  message={message}
                  isOwn={message.senderId === user.id}
                  showTimestamp={
                    index === 0 ||
                    new Date(message.createdAt).getTime() - new Date(messages[index - 1].createdAt).getTime() > 300000
                  }
                  onReply={() => setReplyToMessage(message)}
                  onEdit={() => setEditingMessage(message)}
                  onDelete={() => deleteMessage(message.id)}
                  onSelect={() => setSelectedMessage(message)}
                />
              ))
          )}
          
          {otherUserTyping && (
            <div className="typing-bubble">
              <div className="typing-animation">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Reply Banner */}
      {replyToMessage && (
        <div className="reply-banner">
          <div className="reply-content">
            <span className="reply-label">پاسخ به:</span>
            <span className="reply-text">{replyToMessage.content}</span>
          </div>
          <button onClick={() => setReplyToMessage(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div className="selected-files">
          {selectedFiles.map((file, index) => (
            <div key={index} className="file-item">
              {file.type.startsWith('image/') ? (
                <div className="image-preview">
                  <img src={URL.createObjectURL(file)} alt={file.name} />
                </div>
              ) : (
                <div className="file-preview">
                  <File size={16} />
                  <span>{file.name}</span>
                </div>
              )}
              <span className="file-size">{formatFileSize(file.size)}</span>
              <button onClick={() => removeSelectedFile(index)}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Message Input */}
      <div className="message-input-container">
        <form onSubmit={messageForm.handleSubmit} className="message-form">
          <div className="input-actions">
            {/* Attachment Menu */}
            <div className="attachment-menu">
              <button
                type="button"
                className="attachment-btn"
                onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
              >
                <Paperclip size={18} />
              </button>
              
              {showAttachmentMenu && (
                <div className="attachment-options">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <File size={16} />
                    فایل
                  </button>
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <Image size={16} />
                    تصویر
                  </button>
                  <button
                    type="button"
                    onClick={() => navigator.mediaDevices.getUserMedia({ video: true })}
                  >
                    <Camera size={16} />
                    دوربین
                  </button>
                </div>
              )}
            </div>

            {/* Voice Recording */}
            <button
              type="button"
              className={`voice-btn ${isRecording ? 'recording' : ''}`}
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={stopRecording}
            >
              <Mic size={18} />
              {isRecording && (
                <span className="recording-duration">{recordingDuration}s</span>
              )}
            </button>
          </div>

          <div className="message-input-wrapper">
            <input
              ref={messageInputRef}
              type="text"
              name="content"
              value={messageForm.values.content}
              onChange={messageForm.handleChange}
              onBlur={messageForm.handleBlur}
              placeholder={editingMessage ? 'ویرایش پیام...' : 'پیام خود را بنویسید...'}
              disabled={messageForm.isSubmitting}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  messageForm.handleSubmit();
                }
              }}
            />
            
            {messageForm.touched.content && messageForm.errors.content && (
              <div className="input-error">{messageForm.errors.content}</div>
            )}
          </div>

          <button
            type="submit"
            className="send-btn"
            disabled={
              messageForm.isSubmitting ||
              (!messageForm.values.content.trim() && selectedFiles.length === 0)
            }
          >
            <Send size={18} />
          </button>
        </form>

        {/* Hidden File Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={handleFileSelect}
          accept=".pdf,.doc,.docx,.txt,.zip,.rar"
        />
        <input
          ref={imageInputRef}
          type="file"
          multiple
          hidden
          onChange={handleFileSelect}
          accept="image/*"
        />
      </div>
    </div>
  );
};

// Message Item Component
const MessageItem = ({ 
  message, 
  isOwn, 
  showTimestamp, 
  onReply, 
  onEdit, 
  onDelete, 
  onSelect 
}) => {
  const [showActions, setShowActions] = useState(false);
  const [imageError, setImageError] = useState({});

  const handleImageError = (fileId) => {
    setImageError(prev => ({ ...prev, [fileId]: true }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`message-item ${isOwn ? 'own' : 'other'}`}>
      {showTimestamp && (
        <div className="timestamp-divider">
          <span>{formatTime(message.createdAt)}</span>
        </div>
      )}
      
      <div
        className="message-bubble"
        onClick={() => onSelect(message)}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowActions(!showActions);
        }}
      >
        {/* Reply Reference */}
        {message.replyTo && (
          <div className="reply-reference">
            <div className="reply-line"></div>
            <div className="reply-content">
              <span className="reply-author">
                {message.replyTo.senderName}
              </span>
              <span className="reply-text">
                {message.replyTo.content}
              </span>
            </div>
          </div>
        )}

        {/* Message Content */}
        <div className="message-content">
          {message.content && (
            <div className="text-content">
              {message.content}
            </div>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="attachments">
              {message.attachments.map((file, index) => (
                <div key={index} className="attachment-item">
                  {file.type.startsWith('image/') ? (
                    <div className="image-attachment">
                      {imageError[file.id] ? (
                        <div className="image-error">
                          <Image size={24} />
                          <span>خطا در بارگیری تصویر</span>
                        </div>
                      ) : (
                        <img
                          src={file.url}
                          alt={file.name}
                          onError={() => handleImageError(file.id)}
                          onClick={() => window.open(file.url, '_blank')}
                        />
                      )}
                    </div>
                  ) : file.type.startsWith('audio/') ? (
                    <div className="audio-attachment">
                      <audio controls>
                        <source src={file.url} type={file.type} />
                      </audio>
                    </div>
                  ) : (
                    <div className="file-attachment">
                      <div className="file-icon">
                        <File size={20} />
                      </div>
                      <div className="file-info">
                        <span className="file-name">{file.name}</span>
                        <span className="file-size">{file.size}</span>
                      </div>
                      <button
                        className="download-btn"
                        onClick={() => window.open(file.url, '_blank')}
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message Info */}
        <div className="message-info">
          <span className="message-time">
            {formatTime(message.createdAt)}
          </span>
          
          {isOwn && (
            <div className="message-status">
              {message.readBy && message.readBy.length > 0 ? (
                <CheckCircle size={12} className="read" />
              ) : (
                <CheckCircle size={12} className="sent" />
              )}
            </div>
          )}
          
          {message.edited && (
            <span className="edited-indicator">ویرایش شده</span>
          )}
        </div>

        {/* Message Actions */}
        {showActions && (
          <div className="message-actions">
            <button onClick={() => onReply(message)}>
              <Reply size={14} />
              پاسخ
            </button>
            <button onClick={() => copyToClipboard(message.content)}>
              <Copy size={14} />
              کپی
            </button>
            {isOwn && (
              <>
                <button onClick={() => onEdit(message)}>
                  <Edit size={14} />
                  ویرایش
                </button>
                <button onClick={() => onDelete(message)} className="delete">
                  <Trash2 size={14} />
                  حذف
                </button>
              </>
            )}
            <button>
              <Forward size={14} />
              فوروارد
            </button>
            <button>
              <Flag size={14} />
              گزارش
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default P2PChat;
