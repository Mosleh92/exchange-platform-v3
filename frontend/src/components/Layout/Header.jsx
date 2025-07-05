import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { TenantContext } from '../../contexts/TenantContext';
import { 
  Bell, 
  Settings, 
  LogOut, 
  User, 
  Menu,
  Globe,
  Sun,
  Moon
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import Button from '../common/Button';

const Header = ({ toggleSidebar }) => {
  const { user, logout } = useContext(AuthContext);
  const { currentTenant, switchTenant } = useContext(TenantContext);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { i18n } = useTranslation();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('خروج موفقیت‌آمیز بود');
      navigate('/login');
    } catch (error) {
      toast.error('خطا در خروج');
    }
  };

  const getRoleText = (role) => {
    const roles = {
      'super_admin': 'مدیر کل',
      'tenant_admin': 'مدیر صرافی',
      'branch_manager': 'مدیر شعبه',
      'staff': 'کارمند',
      'customer': 'مشتری'
    };
    return roles[role] || role;
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  // Dark mode toggle
  const [dark, setDark] = React.useState(() =>
    typeof window !== 'undefined' ? document.documentElement.classList.contains('dark') : false
  );
  const toggleDark = () => {
    setDark((d) => {
      if (!d) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return !d;
    });
  };

  return (
    <header className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 shadow-sm border-b border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-3">
        {currentTenant?.logo && (
          <img src={currentTenant.logo} alt="logo" className="h-10 w-10 rounded-full shadow" style={{ background: currentTenant.color }} />
        )}
        <span className="text-xl font-bold" style={{ color: currentTenant?.color }}>{currentTenant?.name || 'پلتفرم صرافی'}</span>
      </div>
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          aria-label="تغییر حالت شب/روز"
          onClick={toggleDark}
        >
          {dark ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m8.66-13.66l-.71.71M4.05 19.95l-.71.71M21 12h-1M4 12H3m16.66 5.66l-.71-.71M4.05 4.05l-.71-.71M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" /></svg>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label="تغییر زبان"
          onClick={() => changeLanguage(i18n.language === 'fa' ? 'en' : 'fa')}
        >
          {i18n.language === 'fa' ? 'EN' : 'FA'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label="اعلانات"
        >
          <Bell className="w-5 h-5" />
        </Button>
        <div className="relative">
          <Button variant="ghost" size="sm">پروفایل</Button>
          <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
            <Link
              to="/profile"
              className="flex items-center space-x-2 space-x-reverse px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <User className="w-4 h-4" />
              <span>پروفایل</span>
            </Link>
            
            <Link
              to="/settings"
              className="flex items-center space-x-2 space-x-reverse px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>تنظیمات</span>
            </Link>
            
            <hr className="my-1 border-gray-200 dark:border-gray-700" />
            
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 space-x-reverse px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full text-right"
            >
              <LogOut className="w-4 h-4" />
              <span>خروج</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 