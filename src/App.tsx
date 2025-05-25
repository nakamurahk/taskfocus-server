import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Tasks from './screens/Tasks/Tasks';
import Today from './screens/today/Today';
import Settings from './screens/Settings/Settings';
import MedicationSettingsPage from './screens/Settings/MedicationSettingsPage';
import TermsPage from './screens/Settings/TermsPage';
import PrivacyPage from './screens/Settings/PrivacyPage';
import Analyze from './screens/Analyze/Analyze';
import Login from './screens/Auth/Login';
import Signup from './screens/Auth/Signup';
import EmailVerification from './screens/Auth/EmailVerification';
import { TaskProvider } from './contexts/TaskContext';
import { FocusProvider } from './contexts/FocusContext';
import { AppProvider } from './contexts/AppContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from 'react-hot-toast';
import './styles/tailwind.css';
import './styles/style.css';

type TabType = 'tasks' | 'today' | 'analyze' | 'settings';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>読み込み中...</div>;
  }

  // ログインしていない場合のみ遷移
  if (!loading && !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <TaskProvider>
      <FocusProvider>
        {children}
      </FocusProvider>
    </TaskProvider>
  );
};

const AppContent: React.FC = () => {
  const location = useLocation();
  const isAuthPage = ['/login', '/signup', '/verify-email'].includes(location.pathname);

  return (
    <div className="phone-frame">
      <div className="app-container">
        {location.pathname === '/login' && <Header />}
        <main className="main-content" style={{ backgroundColor: '#F8F8F8' }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/verify-email" element={<EmailVerification />} />
            <Route path="/" element={<Navigate to="/tasks" replace />} />
            <Route path="/tasks" element={
              <PrivateRoute>
                <div className="flex-1 overflow-y-auto">
                  <Tasks />
                </div>
              </PrivateRoute>
            } />
            <Route path="/today" element={
              <PrivateRoute>
                <div className="flex-1 overflow-y-auto">
                  <div className="w-full px-6 py-6">
                    <Today />
                  </div>
                </div>
              </PrivateRoute>
            } />
            <Route path="/analyze" element={
              <PrivateRoute>
                <div className="flex-1 overflow-y-auto">
                  <Analyze />
                </div>
              </PrivateRoute>
            } />
            <Route path="/settings" element={
              <PrivateRoute>
                <div className="flex-1 overflow-y-auto">
                  <Settings />
                </div>
              </PrivateRoute>
            } />
            <Route path="/settings/medication" element={
              <PrivateRoute>
                <div className="flex-1 overflow-y-auto">
                  <MedicationSettingsPage />
                </div>
              </PrivateRoute>
            } />
            <Route path="/settings/terms" element={
              <PrivateRoute>
                <div className="flex-1 overflow-y-auto">
                  <TermsPage />
                </div>
              </PrivateRoute>
            } />
            <Route path="/settings/privacy" element={
              <PrivateRoute>
                <div className="flex-1 overflow-y-auto">
                  <PrivacyPage />
                </div>
              </PrivateRoute>
            } />
          </Routes>
        </main>
        {!isAuthPage && <Footer activeTab={location.pathname.split('/')[1] as TabType || 'tasks'} />}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppProvider>
        <ThemeProvider>
          <Router>
            <AppContent />
            <Toaster position="top-center" />
          </Router>
        </ThemeProvider>
      </AppProvider>
    </AuthProvider>
  );
};

export default App; 