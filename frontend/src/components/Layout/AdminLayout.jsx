import React from 'react';
import Box from '@mui/material/Box';
import Sidebar from './Sidebar';
import Header from './Header';
import superAdminSidebar from '../../config/sidebarConfig/superAdmin';

const AdminLayout = ({ children }) => {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar config={superAdminSidebar} />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Header />
        <Box component="main" sx={{ flex: 1, p: 3 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default AdminLayout; 