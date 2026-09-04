import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import SplashScreen from './components/common/SplashScreen';
import LoginScreen from './components/auth/LoginScreen';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/TopBar';
import AgentQuotationWizard from './components/agent/AgentQuotationWizard';
import SavedQuotesList from './components/agent/SavedQuotesList';
import MonthlyMatrixManager from './components/admin/MonthlyMatrixManager';
import StaffManager from './components/admin/StaffManager';
import WhatsAppTemplateManager from './components/admin/WhatsAppTemplateManager';
import AuditLogView from './components/admin/AuditLogView';
import AnnouncementsView from './components/common/AnnouncementsView';
import UserProfileView from './components/profile/UserProfileView';
import NotificationToast from './components/common/NotificationToast';
import AppUpdateModal from './components/common/AppUpdateModal';

export default function App() {
  const { currentUser, isAdmin } = useAuth();
  const isHqOrAdmin = isAdmin || currentUser?.role?.toUpperCase() === 'HQ_ASSISTANT';
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('wizard');

  return (
    <>
      {/* 🚀 Brand Splash Screen on Initial App Launch */}
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      {/* If not logged in, render the luxury login screen */}
      {!currentUser ? (
        <LoginScreen />
      ) : (
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

            {/* Dynamic Page Content View (Flush with sidebar, full canvas) */}
            <main className="px-4 sm:px-6 lg:px-8 py-2 sm:py-3 flex-1 w-full min-w-0">
              <div key={activeTab} className="animate-fade-scale w-full min-w-0">
                {activeTab === 'wizard' && <AgentQuotationWizard setActiveTab={setActiveTab} />}
                {activeTab === 'quotes' && <SavedQuotesList onEditQuote={(quote) => setActiveTab('wizard')} />}
                {activeTab === 'announcements' && <AnnouncementsView />}
                {activeTab === 'monthly_matrix' && isHqOrAdmin && <MonthlyMatrixManager />}
                {activeTab === 'whatsapp_template' && isHqOrAdmin && <WhatsAppTemplateManager />}
                {activeTab === 'staff' && isAdmin && <StaffManager />}
                {activeTab === 'logs' && isAdmin && <AuditLogView />}
                {activeTab === 'profile' && <UserProfileView />}
              </div>
            </main>
          </div>
        </div>
      )}
    </>
  );
}
