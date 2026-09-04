// Inzar Turizm - Modern Responsive Sidebar v1.0.12
import React, { useState } from 'react';
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
  const { unreadAnnouncementsCount, markAnnouncementsAsRead, savedQuotes } = useData();
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
      badgeCount: pendingHqCount,
      badgeColor: 'bg-amber-600',
      badgeText: 'Onay Bekliyor',
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
      className={`sidebar-gpu sticky top-0 h-screen bg-white/95 border-r border-slate-200/90 z-30 select-none overflow-hidden ${
        collapsed ? 'w-[74px]' : 'w-72'
      }`}
    >
      {/* Fixed-Width Inner Container (Eliminates all layout reflows for 120 FPS performance) */}
      <div className="w-72 h-full flex flex-col justify-between">
        
        {/* Top Header / Logo Section */}
        <div>
          <div className="p-3.5 border-b border-slate-100/90 flex items-center justify-between">
            {/* Logo Container */}
            <div className="flex items-center gap-3 overflow-hidden">
              <div 
                onClick={() => setCollapsed(!collapsed)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white p-1.5 shadow-sm border border-slate-200/90 transform hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer"
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
                <h1 className="text-base font-black font-display tracking-tight text-slate-900 leading-none">
                  İNZAR <span className="emerald-gradient-text">TURİZM</span>
                </h1>
                <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider mt-1 flex items-center gap-1">
                  <span>UTH&TP</span>
                  <span className="text-[8.5px] text-emerald-700 font-bold bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">v1.0.12</span>
                </p>
              </div>
            </div>

            {/* Collapse / Expand Toggle Button */}
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="flex items-center justify-center h-8 w-8 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 active:scale-90 transition-all duration-200 cursor-pointer shrink-0"
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
          <nav className="p-3 space-y-1.5 overflow-y-auto max-h-[calc(100vh-170px)]">
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
                  className={`sidebar-item-fluid relative w-full flex items-center rounded-2xl p-2.5 text-left font-medium group cursor-pointer overflow-hidden ${
                    isActive
                      ? 'bg-emerald-50/90 text-emerald-950 font-bold border border-emerald-300/80 shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                  }`}
                >
                  {/* Active Indicator Left Bar */}
                  {isActive && (
                    <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-emerald-600" />
                  )}

                  <div className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
                    isActive 
                      ? 'bg-gradient-to-tr from-emerald-600 to-emerald-500 text-white shadow-md shadow-emerald-700/30 scale-105' 
                      : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200/80 group-hover:text-slate-800 group-hover:scale-105'
                  }`}>
                    <Icon className="h-4 w-4" />
                    {item.badgeCount > 0 && collapsed && (
                      <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-white font-black text-[9px] ring-2 ring-white animate-pulse shadow-sm">
                        {item.badgeCount}
                      </span>
                    )}
                  </div>

                  <div 
                    className={`sidebar-text-gpu whitespace-nowrap overflow-hidden flex-1 ml-3.5 ${
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
                    <span className="text-[10px] text-slate-400 block truncate font-normal">
                      {item.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Date & Profile & Logout Box */}
        <div className="p-3 border-t border-slate-100/90 space-y-2">
          {/* Subtle Date */}
          <div className={`px-2 py-0.5 text-[11px] text-slate-400 font-medium sidebar-text-gpu whitespace-nowrap overflow-hidden flex items-center gap-1.5 ${
            collapsed ? 'opacity-0 -translate-x-3 pointer-events-none h-0' : 'opacity-100 translate-x-0'
          }`}>
            <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
            <span>{new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            title="Profilimi Görüntüle"
            className="sidebar-item-fluid w-full flex items-center rounded-2xl bg-slate-50/90 hover:bg-emerald-50/80 p-2 border border-slate-200/80 hover:border-emerald-300 shadow-2xs transition-all duration-200 cursor-pointer text-left overflow-hidden"
          >
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-xs shadow-xs overflow-hidden ${
              isAdmin
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : isHqAssistant
                ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
            }`}>
              {currentUser?.avatarImage ? (
                <img src={currentUser.avatarImage} alt="Profil" className="h-full w-full object-cover pointer-events-none" />
              ) : isAdmin ? (
                <ShieldCheck className="h-5 w-5 text-amber-700" />
              ) : isHqAssistant ? (
                <ShieldCheck className="h-5 w-5 text-indigo-700" />
              ) : (
                <User className="h-5 w-5 text-emerald-700" />
              )}
            </div>

            <div 
              className={`sidebar-text-gpu whitespace-nowrap overflow-hidden flex-1 ml-3 ${
                collapsed ? 'opacity-0 -translate-x-3 pointer-events-none' : 'opacity-100 translate-x-0'
              }`}
            >
              <div className="text-xs font-bold text-slate-900 truncate">
                {currentUser?.name}
              </div>
              <div className="text-[10px] font-semibold text-emerald-700 truncate">
                {isAdmin ? 'Genel Merkez Yöneticisi' : isHqAssistant ? 'Genel Merkez Yardımcısı' : (currentUser?.city || 'Personel')}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={handleLogoutClick}
            className="sidebar-item-fluid w-full flex items-center rounded-xl p-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 border border-transparent hover:border-rose-200 transition-all duration-200 cursor-pointer active:scale-98 overflow-hidden"
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
