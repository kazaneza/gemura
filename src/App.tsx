import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/auth/AuthProvider';
import { useAuthContext } from './hooks/useAuth';
import Layout from './components/Layout';
import LoginForm from './components/auth/LoginForm';
import ProtectedRoute from './components/auth/ProtectedRoute';
import UserProfile from './components/auth/UserProfile';
import Dashboard from './pages/Dashboard';
import DailyEntry from './pages/DailyEntry';
import IndirectCosts from './pages/IndirectCosts';
import DailyReport from './pages/reports/DailyReport';
import WeeklyReport from './pages/reports/WeeklyReport';
import MonthlyReport from './pages/reports/MonthlyReport';
import Hospitals from './pages/settings/Hospitals';
import Ingredients from './pages/settings/Ingredients';
import UserManagement from './pages/admin/UserManagement';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={
          <ProtectedRoute route="/">
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/daily" element={
          <ProtectedRoute route="/daily">
            <DailyEntry />
          </ProtectedRoute>
        } />
        <Route path="/indirect-costs" element={
          <ProtectedRoute route="/indirect-costs">
            <IndirectCosts />
          </ProtectedRoute>
        } />
        <Route path="/reports/daily" element={
          <ProtectedRoute route="/reports/daily">
            <DailyReport />
          </ProtectedRoute>
        } />
        <Route path="/reports/weekly" element={
          <ProtectedRoute route="/reports/weekly">
            <WeeklyReport />
          </ProtectedRoute>
        } />
        <Route path="/reports/monthly" element={
          <ProtectedRoute route="/reports/monthly">
            <MonthlyReport />
          </ProtectedRoute>
        } />
        <Route path="/settings/hospitals" element={
          <ProtectedRoute route="/settings/hospitals">
            <Hospitals />
          </ProtectedRoute>
        } />
        <Route path="/settings/ingredients" element={
          <ProtectedRoute route="/settings/ingredients">
            <Ingredients />
          </ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute route="/admin/users">
            <UserManagement />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;