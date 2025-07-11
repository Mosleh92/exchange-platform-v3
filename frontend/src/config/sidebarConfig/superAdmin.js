import DashboardIcon from '@mui/icons-material/Dashboard';
import BusinessIcon from '@mui/icons-material/Business';
import SubscriptionsIcon from '@mui/icons-material/Subscriptions';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import SettingsIcon from '@mui/icons-material/Settings';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import SecurityIcon from '@mui/icons-material/Security';
import PeopleIcon from '@mui/icons-material/People';

const superAdminSidebar = [
  { 
    label: 'نمای کلی سیستم', 
    path: '/dashboard', 
    icon: <DashboardIcon />,
    description: 'آمار کلی و وضعیت سیستم'
  },
  { 
    label: 'مدیریت صرافها', 
    path: '/tenants', 
    icon: <BusinessIcon />,
    description: 'ایجاد، ویرایش و مدیریت صرافها'
  },
  { 
    label: 'مدیریت اشتراکها', 
    path: '/subscriptions', 
    icon: <SubscriptionsIcon />,
    description: 'نظارت بر اشتراکها و تمدید'
  },
  { 
    label: 'گزارشات مالی', 
    path: '/reports', 
    icon: <AssessmentIcon />,
    description: 'گزارشات مالی کل سیستم'
  },
  { 
    label: 'مدیریت کاربران', 
    path: '/users', 
    icon: <SupervisorAccountIcon />,
    description: 'مدیریت کاربران سطح بالا'
  },
  { 
    label: 'تنظیمات سیستم', 
    path: '/settings', 
    icon: <SettingsIcon />,
    description: 'پیکربندی عمومی سیستم'
  },
  { 
    label: 'نظارت P2P', 
    path: '/p2p-monitoring', 
    icon: <SwapHorizIcon />,
    description: 'نظارت بر معاملات P2P'
  },
  { 
    label: 'گزارشات امنیتی', 
    path: '/security-logs', 
    icon: <SecurityIcon />,
    description: 'لاگها و هشدارهای امنیتی'
  },
];

export default superAdminSidebar; 