import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { formatCurrency, formatDate } from '../../utils/format';
import './P2PAnnouncementCard.css';

/**
 * P2P Announcement Card Component
 * Features: User Verification, Rating Display, Interactive Actions
 */
const P2PAnnouncementCard = ({ 
  announcement, 
  onContact, 
  onFavorite, 
  onReport,
  showActions = true 
}) => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  
  const [isFavorited, setIsFavorited] = useState(announcement.isFavorited || false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactMethod, setContactMethod] = useState('');

  // Calculate user rating
  const userRating = announcement.user.rating || 0;
  const ratingStars = Math.round(userRating);
  const ratingPercentage = (userRating / 5) * 100;

  // Format limits
  const formatLimit = (min, max) => {
    if (min === max) return formatCurrency(min, announcement.currency);
    return `${formatCurrency(min, announcement.currency)} - ${formatCurrency(max, announcement.currency)}`;
  };

  // Handle favorite toggle
  const handleFavorite = async () => {
    try {
      const response = await fetch(`/api/p2p/announcements/${announcement._id}/favorite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'x-tenant-id': currentTenant._id
        }
      });

      if (response.ok) {
        setIsFavorited(!isFavorited);
        onFavorite?.(announcement._id, !isFavorited);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // Handle contact
  const handleContact = (method) => {
    setContactMethod(method);
    setShowContactModal(true);
    onContact?.(announcement, method);
  };

  // Handle report
  const handleReport = async () => {
    try {
      const response = await fetch(`/api/p2p/announcements/${announcement._id}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'x-tenant-id': currentTenant._id
        },
        body: JSON.stringify({
          reason: 'inappropriate_content',
          description: 'Reported by user'
        })
      });

      if (response.ok) {
        onReport?.(announcement._id);
      }
    } catch (error) {
      console.error('Error reporting announcement:', error);
    }
  };

  // Get verification badge
  const getVerificationBadge = () => {
    if (announcement.user.isVerified) {
      return <span className="verification-badge verified">✓ Verified</span>;
    }
    if (announcement.user.isPremium) {
      return <span className="verification-badge premium">⭐ Premium</span>;
    }
    return null;
  };

  // Get status badge
  const getStatusBadge = () => {
    const statusClasses = {
      active: 'status-active',
      paused: 'status-paused',
      completed: 'status-completed',
      expired: 'status-expired'
    };
    
    return (
      <span className={`status-badge ${statusClasses[announcement.status] || 'status-default'}`}>
        {announcement.status}
      </span>
    );
  };

  return (
    <div className="p2p-announcement-card">
      {/* Header */}
      <div className="card-header">
        <div className="user-info">
          <div className="user-avatar">
            <img 
              src={announcement.user.avatar || '/default-avatar.png'} 
              alt={announcement.user.name}
              onError={(e) => {
                e.target.src = '/default-avatar.png';
              }}
            />
            {getVerificationBadge()}
          </div>
          
          <div className="user-details">
            <h3 className="user-name">{announcement.user.name}</h3>
            <div className="user-rating">
              <div className="stars">
                {[1, 2, 3, 4, 5].map(star => (
                  <span 
                    key={star} 
                    className={`star ${star <= ratingStars ? 'filled' : 'empty'}`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="rating-text">
                {userRating.toFixed(1)} ({announcement.user.totalReviews || 0} reviews)
              </span>
            </div>
            <div className="user-stats">
              <span className="stat">
                <strong>{announcement.user.completedTrades || 0}</strong> trades
              </span>
              <span className="stat">
                <strong>{announcement.user.responseTime || 'N/A'}</strong> response time
              </span>
            </div>
          </div>
        </div>

        <div className="card-actions">
          {showActions && (
            <>
              <button
                className={`btn btn-icon ${isFavorited ? 'btn-primary' : 'btn-outline'}`}
                onClick={handleFavorite}
                title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
              >
                {isFavorited ? '❤️' : '🤍'}
              </button>
              
              <button
                className="btn btn-icon btn-outline"
                onClick={handleReport}
                title="Report this announcement"
              >
                ⚠️
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="card-content">
        <div className="announcement-type">
          <span className={`type-badge type-${announcement.type}`}>
            {announcement.type === 'buy' ? 'Buying' : 'Selling'}
          </span>
          {getStatusBadge()}
        </div>

        <div className="currency-info">
          <div className="currency-pair">
            <span className="currency-icon">{announcement.fromCurrency}</span>
            <span className="arrow">→</span>
            <span className="currency-icon">{announcement.toCurrency}</span>
          </div>
          
          <div className="exchange-rate">
            <span className="rate-label">Rate:</span>
            <span className="rate-value">
              {formatCurrency(announcement.exchangeRate, announcement.toCurrency)}
            </span>
          </div>
        </div>

        <div className="limits-info">
          <div className="limit-item">
            <span className="limit-label">Min:</span>
            <span className="limit-value">
              {formatCurrency(announcement.minAmount, announcement.fromCurrency)}
            </span>
          </div>
          
          <div className="limit-item">
            <span className="limit-label">Max:</span>
            <span className="limit-value">
              {formatCurrency(announcement.maxAmount, announcement.fromCurrency)}
            </span>
          </div>
        </div>

        {announcement.description && (
          <div className="announcement-description">
            <p>{announcement.description}</p>
          </div>
        )}

        <div className="payment-methods">
          <h4>Payment Methods:</h4>
          <div className="payment-list">
            {announcement.paymentMethods.map(method => (
              <span key={method} className="payment-method">
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="card-footer">
        <div className="footer-info">
          <span className="created-date">
            Posted {formatDate(announcement.createdAt)}
          </span>
          {announcement.location && (
            <span className="location">
              📍 {announcement.location}
            </span>
          )}
        </div>

        {showActions && (
          <div className="footer-actions">
            <button
              className="btn btn-primary"
              onClick={() => handleContact('chat')}
            >
              💬 Chat
            </button>
            
            <button
              className="btn btn-outline"
              onClick={() => handleContact('call')}
            >
              📞 Call
            </button>
          </div>
        )}
      </div>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="contact-modal-overlay" onClick={() => setShowContactModal(false)}>
          <div className="contact-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Contact {announcement.user.name}</h3>
              <button 
                className="btn btn-icon"
                onClick={() => setShowContactModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-content">
              <div className="contact-methods">
                <button
                  className="contact-method"
                  onClick={() => handleContact('whatsapp')}
                >
                  <span className="method-icon">📱</span>
                  <span className="method-name">WhatsApp</span>
                </button>
                
                <button
                  className="contact-method"
                  onClick={() => handleContact('telegram')}
                >
                  <span className="method-icon">📬</span>
                  <span className="method-name">Telegram</span>
                </button>
                
                <button
                  className="contact-method"
                  onClick={() => handleContact('email')}
                >
                  <span className="method-icon">📧</span>
                  <span className="method-name">Email</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default P2PAnnouncementCard; 