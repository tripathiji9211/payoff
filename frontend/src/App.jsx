import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WalletProvider } from './context/WalletContext';
import { DemoProvider, useDemo } from './context/DemoContext';
import { SecurityProvider, useSecurity } from './context/SecurityContext';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import SendPayment from './pages/SendPayment';
import ReceivePayment from './pages/ReceivePayment';
import PendingTransactions from './pages/PendingTransactions';
import SyncEngine from './pages/SyncEngine';
import AuthScreen from './pages/AuthScreen';
import SplitDemo from './pages/SplitDemo';
import SecuritySettings from './pages/SecuritySettings';
import MerchantQR from './pages/MerchantQR';
import BillGenerator from './pages/BillGenerator';
import MerchantAnalytics from './pages/MerchantAnalytics';
import SettlementHistory from './pages/SettlementHistory';
import LockScreen from './components/LockScreen';
import ParticleBackground from './components/ParticleBackground';
import { STORES, getAllData, getData } from './services/db';
import toast from 'react-hot-toast';

import { DashboardSkeleton } from './components/Skeletons';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return (
    <div className="min-h-screen bg-[#050b18] p-6">
      <DashboardSkeleton />
    </div>
  );
  
  if (!user) return <Navigate to="/auth" />;
  
  return children;
};

const GlobalSyncHandler = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
      const handleOnline = () => {
          if (window.MOCK_OFFLINE) return;
          toast('Back online! Syncing pending transactions...', { icon: '🌐' });
          navigate('/sync');
      };
      const handleMockOnline = () => {
          if (!window.MOCK_OFFLINE) {
              toast('Back online! Syncing pending transactions...', { icon: '🌐' });
              navigate('/sync');
          }
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('mock-online-change', handleMockOnline);
      return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('mock-online-change', handleMockOnline);
      }
  }, [navigate]);

  return null;
};

const AppContent = () => {
  const { isLocked } = useSecurity();
  const { user } = useAuth();
  const { isDemoActive } = useDemo();

  useEffect(() => {
    const runTamperCheck = async () => {
        if (!user || isDemoActive) return;
        try {
            const txns = await getAllData(STORES.HISTORY) || [];
            const balanceData = await getData(STORES.WALLET, 'balance');
            const currentBalance = balanceData?.value || 0;
            
            // Basic check: 10000 (starting) + receives - sends = current
            let calculated = 10000;
            txns.filter(t => t.status === 'COMPLETED').forEach(t => {
                if (t.type === 'SEND') calculated -= t.amount;
                else calculated += t.amount;
            });

            if (Math.abs(calculated - currentBalance) > 0.01) {
                console.error('Tamper detected: Balance mismatch');
                toast.error('Security Alert: Data Inconsistency Detected', { duration: 6000 });
            }
        } catch (e) {
            console.error('Security module error', e);
        }
    };
    runTamperCheck();
  }, [user, isDemoActive]);

  return (
    <>
      <ParticleBackground />
      <GlobalSyncHandler />
      {isLocked && <LockScreen />}
      <Routes>
        <Route path="/split-demo" element={<SplitDemo />} />
        <Route path="/auth" element={<AuthScreen />} />
        
        <Route path="*" element={
          <Layout>
            <Routes>
              <Route path="/" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/send" element={
                <ProtectedRoute>
                  <SendPayment />
                </ProtectedRoute>
              } />
              
              <Route path="/receive" element={
                <ProtectedRoute>
                  <ReceivePayment />
                </ProtectedRoute>
              } />
              
              <Route path="/pending" element={
                <ProtectedRoute>
                  <PendingTransactions />
                </ProtectedRoute>
              } />
              
              <Route path="/sync" element={
                <ProtectedRoute>
                  <SyncEngine />
                </ProtectedRoute>
              } />

              <Route path="/security" element={
                <ProtectedRoute>
                  <SecuritySettings />
                </ProtectedRoute>
              } />

              <Route path="/merchant-qr" element={
                <ProtectedRoute>
                  <MerchantQR />
                </ProtectedRoute>
              } />

              <Route path="/bill-gen" element={
                <ProtectedRoute>
                  <BillGenerator />
                </ProtectedRoute>
              } />

              <Route path="/analytics" element={
                <ProtectedRoute>
                  <MerchantAnalytics />
                </ProtectedRoute>
              } />

              <Route path="/settlement-history" element={
                <ProtectedRoute>
                  <SettlementHistory />
                </ProtectedRoute>
              } />

              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <SecurityProvider>
          <WalletProvider>
            <DemoProvider>
              <Toaster position="top-center" reverseOrder={false} />
              <AppContent />
            </DemoProvider>
          </WalletProvider>
        </SecurityProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
