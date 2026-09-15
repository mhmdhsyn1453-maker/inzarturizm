// Inzar Turizm - Modern Responsive Sidebar
import React, { useState } from 'react';
import pkg from '../../../package.json';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useModal } from '../../context/ModalContext';
import inzarLogo from '../../assets/inzarturizmlogo.png';
import { 
  Calculator, 
  Calendar,
  CalendarDays, 
  Users, 
  User,
  ShieldCheck,
  History, 
  FileText, 
  LogOut, 
  ChevronLeft, 
  ChevronRight, 
  Megaphone, 
  Database,
  UserCheck,
  MessageSquare
} from 'lucide-react';

const WhatsAppIcon = ({ className = 'h-4 w-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm5.77 14.15c-.24.68-1.2 1.25-1.66 1.3-.43.05-.98.24-3.13-.65-2.26-.94-3.7-3.23-3.81-3.38-.11-.15-.91-1.21-.91-2.31 0-1.1.58-1.64.78-1.87.2-.23.44-.29.58-.29.15 0 .3 0 .42.01.13.01.3.05.47.45.17.41.6 1.46.65 1.57.05.11.08.24.02.38-.06.14-.09.23-.18.34-.09.11-.19.25-.27.33-.1.1-.2.21-.09.4.11.19.49.81 1.05 1.31.73.65 1.34.85 1.53.94.19.09.3.08.41-.05.11-.13.48-.56.61-.75.13-.19.26-.16.44-.09.18.07 1.15.54 1.35.64.2.1.33.15.38.23.05.08.05.48-.19 1.16z" />
  </svg>
);

export default function Sidebar({ activeTab, setActiveTab }) {
  const { currentUser, isAdmin, logout } = useAuth();
  const { 
    unreadAnnouncementsCount, 
    markAnnouncementsAsRead, 
    savedQuotes, 
    newQuotesCount = 0, 
    markQuotesAsSeen 
  } = useData();
  const { showLogoutConfirm } = useModal();
  const [collapsed, setCollapsed] = useState(false);

  const isHqAssistant = currentUser?.role?.toUpperCase() === 'HQ_ASSISTANT';
  const isHqOrAdmin = isAdmin || isHqAssistant;

  // Genel Merkez ve Genel Merkez Yardımcısı için Merkez Onayı Bekleyen Teklif Sayısı
  const pendingHqCount = (isHqOrAdmin && Array.isArray(savedQuotes)) 
    ? savedQuotes.filter(q => q.status === 'customer_approved').length 
    : 0;

  const handleLogoutClick = async () => {
    const confirmed = await showLogoutConfirm(currentUser?.name || 'Kullanıcı');
    if (confirmed) {
      logout();
    }
  };

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'announcements') {
      markAnnouncementsAsRead();
    }
    if (tabId === 'quotes' && markQuotesAsSeen) {
      markQuotesAsSeen();
    }
  };

  const menuItems = [
    {
      id: 'wizard',
      label: 'Teklif Oluştur',
      icon: Calculator,
      desc: 'Anlık Umre Fiyatı Hesapla',
      adminOnly: false
    },
    {
      id: 'quotes',
      label: 'Verilen Teklifler',
      icon: FileText,
      desc: isHqOrAdmin ? 'Merkez Onayı & Teklifler' : 'Geçmiş Teklif Listesi',
      badgeCount: newQuotesCount,
      badgeColor: 'bg-emerald-600',
      badgeText: newQuotesCount === 1 ? '1 Yeni' : `${newQuotesCount} Yeni`,
      adminOnly: false
    },
    {
      id: 'monthly_matrix',
      label: 'Veri Giriş Merkezi',
      icon: Database,
      desc: '12 Ay Otel, Kar & Maliyetler',
      adminOnly: true
    },
    {
      id: 'announcements',
      label: 'Merkez Duyuruları',
      icon: Megaphone,
      desc: 'Kurumsal Bilgilendirmeler',
      badgeCount: unreadAnnouncementsCount,
      badgeColor: 'bg-rose-600',
      badgeText: 'Yeni',
      adminOnly: false
    },
    {
      id: 'whatsapp_template',
      label: 'WhatsApp Şablonu',
      icon: WhatsAppIcon,
      desc: 'Otonom Mesaj & Metin Ayarı',
      hqOnly: true
    },
    {
      id: 'staff',
      label: 'Personel Yönetimi',
      icon: Users,
      desc: 'Personel Ekle & Yetkiler',
      adminOnly: true
    },
    {
      id: 'logs',
      label: 'Denetim Günlüğü',
      icon: History,
      desc: 'Sistem Hareket Kayıtları',
      adminOnly: true
    }
  ];

  return (
    <aside 
      className={`sidebar-gpu sticky top-0 h-screen bg-white/95 dark:bg-slate-900/95 border-r border-slate-200/90 dark:border-slate-800 z-30 select-none overflow-hidden ${
        collapsed ? 'w-[70px]' : 'w-60'
      }`}
    >
      {/* Fixed-Width Inner Container (Eliminates all layout reflows for 120 FPS performance) */}
      <div className="w-60 h-full flex flex-col justify-between">
        
        {/* Top Header / Logo Section */}
        <div>
          <div className="px-3 py-3 border-b border-slate-100/90 dark:border-slate-800 flex items-center justify-between">
            {/* Logo Container */}
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div 
                onClick={() => setCollapsed(!collapsed)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 p-1.5 shadow-sm border border-slate-200/90 dark:border-slate-700 transform hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer"
                title={collapsed ? 'Genişletmek için tıklayın' : undefined}
              >
                <img
                  src={inzarLogo}
                  alt="İnzar Turizm"
                  className="h-full w-full object-contain pointer-events-none"
                />
              </div>
              
              <div 
                className={`sidebar-text-gpu whitespace-nowrap overflow-hidden ${
                  collapsed ? 'opacity-0 -translate-x-3 pointer-events-none' : 'opacity-100 translate-x-0'
                }`}
              >
                <h1 className="text-base font-black font-display tracking-tight text-slate-900 dark:text-white leading-none">
                  İNZAR <span className="emerald-gradient-text">TURİZM</span>
                </h1>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider mt-1 flex items-center gap-1">
                  <span>UTH&TP</span>
                  <span className="text-[8.5px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/70 px-1 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                    v{pkg?.version || '1.0.26'}
                  </span>
                </p>
              </div>
            </div>

            {/* Collapse / Expand Toggle Button */}
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="flex items-center justify-center h-8 w-8 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition-all duration-200 cursor-pointer shrink-0"
              title={collapsed ? 'Genişlet' : 'Daralt'}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="px-2.5 py-2 space-y-1 overflow-y-auto max-h-[calc(100vh-170px)]">
            {menuItems.map(item => {
              if (item.adminOnly && !isAdmin) return null;
              if (item.hqOnly && !isHqOrAdmin) return null;
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabClick(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`sidebar-item-fluid relative w-full flex items-center rounded-2xl p-2 text-left font-medium group cursor-pointer overflow-hidden ${
                    isActive
                      ? 'bg-emerald-50/90 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-100 font-bold border border-emerald-300/80 dark:border-emerald-600/50 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100 border border-transparent'
                  }`}
                >
                  {/* Active Indicator Left Bar */}
                  {isActive && (
                    <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-emerald-600 dark:bg-emerald-500" />
                  )}

                  <div className={`relative flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
                    isActive 
                      ? 'bg-gradient-to-tr from-emerald-600 to-emerald-500 text-white shadow-md shadow-emerald-700/30 scale-105' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200/80 dark:group-hover:bg-slate-700 group-hover:text-slate-800 dark:group-hover:text-slate-200 group-hover:scale-105'
                  }`}>
                    <Icon className="h-4 w-4" />
                    {item.badgeCount > 0 && collapsed && (
                      <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-white font-black text-[9px] ring-2 ring-white dark:ring-slate-900 animate-pulse shadow-sm">
                        {item.badgeCount}
                      </span>
                    )}
                  </div>

                  <div 
                    className={`sidebar-text-gpu whitespace-nowrap overflow-hidden flex-1 ml-2.5 ${
                      collapsed ? 'opacity-0 -translate-x-3 pointer-events-none' : 'opacity-100 translate-x-0'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold truncate">{item.label}</span>
                      {item.badgeCount > 0 && (
                        <span className={`text-[10px] font-black ${item.badgeColor || 'bg-rose-600'} text-white px-2 py-0.5 rounded-full shadow-2xs animate-pulse`}>
                          {item.badgeCount} {item.badgeText || 'Yeni'}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate font-normal">
                      {item.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Date & Profile & Logout Box */}
        <div className="p-2.5 border-t border-slate-100/90 dark:border-slate-800 space-y-1.5">
          {/* Subtle Date */}
          <div className={`px-2 py-0.5 text-[11px] text-slate-400 dark:text-slate-500 font-medium sidebar-text-gpu whitespace-nowrap overflow-hidden flex items-center gap-1.5 ${
            collapsed ? 'opacity-0 -translate-x-3 pointer-events-none h-0' : 'opacity-100 translate-x-0'
          }`}>
            <Calendar className="h-3 w-3 text-slate-400 dark:text-slate-500 shrink-0" />
            <span>{new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            title="Profilimi Görüntüle"
            className="sidebar-item-fluid w-full flex items-center rounded-2xl bg-slate-50/90 dark:bg-slate-800/80 hover:bg-emerald-50/80 dark:hover:bg-slate-800 p-2 border border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-300 dark:hover:border-emerald-600 shadow-2xs transition-all duration-200 cursor-pointer text-left overflow-hidden"
          >
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-xs shadow-xs overflow-hidden ${
              isAdmin
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                : isHqAssistant
                ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700'
                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
            }`}>
              {currentUser?.avatarImage ? (
                <img src={currentUser.avatarImage} alt="Profil" className="h-full w-full object-cover pointer-events-none" />
              ) : isAdmin ? (
                <ShieldCheck className="h-5 w-5 text-amber-700 dark:text-amber-400" />
              ) : isHqAssistant ? (
                <ShieldCheck className="h-5 w-5 text-indigo-700 dark:text-indigo-400" />
              ) : (
                <User className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
              )}
            </div>

            <div 
              className={`sidebar-text-gpu whitespace-nowrap overflow-hidden flex-1 ml-3 ${
                collapsed ? 'opacity-0 -translate-x-3 pointer-events-none' : 'opacity-100 translate-x-0'
              }`}
            >
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {currentUser?.name}
              </div>
              <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 truncate">
                {isAdmin ? 'Genel Merkez Yöneticisi' : isHqAssistant ? 'Genel Merkez Yardımcısı' : (currentUser?.city || 'Personel')}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={handleLogoutClick}
            className="sidebar-item-fluid w-full flex items-center rounded-xl p-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-700 dark:hover:text-rose-300 border border-transparent hover:border-rose-200 dark:hover:border-rose-900 transition-all duration-200 cursor-pointer active:scale-98 overflow-hidden"
            title="Güvenli Çıkış Yap"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span 
              className={`sidebar-text-gpu whitespace-nowrap overflow-hidden ml-3 ${
                collapsed ? 'opacity-0 -translate-x-3 pointer-events-none' : 'opacity-100 translate-x-0'
              }`}
            >
              Oturumu Kapat
            </span>
          </button>
        </div>

      </div>
    </aside>
  );
}
