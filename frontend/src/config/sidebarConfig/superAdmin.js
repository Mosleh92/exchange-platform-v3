import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';

const superAdminSidebar = [
  { label: 'داشبورد', path: '/dashboard', icon: <DashboardIcon /> },
  { label: 'مدیریت کاربران', path: '/users', icon: <PeopleIcon /> },
  { label: 'تنظیمات', path: '/settings', icon: <SettingsIcon /> },
];

export default superAdminSidebar; 