import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
// import { t } from '../utils/i18n';
import api from '../services/api';

const t = (key, fallback) => fallback || key; // Mock t function

const TenantSettings = () => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(null);
  const [activeTab, setActiveTab] = useState('branding');
  const [formData, setFormData] = useState({
    branding: {
      colors: {
        primary: '#3B82F6',
        secondary: '#1F2937',
        accent: '#10B981'
      },
      fonts: {
        primary: 'Vazir',
        secondary: 'IRANSans'
      }
    },
    contact: {
      address: {
        street: '',
        city: '',
        state: '',
        country: '',
        postalCode: ''
      },
      phone: {
        primary: '',
        secondary: '',
        whatsapp: ''
      },
      email: {
        primary: '',
        support: '',
        info: ''
      },
      social: {
        website: '',
        instagram: '',
        telegram: '',
        twitter: ''
      }
    },
    receipt: {
      delivery: {
        email: {
          enabled: true,
          smtp: {
            host: '',
            port: 587,
            secure: false,
            username: '',
            password: ''
          },
          fromName: '',
          fromEmail: '',
          subject: 'رسید تراکنش'
        },
        sms: {
          enabled: true,
          provider: 'kavenegar',
          apiKey: '',
          apiSecret: '',
          fromNumber: '',
          template: ''
        },
        whatsapp: {
          enabled: true,
          provider: 'twilio',
          apiKey: '',
          apiSecret: '',
          phoneNumber: '',
          template: ''
        }
      },
      content: {
        header: '',
        footer: '',
        terms: '',
        disclaimer: '',
        signature: ''
      }
    },
    exchangeRates: {
      source: 'manual',
      manual: {
        enabled: true,
        updateBy: 'admin',
        approvalRequired: true
      },
      api: {
        provider: '',
        url: '',
        apiKey: '',
        updateInterval: 3600
      }
    },
    accounting: {
      fiscalYear: {
        startMonth: 1,
        startDay: 1
      },
      baseCurrency: 'IRR',
      tax: {
        enabled: false,
        rate: 0,
        number: ''
      },
      autoNumbering: {
        enabled: true,
        prefix: '',
        suffix: '',
        startNumber: 1,
        padding: 6
      }
    },
    security: {
      twoFactor: {
        enabled: true,
        methods: ['sms', 'email']
      },
      login: {
        maxAttempts: 5,
        lockoutDuration: 30,
        sessionTimeout: 480
      },
      encryption: {
        enabled: true,
        algorithm: 'AES-256'
      }
    },
    notifications: {
      email: {
        enabled: true,
        types: ['transaction', 'transfer', 'alert', 'report']
      },
      sms: {
        enabled: true,
        types: ['transaction', 'transfer', 'alert']
      },
      push: {
        enabled: false,
        types: ['transaction', 'transfer', 'alert']
      }
    }
  });

  const [logoFile, setLogoFile] = useState(null);
  const [faviconFile, setFaviconFile] = useState(null);
  const [migrationStatus, setMigrationStatus] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get('/tenant-settings');
      setSettings(response.data.data);
      
      // بروزرسانی فرم با داده‌های موجود
      if (response.data.data) {
        setFormData(prev => ({
          ...prev,
          ...response.data.data
        }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleNestedInputChange = (section, subsection, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: {
          ...prev[section][subsection],
          [field]: value
        }
      }
    }));
  };

  const handleDeepNestedInputChange = (section, subsection, subsubsection, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: {
          ...prev[section][subsection],
          [subsubsection]: {
            ...prev[section][subsection][subsubsection],
            [field]: value
          }
        }
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.put('/tenant-settings', formData);
      
      alert('Settings Updated');
      setSettings(response.data.data);
    } catch (error) {
      console.error('Error updating settings:', error);
      alert('Update Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;

    const formData = new FormData();
    formData.append('logo', logoFile);

    try {
      const response = await api.post('/tenant-settings/logo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      alert('Logo Uploaded');
      setLogoFile(null);
      loadSettings();
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Upload Failed');
    }
  };

  const handleFaviconUpload = async () => {
    if (!faviconFile) return;

    const formData = new FormData();
    formData.append('favicon', faviconFile);

    try {
      const response = await api.post('/tenant-settings/favicon', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      alert('Favicon Uploaded');
      setFaviconFile(null);
      loadSettings();
    } catch (error) {
      console.error('Error uploading favicon:', error);
      alert('Upload Failed');
    }
  };

  const testDeliverySettings = async (channel) => {
    const testData = {
      email: 'test@example.com',
      phone: '+989123456789'
    };

    try {
      await api.post('/tenant-settings/test-delivery', {
        channel,
        testData
      });
      
      alert('Test Successful');
    } catch (error) {
      console.error('Error testing delivery:', error);
      alert('Test Failed: ' + error.response.data.message);
    }
  };

  const startMigration = async () => {
    const migrationData = {
      sourceSystem: 'legacy_system',
      connectionDetails: {
        host: 'localhost',
        port: 3306,
        username: 'user',
        password: 'pass',
        database: 'legacy_db'
      }
    };

    try {
      const response = await api.post('/tenant-settings/migration/start', migrationData);
      setMigrationStatus(response.data.data);
      alert('Migration Started');
    } catch (error) {
      console.error('Error starting migration:', error);
      alert('Migration Failed');
    }
  };

  const getMigrationStatus = async () => {
    try {
      const response = await api.get('/tenant-settings/migration/status');
      setMigrationStatus(response.data.data);
    } catch (error) {
      console.error('Error getting migration status:', error);
    }
  };

  if (!settings) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('settings.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {t('settings.title')}
        </h2>
        <p className="text-gray-600 mt-2">
          {t('settings.description')}
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" role="tablist" aria-label="تنظیمات">
            {[
              { id: 'branding', label: t('settings.branding') },
              { id: 'contact', label: t('settings.contact') },
              { id: 'receipt', label: t('settings.receipt') },
              { id: 'exchangeRates', label: t('settings.exchangeRates') },
              { id: 'accounting', label: t('settings.accounting') },
              { id: 'security', label: t('settings.security') },
              { id: 'notifications', label: t('settings.notifications') },
              { id: 'migration', label: t('settings.migration') }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-700 text-blue-900'
                    : 'border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-400'
                }`}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`tabpanel-${tab.id}`}
                id={`tab-${tab.id}`}
                tabIndex={activeTab === tab.id ? 0 : -1}
                aria-label={tab.label}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit}>
            {/* Branding Tab */}
            {activeTab === 'branding' && (
              <div className="space-y-6" id="tabpanel-branding" role="tabpanel" aria-labelledby="tab-branding">
                <h3 className="text-lg font-semibold">{t('settings.branding')}</h3>
                
                {/* Logo Upload */}
                <div>
                  <label htmlFor="logo-upload" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('settings.logo')}
                  </label>
                  <div className="flex items-center space-x-4">
                    {settings.branding?.logo?.path && (
                      <img
                        src={`/uploads/${settings.branding.logo.fileName}`}
                        alt="لوگوی فعلی سازمان"
                        className="w-20 h-20 object-contain border rounded"
                      />
                    )}
                    <div>
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setLogoFile(e.target.files[0])}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        aria-label="انتخاب لوگو"
                      />
                      <button
                        type="button"
                        onClick={handleLogoUpload}
                        disabled={!logoFile}
                        className="mt-2 px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800 disabled:opacity-50"
                        aria-label="آپلود لوگو"
                      >
                        {t('settings.uploadLogo')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Favicon Upload */}
                <div>
                  <label htmlFor="favicon-upload" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('settings.favicon')}
                  </label>
                  <div className="flex items-center space-x-4">
                    {settings.branding?.favicon?.path && (
                      <img
                        src={`/uploads/${settings.branding.favicon.fileName}`}
                        alt="فاوآیکون فعلی سازمان"
                        className="w-16 h-16 object-contain border rounded"
                      />
                    )}
                    <div>
                      <input
                        id="favicon-upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setFaviconFile(e.target.files[0])}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        aria-label="انتخاب فاوآیکون"
                      />
                      <button
                        type="button"
                        onClick={handleFaviconUpload}
                        disabled={!faviconFile}
                        className="mt-2 px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800 disabled:opacity-50"
                        aria-label="آپلود فاوآیکون"
                      >
                        {t('settings.uploadFavicon')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Colors */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('settings.primaryColor')}
                    </label>
                    <input
                      type="color"
                      value={formData.branding.colors.primary}
                      onChange={(e) => handleDeepNestedInputChange('branding', 'colors', 'primary', e.target.value)}
                      className="w-full h-10 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('settings.secondaryColor')}
                    </label>
                    <input
                      type="color"
                      value={formData.branding.colors.secondary}
                      onChange={(e) => handleDeepNestedInputChange('branding', 'colors', 'secondary', e.target.value)}
                      className="w-full h-10 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('settings.accentColor')}
                    </label>
                    <input
                      type="color"
                      value={formData.branding.colors.accent}
                      onChange={(e) => handleDeepNestedInputChange('branding', 'colors', 'accent', e.target.value)}
                      className="w-full h-10 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Contact Tab */}
            {activeTab === 'contact' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">{t('settings.contact')}</h3>
                
                {/* Address */}
                <div>
                  <h4 className="text-md font-medium mb-3">{t('settings.address')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder={t('settings.street')}
                      value={formData.contact.address.street}
                      onChange={(e) => handleDeepNestedInputChange('contact', 'address', 'street', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder={t('settings.city')}
                      value={formData.contact.address.city}
                      onChange={(e) => handleDeepNestedInputChange('contact', 'address', 'city', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder={t('settings.state')}
                      value={formData.contact.address.state}
                      onChange={(e) => handleDeepNestedInputChange('contact', 'address', 'state', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder={t('settings.country')}
                      value={formData.contact.address.country}
                      onChange={(e) => handleDeepNestedInputChange('contact', 'address', 'country', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <h4 className="text-md font-medium mb-3">{t('settings.phone')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      type="tel"
                      placeholder={t('settings.primaryPhone')}
                      value={formData.contact.phone.primary}
                      onChange={(e) => handleDeepNestedInputChange('contact', 'phone', 'primary', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="tel"
                      placeholder={t('settings.secondaryPhone')}
                      value={formData.contact.phone.secondary}
                      onChange={(e) => handleDeepNestedInputChange('contact', 'phone', 'secondary', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="tel"
                      placeholder={t('settings.whatsapp')}
                      value={formData.contact.phone.whatsapp}
                      onChange={(e) => handleDeepNestedInputChange('contact', 'phone', 'whatsapp', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <h4 className="text-md font-medium mb-3">{t('settings.email')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      type="email"
                      placeholder={t('settings.primaryEmail')}
                      value={formData.contact.email.primary}
                      onChange={(e) => handleDeepNestedInputChange('contact', 'email', 'primary', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="email"
                      placeholder={t('settings.supportEmail')}
                      value={formData.contact.email.support}
                      onChange={(e) => handleDeepNestedInputChange('contact', 'email', 'support', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="email"
                      placeholder={t('settings.infoEmail')}
                      value={formData.contact.email.info}
                      onChange={(e) => handleDeepNestedInputChange('contact', 'email', 'info', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Receipt Tab */}
            {activeTab === 'receipt' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">{t('settings.receipt')}</h3>
                
                {/* Email Settings */}
                <div>
                  <h4 className="text-md font-medium mb-3">{t('settings.emailDelivery')}</h4>
                  <div className="space-y-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.receipt.delivery.email.enabled}
                        onChange={(e) => handleDeepNestedInputChange('receipt', 'delivery', 'email', 'enabled', e.target.checked)}
                        className="mr-2"
                      />
                      {t('settings.enableEmail')}
                    </label>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder={t('settings.smtpHost')}
                        value={formData.receipt.delivery.email.smtp.host}
                        onChange={(e) => handleDeepNestedInputChange('receipt', 'delivery', 'email', 'smtp', { ...formData.receipt.delivery.email.smtp, host: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        placeholder={t('settings.smtpPort')}
                        value={formData.receipt.delivery.email.smtp.port}
                        onChange={(e) => handleDeepNestedInputChange('receipt', 'delivery', 'email', 'smtp', { ...formData.receipt.delivery.email.smtp, port: parseInt(e.target.value) })}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder={t('settings.smtpUsername')}
                        value={formData.receipt.delivery.email.smtp.username}
                        onChange={(e) => handleDeepNestedInputChange('receipt', 'delivery', 'email', 'smtp', { ...formData.receipt.delivery.email.smtp, username: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="password"
                        placeholder={t('settings.smtpPassword')}
                        value={formData.receipt.delivery.email.smtp.password}
                        onChange={(e) => handleDeepNestedInputChange('receipt', 'delivery', 'email', 'smtp', { ...formData.receipt.delivery.email.smtp, password: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => testDeliverySettings('email')}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      {t('settings.testEmail')}
                    </button>
                  </div>
                </div>

                {/* SMS Settings */}
                <div>
                  <h4 className="text-md font-medium mb-3">{t('settings.smsDelivery')}</h4>
                  <div className="space-y-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.receipt.delivery.sms.enabled}
                        onChange={(e) => handleDeepNestedInputChange('receipt', 'delivery', 'sms', 'enabled', e.target.checked)}
                        className="mr-2"
                      />
                      {t('settings.enableSMS')}
                    </label>
                    
                    <select
                      value={formData.receipt.delivery.sms.provider}
                      onChange={(e) => handleDeepNestedInputChange('receipt', 'delivery', 'sms', 'provider', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="kavenegar">Kavenegar</option>
                      <option value="melipayamak">Melipayamak</option>
                      <option value="ghasedak">Ghasedak</option>
                    </select>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder={t('settings.apiKey')}
                        value={formData.receipt.delivery.sms.apiKey}
                        onChange={(e) => handleDeepNestedInputChange('receipt', 'delivery', 'sms', 'apiKey', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder={t('settings.fromNumber')}
                        value={formData.receipt.delivery.sms.fromNumber}
                        onChange={(e) => handleDeepNestedInputChange('receipt', 'delivery', 'sms', 'fromNumber', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => testDeliverySettings('sms')}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      {t('settings.testSMS')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Exchange Rates Tab */}
            {activeTab === 'exchangeRates' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">{t('settings.exchangeRates')}</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('settings.rateSource')}
                  </label>
                  <select
                    value={formData.exchangeRates.source}
                    onChange={(e) => handleNestedInputChange('exchangeRates', 'source', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="manual">{t('settings.manual')}</option>
                    <option value="api">{t('settings.api')}</option>
                    <option value="mixed">{t('settings.mixed')}</option>
                  </select>
                </div>

                {formData.exchangeRates.source === 'manual' && (
                  <div className="space-y-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.exchangeRates.manual.enabled}
                        onChange={(e) => handleDeepNestedInputChange('exchangeRates', 'manual', 'enabled', e.target.checked)}
                        className="mr-2"
                      />
                      {t('settings.enableManualRates')}
                    </label>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('settings.updateBy')}
                      </label>
                      <select
                        value={formData.exchangeRates.manual.updateBy}
                        onChange={(e) => handleDeepNestedInputChange('exchangeRates', 'manual', 'updateBy', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="admin">{t('settings.admin')}</option>
                        <option value="manager">{t('settings.manager')}</option>
                        <option value="staff">{t('settings.staff')}</option>
                      </select>
                    </div>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.exchangeRates.manual.approvalRequired}
                        onChange={(e) => handleDeepNestedInputChange('exchangeRates', 'manual', 'approvalRequired', e.target.checked)}
                        className="mr-2"
                      />
                      {t('settings.approvalRequired')}
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Migration Tab */}
            {activeTab === 'migration' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">{t('settings.migration')}</h3>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <h4 className="text-yellow-800 font-medium">{t('settings.migrationWarning')}</h4>
                  <p className="text-yellow-700 mt-2">{t('settings.migrationDescription')}</p>
                </div>
                
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={startMigration}
                    className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {t('settings.startMigration')}
                  </button>
                  
                  <button
                    type="button"
                    onClick={getMigrationStatus}
                    className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    {t('settings.checkMigrationStatus')}
                  </button>
                </div>
                
                {migrationStatus && (
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                    <h4 className="font-medium mb-2">{t('settings.migrationStatus')}</h4>
                    <div className="space-y-2">
                      <p><span className="font-medium">{t('settings.status')}:</span> {migrationStatus.status}</p>
                      {migrationStatus.progress && (
                        <>
                          <p><span className="font-medium">{t('settings.totalRecords')}:</span> {migrationStatus.progress.totalRecords}</p>
                          <p><span className="font-medium">{t('settings.processedRecords')}:</span> {migrationStatus.progress.processedRecords}</p>
                          <p><span className="font-medium">{t('settings.failedRecords')}:</span> {migrationStatus.progress.failedRecords}</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <div className="mt-8 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('settings.saving') : t('settings.save')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TenantSettings; 