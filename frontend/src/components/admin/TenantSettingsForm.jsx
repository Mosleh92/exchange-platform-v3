import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import './TenantSettingsForm.css';

/**
 * Comprehensive Tenant Settings Form Component
 * Features: Configuration, Billing, Security, Notifications
 */
const TenantSettingsForm = ({ 
  tenant, 
  onSave, 
  onCancel,
  isEditing = false 
}) => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  
  const [formData, setFormData] = useState({
    // Basic Information
    name: '',
    code: '',
    domain: '',
    description: '',
    
    // Contact Information
    contactEmail: '',
    contactPhone: '',
    address: '',
    city: '',
    country: '',
    
    // Business Settings
    currency: 'IRR',
    timezone: 'Asia/Tehran',
    language: 'fa',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24',
    
    // Exchange Settings
    defaultExchangeRate: '',
    commissionRate: '',
    minTransactionAmount: '',
    maxTransactionAmount: '',
    supportedCurrencies: [],
    
    // Security Settings
    requireTwoFactor: false,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true
    },
    
    // Notification Settings
    emailNotifications: {
      newTransaction: true,
      lowBalance: true,
      securityAlert: true,
      systemMaintenance: true
    },
    smsNotifications: {
      newTransaction: false,
      lowBalance: true,
      securityAlert: true
    },
    
    // Billing Settings
    billingCycle: 'monthly',
    planType: 'standard',
    customFeatures: [],
    
    // API Settings
    apiEnabled: false,
    apiKey: '',
    webhookUrl: '',
    allowedOrigins: []
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // Load tenant data
  useEffect(() => {
    if (tenant) {
      setFormData({
        ...formData,
        ...tenant
      });
    }
  }, [tenant]);

  // Validation
  const validateForm = () => {
    const newErrors = {};

    // Basic validation
    if (!formData.name.trim()) {
      newErrors.name = 'Tenant name is required';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Tenant code is required';
    } else if (!/^[A-Z0-9]{3,10}$/.test(formData.code)) {
      newErrors.code = 'Code must be 3-10 characters, uppercase letters and numbers only';
    }

    if (!formData.contactEmail) {
      newErrors.contactEmail = 'Contact email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Invalid email format';
    }

    // Business validation
    if (formData.defaultExchangeRate && isNaN(formData.defaultExchangeRate)) {
      newErrors.defaultExchangeRate = 'Must be a valid number';
    }

    if (formData.commissionRate && (isNaN(formData.commissionRate) || formData.commissionRate < 0 || formData.commissionRate > 100)) {
      newErrors.commissionRate = 'Must be a valid percentage (0-100)';
    }

    if (formData.minTransactionAmount && isNaN(formData.minTransactionAmount)) {
      newErrors.minTransactionAmount = 'Must be a valid number';
    }

    if (formData.maxTransactionAmount && isNaN(formData.maxTransactionAmount)) {
      newErrors.maxTransactionAmount = 'Must be a valid number';
    }

    // API validation
    if (formData.apiEnabled && !formData.webhookUrl) {
      newErrors.webhookUrl = 'Webhook URL is required when API is enabled';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/admin/tenants${isEditing ? `/${tenant._id}` : ''}`, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'x-tenant-id': currentTenant._id
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        onSave?.(result);
      } else {
        const errorData = await response.json();
        setErrors(errorData.errors || { general: 'Failed to save tenant settings' });
      }
    } catch (error) {
      setErrors({ general: 'Network error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Handle nested object changes
  const handleNestedChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }));
  };

  // Generate API key
  const generateApiKey = () => {
    const key = 'sk_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
    handleInputChange('apiKey', key);
  };

  // Tabs configuration
  const tabs = [
    { id: 'general', label: 'General', icon: '🏢' },
    { id: 'business', label: 'Business', icon: '💰' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'billing', label: 'Billing', icon: '💳' },
    { id: 'api', label: 'API', icon: '🔌' }
  ];

  return (
    <div className="tenant-settings-form">
      <div className="form-header">
        <h2>{isEditing ? 'Edit Tenant Settings' : 'Create New Tenant'}</h2>
        <p>Configure tenant settings and preferences</p>
      </div>

      {/* Error Display */}
      {errors.general && (
        <div className="error-alert">
          ⚠️ {errors.general}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="form-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="settings-form">
        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="tab-content">
            <div className="form-section">
              <h3>Basic Information</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Tenant Name *</label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={errors.name ? 'error' : ''}
                    placeholder="Enter tenant name"
                  />
                  {errors.name && <span className="error-message">{errors.name}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="code">Tenant Code *</label>
                  <input
                    type="text"
                    id="code"
                    value={formData.code}
                    onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                    className={errors.code ? 'error' : ''}
                    placeholder="ABC123"
                    maxLength={10}
                  />
                  {errors.code && <span className="error-message">{errors.code}</span>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="domain">Domain</label>
                <input
                  type="text"
                  id="domain"
                  value={formData.domain}
                  onChange={(e) => handleInputChange('domain', e.target.value)}
                  placeholder="example.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter tenant description"
                  rows={3}
                />
              </div>
            </div>

            <div className="form-section">
              <h3>Contact Information</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="contactEmail">Contact Email *</label>
                  <input
                    type="email"
                    id="contactEmail"
                    value={formData.contactEmail}
                    onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                    className={errors.contactEmail ? 'error' : ''}
                    placeholder="contact@example.com"
                  />
                  {errors.contactEmail && <span className="error-message">{errors.contactEmail}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="contactPhone">Contact Phone</label>
                  <input
                    type="tel"
                    id="contactPhone"
                    value={formData.contactPhone}
                    onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                    placeholder="+98 21 1234 5678"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="address">Address</label>
                <input
                  type="text"
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Enter address"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="city">City</label>
                  <input
                    type="text"
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="Tehran"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="country">Country</label>
                  <input
                    type="text"
                    id="country"
                    value={formData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    placeholder="Iran"
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Regional Settings</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="currency">Default Currency</label>
                  <select
                    id="currency"
                    value={formData.currency}
                    onChange={(e) => handleInputChange('currency', e.target.value)}
                  >
                    <option value="IRR">IRR - Iranian Rial</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="timezone">Timezone</label>
                  <select
                    id="timezone"
                    value={formData.timezone}
                    onChange={(e) => handleInputChange('timezone', e.target.value)}
                  >
                    <option value="Asia/Tehran">Asia/Tehran</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="Europe/London">Europe/London</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="language">Language</label>
                  <select
                    id="language"
                    value={formData.language}
                    onChange={(e) => handleInputChange('language', e.target.value)}
                  >
                    <option value="fa">فارسی</option>
                    <option value="en">English</option>
                    <option value="ar">العربية</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="dateFormat">Date Format</label>
                  <select
                    id="dateFormat"
                    value={formData.dateFormat}
                    onChange={(e) => handleInputChange('dateFormat', e.target.value)}
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Business Tab */}
        {activeTab === 'business' && (
          <div className="tab-content">
            <div className="form-section">
              <h3>Exchange Settings</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="defaultExchangeRate">Default Exchange Rate</label>
                  <input
                    type="number"
                    id="defaultExchangeRate"
                    value={formData.defaultExchangeRate}
                    onChange={(e) => handleInputChange('defaultExchangeRate', e.target.value)}
                    className={errors.defaultExchangeRate ? 'error' : ''}
                    placeholder="0.00"
                    step="0.01"
                  />
                  {errors.defaultExchangeRate && <span className="error-message">{errors.defaultExchangeRate}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="commissionRate">Commission Rate (%)</label>
                  <input
                    type="number"
                    id="commissionRate"
                    value={formData.commissionRate}
                    onChange={(e) => handleInputChange('commissionRate', e.target.value)}
                    className={errors.commissionRate ? 'error' : ''}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    max="100"
                  />
                  {errors.commissionRate && <span className="error-message">{errors.commissionRate}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="minTransactionAmount">Minimum Transaction Amount</label>
                  <input
                    type="number"
                    id="minTransactionAmount"
                    value={formData.minTransactionAmount}
                    onChange={(e) => handleInputChange('minTransactionAmount', e.target.value)}
                    className={errors.minTransactionAmount ? 'error' : ''}
                    placeholder="0.00"
                    step="0.01"
                  />
                  {errors.minTransactionAmount && <span className="error-message">{errors.minTransactionAmount}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="maxTransactionAmount">Maximum Transaction Amount</label>
                  <input
                    type="number"
                    id="maxTransactionAmount"
                    value={formData.maxTransactionAmount}
                    onChange={(e) => handleInputChange('maxTransactionAmount', e.target.value)}
                    className={errors.maxTransactionAmount ? 'error' : ''}
                    placeholder="0.00"
                    step="0.01"
                  />
                  {errors.maxTransactionAmount && <span className="error-message">{errors.maxTransactionAmount}</span>}
                </div>
              </div>

              <div className="form-group">
                <label>Supported Currencies</label>
                <div className="checkbox-group">
                  {['IRR', 'USD', 'EUR', 'GBP', 'AED', 'TRY'].map(currency => (
                    <label key={currency} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={formData.supportedCurrencies.includes(currency)}
                        onChange={(e) => {
                          const newCurrencies = e.target.checked
                            ? [...formData.supportedCurrencies, currency]
                            : formData.supportedCurrencies.filter(c => c !== currency);
                          handleInputChange('supportedCurrencies', newCurrencies);
                        }}
                      />
                      <span className="checkmark"></span>
                      {currency}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="tab-content">
            <div className="form-section">
              <h3>Authentication Settings</h3>
              
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.requireTwoFactor}
                    onChange={(e) => handleInputChange('requireTwoFactor', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  Require Two-Factor Authentication
                </label>
              </div>

              <div className="form-group">
                <label htmlFor="sessionTimeout">Session Timeout (minutes)</label>
                <input
                  type="number"
                  id="sessionTimeout"
                  value={formData.sessionTimeout}
                  onChange={(e) => handleInputChange('sessionTimeout', parseInt(e.target.value))}
                  min="5"
                  max="480"
                />
              </div>

              <div className="form-group">
                <label htmlFor="maxLoginAttempts">Maximum Login Attempts</label>
                <input
                  type="number"
                  id="maxLoginAttempts"
                  value={formData.maxLoginAttempts}
                  onChange={(e) => handleInputChange('maxLoginAttempts', parseInt(e.target.value))}
                  min="3"
                  max="10"
                />
              </div>
            </div>

            <div className="form-section">
              <h3>Password Policy</h3>
              
              <div className="form-group">
                <label htmlFor="minLength">Minimum Length</label>
                <input
                  type="number"
                  id="minLength"
                  value={formData.passwordPolicy.minLength}
                  onChange={(e) => handleNestedChange('passwordPolicy', 'minLength', parseInt(e.target.value))}
                  min="6"
                  max="20"
                />
              </div>

              <div className="checkbox-group">
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={formData.passwordPolicy.requireUppercase}
                    onChange={(e) => handleNestedChange('passwordPolicy', 'requireUppercase', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  Require Uppercase Letters
                </label>

                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={formData.passwordPolicy.requireLowercase}
                    onChange={(e) => handleNestedChange('passwordPolicy', 'requireLowercase', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  Require Lowercase Letters
                </label>

                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={formData.passwordPolicy.requireNumbers}
                    onChange={(e) => handleNestedChange('passwordPolicy', 'requireNumbers', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  Require Numbers
                </label>

                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={formData.passwordPolicy.requireSpecialChars}
                    onChange={(e) => handleNestedChange('passwordPolicy', 'requireSpecialChars', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  Require Special Characters
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="tab-content">
            <div className="form-section">
              <h3>Email Notifications</h3>
              
              <div className="checkbox-group">
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={formData.emailNotifications.newTransaction}
                    onChange={(e) => handleNestedChange('emailNotifications', 'newTransaction', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  New Transaction Alerts
                </label>

                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={formData.emailNotifications.lowBalance}
                    onChange={(e) => handleNestedChange('emailNotifications', 'lowBalance', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  Low Balance Warnings
                </label>

                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={formData.emailNotifications.securityAlert}
                    onChange={(e) => handleNestedChange('emailNotifications', 'securityAlert', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  Security Alerts
                </label>

                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={formData.emailNotifications.systemMaintenance}
                    onChange={(e) => handleNestedChange('emailNotifications', 'systemMaintenance', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  System Maintenance Notifications
                </label>
              </div>
            </div>

            <div className="form-section">
              <h3>SMS Notifications</h3>
              
              <div className="checkbox-group">
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={formData.smsNotifications.newTransaction}
                    onChange={(e) => handleNestedChange('smsNotifications', 'newTransaction', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  New Transaction Alerts
                </label>

                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={formData.smsNotifications.lowBalance}
                    onChange={(e) => handleNestedChange('smsNotifications', 'lowBalance', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  Low Balance Warnings
                </label>

                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={formData.smsNotifications.securityAlert}
                    onChange={(e) => handleNestedChange('smsNotifications', 'securityAlert', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  Security Alerts
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="tab-content">
            <div className="form-section">
              <h3>Billing Configuration</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="billingCycle">Billing Cycle</label>
                  <select
                    id="billingCycle"
                    value={formData.billingCycle}
                    onChange={(e) => handleInputChange('billingCycle', e.target.value)}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="planType">Plan Type</label>
                  <select
                    id="planType"
                    value={formData.planType}
                    onChange={(e) => handleInputChange('planType', e.target.value)}
                  >
                    <option value="basic">Basic</option>
                    <option value="standard">Standard</option>
                    <option value="premium">Premium</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* API Tab */}
        {activeTab === 'api' && (
          <div className="tab-content">
            <div className="form-section">
              <h3>API Configuration</h3>
              
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.apiEnabled}
                    onChange={(e) => handleInputChange('apiEnabled', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  Enable API Access
                </label>
              </div>

              {formData.apiEnabled && (
                <>
                  <div className="form-group">
                    <label htmlFor="apiKey">API Key</label>
                    <div className="input-with-button">
                      <input
                        type="text"
                        id="apiKey"
                        value={formData.apiKey}
                        onChange={(e) => handleInputChange('apiKey', e.target.value)}
                        placeholder="Generate API key"
                        readOnly
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={generateApiKey}
                      >
                        Generate
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="webhookUrl">Webhook URL</label>
                    <input
                      type="url"
                      id="webhookUrl"
                      value={formData.webhookUrl}
                      onChange={(e) => handleInputChange('webhookUrl', e.target.value)}
                      className={errors.webhookUrl ? 'error' : ''}
                      placeholder="https://your-domain.com/webhook"
                    />
                    {errors.webhookUrl && <span className="error-message">{errors.webhookUrl}</span>}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : (isEditing ? 'Update Settings' : 'Create Tenant')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TenantSettingsForm; 