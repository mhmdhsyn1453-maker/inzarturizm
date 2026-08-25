import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import LoginScreen from './components/auth/LoginScreen';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/TopBar';
import AgentQuotationWizard from './components/agent/AgentQuotationWizard';
import SavedQuotesList from './components/agent/SavedQuotesList';
import MonthlyMatrixManager from './components/admin/MonthlyMatrixManager';
import StaffManager from './components/admin/StaffManager';
import AuditLogView from './components/admin/AuditLogView';
import AnnouncementsView from './components/common/AnnouncementsView';
import UserProfileView from './components/profile/UserProfileView';
import NotificationToast from './components/common/NotificationToast';
import AppUpdateModal from './components/common/AppUpdateModal';

export default function App() {
  const { currentUser, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('wizard');

  // If not logged in, render the luxury login screen
  if (!currentUser) {
    return <LoginScreen />;
  }

  return (
    <div className="flex min-h-screen bg-slate-100/70 text-slate-800 antialiased">
      {/* Auto-Updater Modal for Desktop App */}
      <AppUpdateModal />

      {/* Real-Time Hot Reload Notification Toast */}
      <NotificationToast />

      {/* Modern Collapsible Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main App Layout */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Topbar with Live Currency Tickers */}
        <Topbar />

        {/* Dynamic Page Content View */}
        <main className="p-6 sm:p-8 flex-1 max-w-7xl w-full mx-auto animate-fade-scale">
          {activeTab === 'wizard' && <AgentQuotationWizard setActiveTab={setActiveTab} />}
          {activeTab === 'quotes' && <SavedQuotesList onEditQuote={(quote) => setActiveTab('wizard')} />}
          {activeTab === 'announcements' && <AnnouncementsView />}
          {activeTab === 'monthly_matrix' && isAdmin && <MonthlyMatrixManager />}
          {activeTab === 'staff' && isAdmin && <StaffManager />}
          {activeTab === 'logs' && isAdmin && <AuditLogView />}
          {activeTab === 'profile' && <UserProfileView />}
        </main>
      </div>
    </div>
  );
}
