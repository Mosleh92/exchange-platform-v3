import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Globe, 
  Shield, 
  Database, 
  Bell, 
  Mail,
  Palette,
  Calendar,
  Key,
  Server,
  Save,
  RefreshCw,
  Download,
  Upload
} from 'lucide-react';
import StatCard from './StatCard';

const SystemSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({});

  // Mock settings data
  const mockSettings = {
    general: {
      systemName: 'پلتفرم صرافی ایران',
      systemDescription: 'سامانه جامع مدیریت صرافی‌ها و بانک‌ها',
      defaultCurrency: 'IRR',
      defaultLanguage: 'fa',
      timeZone: 'Asia/Tehran',
      fiscalYearStart: '1403/01/01',
      systemVersion: '3.2.1',
      maintenanceMode: false
    },
    appearance: {
      brandPrimaryColor: '#3B82F6',
      brandSecondaryColor: '#10B981',
      brandLogo: null,
      brandFavicon: null,
      darkModeEnabled: true,
      defaultTheme: 'light',
      rtlSupport: true,
      customCSS: ''
    },
    security: {
      passwordMinLength: 8,
      passwordRequireSpecialChar: true,
      passwordRequireNumber: true,
      passwordRequireUppercase: true,
      sessionTimeoutMinutes: 30,
      twoFactorRequired: false,
      maxLoginAttempts: 5,
      accountLockoutMinutes: 15,
      ipWhitelist: '',
      allowedFileTypes: 'pdf,jpg,png,xlsx,docx',
      maxFileSize: 10
    },
    notifications: {
      emailEnabled: true,
      smsEnabled: true,
      pushEnabled: false,
      systemAlerts: true,
      transactionAlerts: true,
      securityAlerts: true,
      marketingEmails: false,
      emailFrom: 'noreply@exchange-platform.ir',
      smsProvider: 'kavenegar',
      emailTemplate: 'default'
    },
    backup: {
      autoBackupEnabled: true,
      backupInterval: 'daily',
      backupRetentionDays: 30,
      backupLocation: 'local',
      backupTime: '02:00',
      lastBackup: '1402/09/28 02:00',
      backupSize: '2.5 GB',
      encryptBackups: true
    },
    api: {
      rateLimit: 1000,
      rateLimitWindow: 'hour',
      apiKeyExpiration: 90,
      webhookEnabled: true,
      webhookRetries: 3,
      apiVersion: 'v1',
      corsEnabled: true,
      allowedOrigins: '*'
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSettings(mockSettings);
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
      setLoading(false);
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('Settings saved:', settings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
    setSaving(false);
  };

  const handleInputChange = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleBackup = async () => {
    try {
      console.log('Creating backup...');
      // Simulate backup process
    } catch (error) {
      console.error('Error creating backup:', error);
    }
  };

  const tabs = [
    { id: 'general', label: 'عمومی', icon: <Settings className="w-4 h-4" /> },
    { id: 'appearance', label: 'ظاهر', icon: <Palette className="w-4 h-4" /> },
    { id: 'security', label: 'امنیت', icon: <Shield className="w-4 h-4" /> },
    { id: 'notifications', label: 'اطلاع‌رسانی', icon: <Bell className="w-4 h-4" /> },
    { id: 'backup', label: 'پشتیبان‌گیری', icon: <Database className="w-4 h-4" /> },
    { id: 'api', label: 'API', icon: <Server className="w-4 h-4" /> }
  ];

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            نام سیستم
          </label>
          <input
            type="text"
            value={settings.general?.systemName || ''}
            onChange={(e) => handleInputChange('general', 'systemName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            واحد پول پیش‌فرض
          </label>
          <select
            value={settings.general?.defaultCurrency || ''}
            onChange={(e) => handleInputChange('general', 'defaultCurrency', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="IRR">ریال ایران (IRR)</option>
            <option value="USD">دلار آمریکا (USD)</option>
            <option value="EUR">یورو (EUR)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            زبان پیش‌فرض
          </label>
          <select
            value={settings.general?.defaultLanguage || ''}
            onChange={(e) => handleInputChange('general', 'defaultLanguage', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="fa">فارسی</option>
            <option value="en">انگلیسی</option>
            <option value="ar">عربی</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            منطقه زمانی
          </label>
          <select
            value={settings.general?.timeZone || ''}
            onChange={(e) => handleInputChange('general', 'timeZone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="Asia/Tehran">تهران</option>
            <option value="Asia/Dubai">دبی</option>
            <option value="UTC">UTC</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            شروع سال مالی
          </label>
          <input
            type="text"
            value={settings.general?.fiscalYearStart || ''}
            onChange={(e) => handleInputChange('general', 'fiscalYearStart', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            placeholder="1403/01/01"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            نسخه سیستم
          </label>
          <input
            type="text"
            value={settings.general?.systemVersion || ''}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          توضیحات سیستم
        </label>
        <textarea
          value={settings.general?.systemDescription || ''}
          onChange={(e) => handleInputChange('general', 'systemDescription', e.target.value)}
          rows="3"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
      </div>
      <div className="flex items-center">
        <input
          type="checkbox"
          id="maintenanceMode"
          checked={settings.general?.maintenanceMode || false}
          onChange={(e) => handleInputChange('general', 'maintenanceMode', e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="maintenanceMode" className="mr-2 block text-sm text-gray-700 dark:text-gray-300">
          حالت تعمیر و نگهداری
        </label>
      </div>
    </div>
  );

  const renderAppearanceSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            رنگ اصلی برند
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={settings.appearance?.brandPrimaryColor || '#3B82F6'}
              onChange={(e) => handleInputChange('appearance', 'brandPrimaryColor', e.target.value)}
              className="h-10 w-20 border border-gray-300 rounded-md"
            />
            <input
              type="text"
              value={settings.appearance?.brandPrimaryColor || '#3B82F6'}
              onChange={(e) => handleInputChange('appearance', 'brandPrimaryColor', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            رنگ ثانویه برند
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={settings.appearance?.brandSecondaryColor || '#10B981'}
              onChange={(e) => handleInputChange('appearance', 'brandSecondaryColor', e.target.value)}
              className="h-10 w-20 border border-gray-300 rounded-md"
            />
            <input
              type="text"
              value={settings.appearance?.brandSecondaryColor || '#10B981'}
              onChange={(e) => handleInputChange('appearance', 'brandSecondaryColor', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            تم پیش‌فرض
          </label>
          <select
            value={settings.appearance?.defaultTheme || ''}
            onChange={(e) => handleInputChange('appearance', 'defaultTheme', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="light">روشن</option>
            <option value="dark">تاریک</option>
            <option value="auto">خودکار</option>
          </select>
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="darkModeEnabled"
            checked={settings.appearance?.darkModeEnabled || false}
            onChange={(e) => handleInputChange('appearance', 'darkModeEnabled', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="darkModeEnabled" className="mr-2 block text-sm text-gray-700 dark:text-gray-300">
            امکان تغییر تم توسط کاربران
          </label>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="rtlSupport"
            checked={settings.appearance?.rtlSupport || false}
            onChange={(e) => handleInputChange('appearance', 'rtlSupport', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="rtlSupport" className="mr-2 block text-sm text-gray-700 dark:text-gray-300">
            پشتیبانی از راست به چپ (RTL)
          </label>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          CSS سفارشی
        </label>
        <textarea
          value={settings.appearance?.customCSS || ''}
          onChange={(e) => handleInputChange('appearance', 'customCSS', e.target.value)}
          rows="6"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white font-mono text-sm"
          placeholder="/* CSS سفارشی خود را اینجا وارد کنید */"
        />
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            حداقل طول رمز عبور
          </label>
          <input
            type="number"
            value={settings.security?.passwordMinLength || 8}
            onChange={(e) => handleInputChange('security', 'passwordMinLength', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            min="6"
            max="50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            مدت زمان نشست (دقیقه)
          </label>
          <input
            type="number"
            value={settings.security?.sessionTimeoutMinutes || 30}
            onChange={(e) => handleInputChange('security', 'sessionTimeoutMinutes', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            min="5"
            max="480"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            حداکثر تلاش ورود
          </label>
          <input
            type="number"
            value={settings.security?.maxLoginAttempts || 5}
            onChange={(e) => handleInputChange('security', 'maxLoginAttempts', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            min="3"
            max="10"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            مدت قفل حساب (دقیقه)
          </label>
          <input
            type="number"
            value={settings.security?.accountLockoutMinutes || 15}
            onChange={(e) => handleInputChange('security', 'accountLockoutMinutes', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            min="5"
            max="1440"
          />
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="passwordRequireSpecialChar"
            checked={settings.security?.passwordRequireSpecialChar || false}
            onChange={(e) => handleInputChange('security', 'passwordRequireSpecialChar', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="passwordRequireSpecialChar" className="mr-2 block text-sm text-gray-700 dark:text-gray-300">
            نیاز به کاراکتر خاص در رمز عبور
          </label>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="passwordRequireNumber"
            checked={settings.security?.passwordRequireNumber || false}
            onChange={(e) => handleInputChange('security', 'passwordRequireNumber', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="passwordRequireNumber" className="mr-2 block text-sm text-gray-700 dark:text-gray-300">
            نیاز به عدد در رمز عبور
          </label>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="twoFactorRequired"
            checked={settings.security?.twoFactorRequired || false}
            onChange={(e) => handleInputChange('security', 'twoFactorRequired', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="twoFactorRequired" className="mr-2 block text-sm text-gray-700 dark:text-gray-300">
            الزامی بودن احراز هویت دو مرحله‌ای
          </label>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          لیست سفید IP ها
        </label>
        <textarea
          value={settings.security?.ipWhitelist || ''}
          onChange={(e) => handleInputChange('security', 'ipWhitelist', e.target.value)}
          rows="3"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          placeholder="192.168.1.1, 10.0.0.0/8"
        />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-600 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            تنظیمات سیستم
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            پیکربندی عمومی و تنظیمات سیستم
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-3">
          <button
            onClick={handleBackup}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Database className="w-4 h-4" />
            پشتیبان‌گیری
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="نسخه سیستم"
          value={settings.general?.systemVersion}
          icon={Server}
          color="blue"
        />
        <StatCard
          title="آخرین پشتیبان"
          value={settings.backup?.lastBackup}
          icon={Database}
          color="green"
        />
        <StatCard
          title="حجم پشتیبان"
          value={settings.backup?.backupSize}
          icon={Download}
          color="purple"
        />
        <StatCard
          title="حالت تعمیر"
          value={settings.general?.maintenanceMode ? 'فعال' : 'غیرفعال'}
          icon={Settings}
          color={settings.general?.maintenanceMode ? 'red' : 'green'}
        />
      </div>

      {/* Settings Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6" dir="ltr">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'general' && renderGeneralSettings()}
          {activeTab === 'appearance' && renderAppearanceSettings()}
          {activeTab === 'security' && renderSecuritySettings()}
          {activeTab === 'notifications' && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              تنظیمات اطلاع‌رسانی در حال توسعه است
            </div>
          )}
          {activeTab === 'backup' && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              تنظیمات پشتیبان‌گیری در حال توسعه است
            </div>
          )}
          {activeTab === 'api' && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              تنظیمات API در حال توسعه است
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;