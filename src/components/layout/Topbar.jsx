import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { 
  RefreshCw, 
  Timer, 
  X, 
  ChevronLeft,
  Bell,
  FileText,
  Megaphone,
  Building2,
  CheckCheck,
  Trash2,
  ExternalLink,
  Radio
} from 'lucide-react';

export default function Topbar({ setActiveTab }) {
  const { 
    currencies, 
    currencyStatus, 
    nextSyncSeconds, 
    refreshLiveCurrencies,
    notifications = [],
    unreadNotifCount = 0,
    markNotifsAsRead,
    clearNotifs
  } = useData();

  const [isRatesOpen, setIsRatesOpen] = useState(false);
  const [isNotifsOpen, setIsNotifsOpen] = useState(false);
  const notifDropdownRef = useRef(null);

  const minutes = Math.floor(nextSyncSeconds / 60);
  const seconds = nextSyncSeconds % 60;
  const formattedCountdown = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target)) {
        setIsNotifsOpen(false);
      }
    };
    if (isNotifsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNotifsOpen]);

  const handleToggleNotifs = () => {
    const nextState = !isNotifsOpen;
    setIsNotifsOpen(nextState);
    if (nextState && unreadNotifCount > 0 && markNotifsAsRead) {
      markNotifsAsRead();
    }
  };

  const handleNotificationClick = (notif) => {
    setIsNotifsOpen(false);
    if (!setActiveTab) return;

    if (notif.type === 'quote') {
      setActiveTab('quotes');
    } else if (notif.type === 'announcement') {
      setActiveTab('announcements');
    } else if (notif.type === 'tariff') {
      setActiveTab('monthly_matrix');
    }
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'quote':
        return <FileText className="h-4 w-4 text-emerald-400" />;
      case 'announcement':
        return <Megaphone className="h-4 w-4 text-amber-400" />;
      case 'tariff':
        return <Building2 className="h-4 w-4 text-teal-400" />;
      default:
        return <Radio className="h-4 w-4 text-emerald-400" />;
    }
  };

  return (
    <header className="relative z-20 bg-transparent border-0 shadow-none px-4 sm:px-6 py-2.5 font-sans">
      <div className="relative flex items-center justify-end gap-2 w-full min-h-9">
        
        {/* 🔔 Live Notification Bell Center Button */}
        <div className="relative" ref={notifDropdownRef}>
          <button
            type="button"
            onClick={handleToggleNotifs}
            className={`relative flex items-center justify-center h-9 w-9 rounded-full bg-white/95 border transition-all duration-200 cursor-pointer shadow-xs select-none backdrop-blur-md ${
              isNotifsOpen || unreadNotifCount > 0 
                ? 'border-emerald-500 text-emerald-800 bg-emerald-50/90 ring-2 ring-emerald-400/30' 
                : 'border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-900'
            }`}
            title="Canlı Bildirimler & Akış"
          >
            <Bell className="h-4 w-4" />
            
            {/* Unread Counter Badge */}
            {unreadNotifCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-white text-[10px] font-black font-mono shadow-sm animate-pulse">
                {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
              </span>
            )}
          </button>

          {/* 📬 Floating Notification Dropdown Center */}
          {isNotifsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-950/95 border border-slate-800 shadow-2xl backdrop-blur-2xl text-slate-100 overflow-hidden z-50 animate-fade-scale">
              
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-900/60">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  <h3 className="text-xs font-black font-display text-white tracking-wide">
                    Canlı Sistem Bildirimleri
                  </h3>
                </div>

                <div className="flex items-center gap-1.5">
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={() => clearNotifs && clearNotifs()}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-white/5 text-[11px] flex items-center gap-1 transition-colors"
                      title="Tümünü Temizle"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Temizle</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Feed List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/50">
                {notifications.length === 0 ? (
                  <div className="py-8 px-4 text-center">
                    <Bell className="h-8 w-8 text-slate-600 mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-bold text-slate-400">Henüz yeni bir bildirim yok</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Yeni teklif, onay ve duyurular burada anlık listelenir.</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`p-3 transition-colors cursor-pointer flex items-start gap-3 hover:bg-emerald-950/30 ${
                        !n.isRead ? 'bg-emerald-950/20' : ''
                      }`}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 border border-white/10 mt-0.5">
                        {getNotifIcon(n.type)}
                      </div>

                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-slate-100 truncate font-display">
                            {n.title || 'Canlı Bildirim'}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {n.timestamp}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-snug line-clamp-2">
                          {n.message}
                        </p>
                        <div className="pt-0.5 flex items-center text-[10px] font-semibold text-emerald-400">
                          <span>Görüntülemek için tıkla</span>
                          <ExternalLink className="h-2.5 w-2.5 ml-1" />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="p-2.5 border-t border-slate-800/80 bg-slate-900/40 text-center">
                <span className="text-[10px] text-slate-400 font-medium">
                  İnzar Canlı Senkronizasyon v5.2 • Aktif
                </span>
              </div>

            </div>
          )}
        </div>

        {/* 💱 Closed State: Simple "Kurlar" Pill Button */}
        {!isRatesOpen && (
          <button
            type="button"
            onClick={() => setIsRatesOpen(true)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/95 hover:bg-emerald-50 text-emerald-950 border border-emerald-300 transition-all duration-200 cursor-pointer spring-pill shadow-xs select-none backdrop-blur-md h-9"
            title="Piyasa Kurlarını Görüntüle"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>

            <span className="text-xs font-bold font-display">Kurlar</span>
            <ChevronLeft className="h-3.5 w-3.5 text-emerald-700" />
          </button>
        )}

        {/* 💱 Opened State: Full Floating Rates Capsule */}
        {isRatesOpen && (
          <div className="flex-1 flex items-center justify-between gap-3 animate-fade-scale bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-full px-4 py-1.5 shadow-md overflow-x-auto min-h-9">
            
            {/* Left Title & Live Indicator */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-emerald-950 font-display hidden sm:inline">
                Canlı Piyasa Kurları:
              </span>
            </div>

            {/* Currency Values as Clean Inline Typography */}
            <div className="flex items-center gap-3 font-mono text-xs overflow-x-auto py-0.5">
              {/* USD */}
              <span className="text-slate-600 whitespace-nowrap">
                1 USD = <strong className="text-emerald-800 font-bold">{currencies.USD_TRY} ₺</strong>
              </span>

              <span className="text-slate-300 select-none">•</span>

              {/* EUR */}
              <span className="text-slate-600 whitespace-nowrap">
                1 EUR = <strong className="text-emerald-800 font-bold">{currencies.EUR_TRY} ₺</strong>
              </span>

              <span className="text-slate-300 select-none">•</span>

              {/* SAR / USD */}
              <span className="text-slate-600 whitespace-nowrap">
                1 USD = <strong className="text-amber-900 font-bold">{currencies.SAR_USD} SAR</strong>
              </span>

              <span className="text-slate-300 select-none">•</span>

              {/* Countdown Timer */}
              <div 
                title={`Sonraki otomatik güncellemeye kalan süre: ${formattedCountdown}`}
                className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 whitespace-nowrap select-none"
              >
                <Timer className="h-3.5 w-3.5 text-emerald-600" />
                <span>{formattedCountdown}</span>
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={() => refreshLiveCurrencies(true)}
                disabled={currencyStatus.isLoading}
                title={`Kurları Şimdi Yenile (Son: ${currencyStatus.lastUpdated || 'Canlı'})`}
                className="flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold whitespace-nowrap cursor-pointer shadow-3xs spring-pill"
              >
                <RefreshCw className={`h-3 w-3 ${currencyStatus.isLoading ? 'animate-spin' : ''}`} />
                <span>Yenile</span>
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsRatesOpen(false)}
              className="flex items-center justify-center h-6 w-6 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer shrink-0"
              title="Kurları Kapat"
            >
              <X className="h-3.5 w-3.5" />
            </button>

          </div>
        )}

      </div>
    </header>
  );
}
