import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import NotificationBell from '../common/NotificationBell';
import './DashboardLayout.css';

/**
 * Comprehensive Dashboard Layout Component
 * Responsive design with RTL support and theme switching
 */
const DashboardLayout = ({ children, title = 'Dashboard' }) => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [theme, setTheme] = useState('light');

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth <= 768) {
        setSidebarCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <div className={`dashboard-layout ${theme} ${isMobile ? 'mobile' : ''}`}>
      {/* Sidebar */}
      <Sidebar 
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        isMobile={isMobile}
      />

      {/* Main Content Area */}
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Top Navigation */}
        <TopNavbar 
          title={title}
          onSidebarToggle={toggleSidebar}
          onThemeToggle={toggleTheme}
          theme={theme}
          user={user}
          tenant={currentTenant}
        />

        {/* Page Content */}
        <div className="page-content">
          <div className="content-wrapper">
            {children}
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobile && !sidebarCollapsed && (
        <div className="mobile-overlay" onClick={toggleSidebar} />
      )}

      {/* Notification Bell (Fixed Position) */}
      <NotificationBell />
    </div>
  );
};

export default DashboardLayout; 