import React, { useContext } from 'react';
import { Link, useLocation, NavLink } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { 
  Home,
  Users,
  DollarSign,
  TrendingUp,
  FileText,
  Settings,
  Building,
  CreditCard,
  BarChart3,
  Calendar,
  MessageSquare,
  Shield,
  HelpCircle,
  Zap,
  Banknote,
  Cog,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { hasAccess } from '../../utils/roleAccess';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const { t } = useTranslation();

  const getMenuItems = () => {
    const baseItems = [
      {
        title: 'داشبورد',
        icon: Home,
        path: '/dashboard',
        roles: ['super_admin', 'tenant_admin', 'branch_manager', 'staff', 'customer']
      }
    ];

    if (user?.role === 'super_admin') {
      return [
        ...baseItems,
        {
          title: 'مدیریت صرافی‌ها',
          icon: Building,
          path: '/management/tenants',
          roles: ['super_admin']
        },
        {
          title: 'مدیریت پلن‌های فروش',
          icon: Banknote,
          path: '/management/sales-plans',
          roles: ['super_admin']
        },
        {
          title: 'کاربران سیستم',
          icon: Users,
          path: '/management/users',
          roles: ['super_admin']
        },
        {
          title: 'گزارشات کل',
          icon: BarChart3,
          path: '/reports',
          roles: ['super_admin']
        },
        {
          title: 'تنظیمات سیستم',
          icon: Settings,
          path: '/system-settings',
          roles: ['super_admin']
        }
      ];
    }

    if (user?.role === 'tenant_admin') {
      return [
        ...baseItems,
        {
          title: 'شعبات',
          icon: Building,
          path: '/branches',
          roles: ['tenant_admin']
        },
        {
          title: 'کارمندان',
          icon: Users,
          path: '/staff',
          roles: ['tenant_admin']
        },
        {
          title: 'مشتریان',
          icon: Users,
          path: '/customers',
          roles: ['tenant_admin', 'branch_manager', 'staff']
        },
        {
          title: 'نرخ ارز',
          icon: TrendingUp,
          path: '/exchange-rates',
          roles: ['tenant_admin', 'branch_manager']
        },
        {
          title: 'تراکنشات',
          icon: DollarSign,
          path: '/transactions',
          roles: ['tenant_admin', 'branch_manager', 'staff']
        },
        {
          title: 'حواله‌ها',
          icon: CreditCard,
          path: '/remittances',
          roles: ['tenant_admin', 'branch_manager', 'staff']
        },
        {
          title: 'گزارشات',
          icon: BarChart3,
          path: '/reports',
          roles: ['tenant_admin', 'branch_manager']
        },
        {
          title: 'تنظیمات',
          icon: Settings,
          path: '/settings',
          roles: ['tenant_admin']
        }
      ];
    }

    if (user?.role === 'branch_manager') {
      return [
        ...baseItems,
        {
          title: 'کارمندان شعبه',
          icon: Users,
          path: '/branch-staff',
          roles: ['branch_manager']
        },
        {
          title: 'مشتریان',
          icon: Users,
          path: '/customers',
          roles: ['branch_manager', 'staff']
        },
        {
          title: 'نرخ ارز',
          icon: TrendingUp,
          path: '/exchange-rates',
          roles: ['branch_manager']
        },
        {
          title: 'تراکنشات',
          icon: DollarSign,
          path: '/transactions',
          roles: ['branch_manager', 'staff']
        },
        {
          title: 'حواله‌ها',
          icon: CreditCard,
          path: '/remittances',
          roles: ['branch_manager', 'staff']
        },
        {
          title: 'گزارشات شعبه',
          icon: BarChart3,
          path: '/branch-reports',
          roles: ['branch_manager']
        }
      ];
    }

    if (user?.role === 'staff') {
      return [
        ...baseItems,
        {
          title: 'مشتریان',
          icon: Users,
          path: '/customers',
          roles: ['staff']
        },
        {
          title: 'تراکنشات',
          icon: DollarSign,
          path: '/transactions',
          roles: ['staff']
        },
        {
          title: 'حواله‌ها',
          icon: CreditCard,
          path: '/remittances',
          roles: ['staff']
        },
        {
          title: 'تقویم کاری',
          icon: Calendar,
          path: '/schedule',
          roles: ['staff']
        }
      ];
    }

    if (user?.role === 'customer') {
      return [
        ...baseItems,
        {
          title: 'تراکنشات من',
          icon: DollarSign,
          path: '/my-transactions',
          roles: ['customer']
        },
        {
          title: 'حواله‌های من',
          icon: CreditCard,
          path: '/my-remittances',
          roles: ['customer']
        },
        {
          title: 'نرخ ارز',
          icon: TrendingUp,
          path: '/rates',
          roles: ['customer']
        },
        {
          title: 'پشتیبانی',
          icon: MessageSquare,
          path: '/support',
          roles: ['customer']
        },
        {
          title: 'سیستم بانکداری مشتریان',
          icon: Banknote,
          path: '/customer-banking',
          roles: ['customer']
        }
      ];
    }

    return baseItems;
  };

  const menuItems = getMenuItems();

  const commonLinkClasses = "flex items-center px-4 py-2 text-gray-700 dark:text-gray-200 rounded-md";
  const activeLinkClasses = "bg-gray-200 dark:bg-gray-700";

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2 space-x-reverse">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                صرافی
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {menuItems.filter(item => hasAccess(user, item.roles)).map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `${commonLinkClasses} ${isActive ? activeLinkClasses : ''}`}
                  onClick={() => {
                    if (window.innerWidth < 1024) {
                      toggleSidebar();
                    }
                  }}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.title}</span>
                </NavLink>
              );
            })}

            {/* Admin Menu */}
            {(user.role === 'admin' || user.role === 'manager') && (
              <>
                <li>
                  <NavLink
                    to="/tenant-settings"
                    className={({ isActive }) => `${commonLinkClasses} ${isActive ? activeLinkClasses : ''}`}
                  >
                    <Cog className="mr-3 h-6 w-6" />
                    {t('settings.title')}
                  </NavLink>
                </li>
              </>
            )}
          </nav>

          {/* Bottom Section */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3 space-x-reverse mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  امنیت بالا
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  SSL/TLS رمزگذاری شده
                </p>
              </div>
            </div>
            
            <NavLink
              to="/help"
              className={commonLinkClasses}
            >
              <HelpCircle className="w-4 h-4" />
              <span>{t('help.title')}</span>
            </NavLink>
          </div>
        </div>
      </aside>
    </>
  );
};


export default Sidebar; 