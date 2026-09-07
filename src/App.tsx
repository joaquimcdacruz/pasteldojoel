"use client";

import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from '@/components/Layout';
import OrdersPage from '@/pages/OrdersPage';
import MenuPage from '@/pages/MenuPage';
import OrderDetailsPage from '@/pages/OrderDetailsPage';
import ReportsPage from '@/pages/ReportsPage';
import CashRegisterPage from '@/pages/CashRegisterPage';
import SettingsPage from '@/pages/SettingsPage';
import CustomersPage from '@/pages/CustomersPage';
import Login from '@/pages/Login';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import { UserRole } from '@/types';
import { StorageService } from '@/services/storageService';

const AuthenticatedAppLayout: React.FC = () => {
  const { session, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#faf9f6]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }
  
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

const RoleGuard: React.FC<{ children: React.ReactNode, allowedRoles: UserRole[] }> = ({ children, allowedRoles }) => {
  const { profile } = useAuth();
  if (profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  useEffect(() => {
    const unsub = StorageService.initGlobalSync();
    return () => unsub();
  }, []);

  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<AuthenticatedAppLayout />}>
            <Route path="/" element={<OrdersPage />} />
            <Route path="/orders/:id" element={<OrderDetailsPage />} />
            <Route path="/menu" element={<RoleGuard allowedRoles={['admin']}><MenuPage /></RoleGuard>} />
            <Route path="/cash-register" element={<RoleGuard allowedRoles={['admin']}><CashRegisterPage /></RoleGuard>} />
            <Route path="/customers" element={<RoleGuard allowedRoles={['admin']}><CustomersPage /></RoleGuard>} />
            <Route path="/reports" element={<RoleGuard allowedRoles={['admin']}><ReportsPage /></RoleGuard>} />
            <Route path="/settings" element={<RoleGuard allowedRoles={['admin']}><SettingsPage /></RoleGuard>} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
};

export default App;