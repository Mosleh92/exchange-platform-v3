import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { SocketProvider } from '../contexts/SocketContext';
import Layout from '../components/Layout/Layout';
import AuthLayout from '../components/Layout/AuthLayout';
import Login from '../pages/Auth/Login';
import Dashboard from '../pages/Dashboard/Dashboard';

// A simple loading spinner component to show while checking auth state
const Loading = () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 text-gray-800 font-vazir">
        <div className="text-2xl">در حال بارگذاری پلتفرم...</div>
    </div>
);

// Protects routes that require authentication
const ProtectedRoute = ({ children }) => {
  const auth = useAuth();
  if (auth.loading) {
    return <Loading />;
  }
  return auth.isAuthenticated ? children : <Navigate to="/login" replace />;
};

// For public routes like login, register, etc.
const PublicRoute = ({ children }) => {
  const auth = useAuth();
  if (auth.loading) {
    return <Loading />;
  }
  return !auth.isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

// Component defining all the application routes
function AppRoutes() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800 font-vazir" dir="rtl">
      <Routes>
        {/* Public routes (Login, Register, etc.) */}
        <Route element={<PublicRoute><AuthLayout /></PublicRoute>}>
          <Route path="/login" element={<Login />} />
          {/* You can add register, forgot-password routes here later */}
        </Route>

        {/* Protected routes (Dashboard and main app) */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          {/* All other protected routes will go here */}
        </Route>
        
        {/* Fallback route to redirect users */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

// Main App component that wraps everything with providers
function App() {
  return (
    <React.StrictMode>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <SocketProvider>
              <AppRoutes />
            </SocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
}

export default App;