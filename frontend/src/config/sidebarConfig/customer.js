import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ReceiptIcon from '@mui/icons-material/Receipt';

const customerSidebar = [
  { label: 'داشبورد', path: '/customer/dashboard', icon: <DashboardIcon /> },
  { label: 'کیف پول', path: '/customer/wallets', icon: <AccountBalanceWalletIcon /> },
  { label: 'رسیدها', path: '/customer/receipts', icon: <ReceiptIcon /> },
];

export default customerSidebar; 