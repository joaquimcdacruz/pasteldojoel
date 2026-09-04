"use client";

import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
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

const ProtectedRoute: React.FC<{ children: React.ReactNode, allowedRoles?: UserRole[] }> = ({ children, allowedRoles }) => {
  const { session, profile, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#faf9f6]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }
  
  if (!session) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" />;
  }
  
  return <Layout>{children}</Layout>;
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
          
          <Route path="/" element={
            <ProtectedRoute>
              <OrdersPage />
            </ProtectedRoute>
          } />
          
          <Route path="/orders/:id" element={
            <ProtectedRoute>
              <OrderDetailsPage />
            </ProtectedRoute>
          } />
          
          <Route path="/menu" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <MenuPage />
            </ProtectedRoute>
          } />
          
          <Route path="/cash-register" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <CashRegisterPage />
            </ProtectedRoute>
          } />

          <Route path="/customers" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <CustomersPage />
            </ProtectedRoute>
          } />
          
          <Route path="/reports" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ReportsPage />
            </ProtectedRoute>
          } />
          
          <Route path="/settings" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <SettingsPage />
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
};

export default App;