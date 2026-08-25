import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { syncService } from '../services/syncService';
import { fetchLiveExchangeRates } from '../services/currencyService';
import { useAuth } from './AuthContext';

const DataContext = createContext();

export function DataProvider({ children }) {
  const { currentUser } = useAuth();
  const [packages, setPackages] = useState(() => syncService.getPackages());
  const [currencies, setCurrencies] = useState(() => syncService.getCurrencies());
  const [months, setMonths] = useState(() => syncService.getMonths());
  const [savedQuotes, setSavedQuotes] = useState(() => syncService.getSavedQuotes());
  const [announcements, setAnnouncements] = useState(() => syncService.getAnnouncements());
  const [auditLogs, setAuditLogs] = useState(() => syncService.getAuditLogs());
  const [lastSyncTime, setLastSyncTime] = useState(new Date());
  const [hotReloadAlert, setHotReloadAlert] = useState(null);

  // Quote being edited in wizard
  const [editingQuote, setEditingQuote] = useState(null);

  // Live Currency status & countdown
  const [nextSyncSeconds, setNextSyncSeconds] = useState(180);
  const [currencyStatus, setCurrencyStatus] = useState({
    isLive: false,
    lastUpdated: '',
    isLoading: false,
    source: ''
  });

  // Fetch Live Rates
  const refreshLiveCurrencies = useCallback(async (showToast = false) => {
    setCurrencyStatus(prev => ({ ...prev, isLoading: true }));
    const result = await fetchLiveExchangeRates();
    setCurrencyStatus(prev => ({ ...prev, isLoading: false }));

    if (result.success && result.rates) {
      setCurrencies(prev => {
        const merged = {
          ...prev,
          ...result.rates,
        };
        syncService.saveCurrencies(merged, currentUser, `Canlı piyasa kurları çekildi (USD: ${result.rates.USD_TRY} TL, EUR: ${result.rates.EUR_TRY} TL)`);
        return merged;
      });

      setCurrencyStatus({
        isLive: true,
        lastUpdated: result.lastUpdated,
        isLoading: false,
        source: result.source
      });

      setNextSyncSeconds(180);

      // Only show popup alert if explicitly requested by clicking manual refresh
      if (showToast) {
        triggerHotReloadAlert(`Canlı piyasa kurları güncellendi! (USD: ${result.rates.USD_TRY} ₺, EUR: ${result.rates.EUR_TRY} ₺)`);
      }
    }
  }, [currentUser]);

  // Initial fetch and 1-second countdown timer for next sync
  useEffect(() => {
    refreshLiveCurrencies(false);

    const timer = setInterval(() => {
      setNextSyncSeconds(prev => {
        if (prev <= 1) {
          refreshLiveCurrencies(false);
          return 180;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [refreshLiveCurrencies]);

  // Sync listener for cross-tab, cross-device and real-time Supabase updates
  useEffect(() => {
    // Pull fresh data from Supabase immediately on mount
    syncService.pullLatestFromSupabase();

    const unsubscribe = syncService.subscribe((event) => {
      setLastSyncTime(new Date());

      if (event.type === 'PACKAGES_UPDATED' || event.type === 'STORAGE_CHANGE') {
        const freshPackages = event.payload || syncService.getPackages();
        setPackages(freshPackages);
        setAuditLogs(syncService.getAuditLogs());
      } else if (event.type === 'CURRENCIES_UPDATED') {
        const freshCurrencies = event.payload || syncService.getCurrencies();
        setCurrencies(freshCurrencies);
        setAuditLogs(syncService.getAuditLogs());
      } else if (event.type === 'MONTHS_UPDATED') {
        const freshMonths = event.payload || syncService.getMonths();
        setMonths(freshMonths);
        setAuditLogs(syncService.getAuditLogs());
      } else if (event.type === 'ANNOUNCEMENTS_UPDATED') {
        const freshAnnouncements = event.payload || syncService.getAnnouncements();
        setAnnouncements(freshAnnouncements);
        setAuditLogs(syncService.getAuditLogs());
        triggerHotReloadAlert('Genel Merkez yeni bir duyuru yayınladı!');
      } else if (event.type === 'QUOTES_UPDATED') {
        const freshQuotes = event.payload || syncService.getSavedQuotes();
        setSavedQuotes(freshQuotes);
        setAuditLogs(syncService.getAuditLogs());
      } else if (event.type === 'AUDIT_LOGS_UPDATED') {
        setAuditLogs(event.payload || syncService.getAuditLogs());
      } else if (event.type === 'SYSTEM_RESET') {
        setPackages(syncService.getPackages());
        setCurrencies(syncService.getCurrencies());
        setMonths(syncService.getMonths());
        setAnnouncements(syncService.getAnnouncements());
        setAuditLogs(syncService.getAuditLogs());
        triggerHotReloadAlert('Sistem verileri fabrika ayarlarına sıfırlandı.');
      }
    });

    return () => unsubscribe();
  }, []);

  const triggerHotReloadAlert = (message) => {
    setHotReloadAlert({
      id: Date.now(),
      message,
      timestamp: new Date().toLocaleTimeString()
    });
    setTimeout(() => {
      setHotReloadAlert(prev => (prev && Date.now() - prev.id >= 4900 ? null : prev));
    }, 5000);
  };

  const updatePackage = useCallback((pkgId, updatedFields, note = '') => {
    const updated = packages.map(p => p.id === pkgId ? { ...p, ...updatedFields } : p);
    setPackages(updated);
    syncService.savePackages(updated, currentUser, note || `${updatedFields.name || pkgId} paketi güncellendi.`);
  }, [packages, currentUser]);

  const addPackage = useCallback((newPkg, note = '') => {
    const updated = [...packages, { ...newPkg, id: 'pkg_' + Date.now() }];
    setPackages(updated);
    syncService.savePackages(updated, currentUser, note || `${newPkg.name} paketi sisteme eklendi.`);
  }, [packages, currentUser]);

  const deletePackage = useCallback((pkgId, note = '') => {
    const target = packages.find(p => p.id === pkgId);
    const updated = packages.filter(p => p.id !== pkgId);
    setPackages(updated);
    syncService.savePackages(updated, currentUser, note || `${target?.name || pkgId} paketi silindi.`);
  }, [packages, currentUser]);

  const updateCurrencies = useCallback((newCurrencies, note = '') => {
    const updated = { ...currencies, ...newCurrencies };
    setCurrencies(updated);
    syncService.saveCurrencies(updated, currentUser, note);
  }, [currencies, currentUser]);

  const updateMonths = useCallback((newMonths, note = '') => {
    setMonths(newMonths);
    syncService.saveMonths(newMonths, currentUser, note);
  }, [currentUser]);

  const setSpecialPeriod = useCallback((type, targetMonthId) => {
    const updated = months.map(m => {
      if (type === 'ramadan') {
        if (m.id === targetMonthId) {
          return { ...m, badge: 'Ramazan Özel', subtitle: 'Ramazan-ı Şerif', isPeak: true };
        } else if (m.badge === 'Ramazan Özel') {
          return { ...m, badge: null, subtitle: 'Standart Sezon', isPeak: false };
        }
      } else if (type === 'shawwal') {
        if (m.id === targetMonthId) {
          return { ...m, badge: 'Şevval', subtitle: 'Şevval Umresi', isPeak: false };
        } else if (m.badge === 'Şevval') {
          return { ...m, badge: null, subtitle: 'Standart Sezon', isPeak: false };
        }
      }
      return m;
    });

    const targetMonthName = months.find(m => m.id === targetMonthId)?.name || targetMonthId;
    const typeLabel = type === 'ramadan' ? 'Ramazan-ı Şerif' : 'Şevval Umresi';
    updateMonths(updated, `${typeLabel} dönemi ${targetMonthName} ayına ayarlandı.`);
  }, [months, updateMonths]);

  // Announcements
  const addAnnouncement = useCallback((ann) => {
    const updated = syncService.saveAnnouncement(ann, currentUser);
    setAnnouncements(updated);
    setAuditLogs(syncService.getAuditLogs());
    return updated;
  }, [currentUser]);

  const deleteAnnouncement = useCallback((annId) => {
    const updated = syncService.deleteAnnouncement(annId, currentUser);
    setAnnouncements(updated);
    setAuditLogs(syncService.getAuditLogs());
    return updated;
  }, [currentUser]);

  // Quotes
  const saveQuote = useCallback((quote) => {
    const updated = syncService.saveQuote({
      ...quote,
      createdById: quote.createdById || currentUser?.id,
      createdByName: quote.createdByName || currentUser?.name,
      branch: quote.branch || currentUser?.branch
    });
    setSavedQuotes(updated);
    setAuditLogs(syncService.getAuditLogs());
    return updated;
  }, [currentUser]);

  const updateQuoteStatus = useCallback((quoteId, newStatus, note = '') => {
    const updated = syncService.updateQuoteStatus(quoteId, newStatus, currentUser, note);
    setSavedQuotes(updated);
    setAuditLogs(syncService.getAuditLogs());
    return updated;
  }, [currentUser]);

  const deleteQuote = useCallback((quoteId) => {
    const updated = syncService.deleteQuote(quoteId, currentUser);
    setSavedQuotes(updated);
    setAuditLogs(syncService.getAuditLogs());
  }, [currentUser]);

  const resetAllData = useCallback(() => {
    syncService.resetToDefaults(currentUser);
    setPackages(syncService.getPackages());
    setCurrencies(syncService.getCurrencies());
    setMonths(syncService.getMonths());
    setAnnouncements(syncService.getAnnouncements());
    setAuditLogs(syncService.getAuditLogs());
  }, [currentUser]);

  // Track unread announcements per user
  const [readAnnouncementIds, setReadAnnouncementIds] = useState(() => {
    try {
      const stored = localStorage.getItem(`inzar_read_ann_${currentUser?.id || 'guest'}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!currentUser?.id) return;
    try {
      const stored = localStorage.getItem(`inzar_read_ann_${currentUser.id}`);
      setReadAnnouncementIds(stored ? JSON.parse(stored) : []);
    } catch {
      setReadAnnouncementIds([]);
    }
  }, [currentUser?.id]);

  const markAnnouncementsAsRead = useCallback(() => {
    const allIds = announcements.map(a => a.id);
    setReadAnnouncementIds(allIds);
    try {
      localStorage.setItem(`inzar_read_ann_${currentUser?.id || 'guest'}`, JSON.stringify(allIds));
    } catch (e) {
      console.error('Error saving read announcements:', e);
    }
  }, [announcements, currentUser?.id]);

  const unreadAnnouncementsCount = announcements.filter(a => !readAnnouncementIds.includes(a.id)).length;

  return (
    <DataContext.Provider value={{
      packages,
      currencies,
      months,
      currencyStatus,
      nextSyncSeconds,
      refreshLiveCurrencies,
      announcements,
      unreadAnnouncementsCount,
      readAnnouncementIds,
      markAnnouncementsAsRead,
      addAnnouncement,
      deleteAnnouncement,
      savedQuotes,
      saveQuote,
      updateQuoteStatus,
      deleteQuote,
      editingQuote,
      setEditingQuote,
      auditLogs,
      lastSyncTime,
      hotReloadAlert,
      dismissHotReloadAlert: () => setHotReloadAlert(null),
      updatePackage,
      addPackage,
      deletePackage,
      updateCurrencies,
      updateMonths,
      setSpecialPeriod,
      resetAllData
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
