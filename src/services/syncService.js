// İnzar Turizm - Supabase Realtime & Hot-Reload Senkronizasyon Motoru
import { DEFAULT_PACKAGES, DEFAULT_CURRENCIES, DEFAULT_USERS, DEFAULT_MONTHS, DEFAULT_ANNOUNCEMENTS } from '../data/defaultTariffData';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const STORAGE_KEYS = {
  PACKAGES: 'inzar_packages_v3',
  CURRENCIES: 'inzar_currencies_v3',
  USERS: 'inzar_users_v3',
  QUOTES: 'inzar_saved_quotes_v3',
  AUDIT_LOGS: 'inzar_audit_logs_v3',
  MONTHS: 'inzar_months_config_v3',
  ANNOUNCEMENTS: 'inzar_announcements_v3',
};

class SyncService {
  constructor() {
    this.broadcastChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('inzar_sync_hub_v3') : null;
    this.listeners = new Set();
    this.isSupabaseReady = isSupabaseConfigured;

    if (this.broadcastChannel) {
      this.broadcastChannel.onmessage = (event) => {
        this.notifyListeners(event.data);
      };
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key && e.key.startsWith('inzar_')) {
          this.notifyListeners({ type: 'STORAGE_CHANGE', key: e.key });
        }
      });
    }

    // Initialize Supabase Realtime Subscriptions
    if (this.isSupabaseReady && supabase) {
      this.initSupabaseRealtime();
      this.pullLatestFromSupabase();
    }
  }

  initSupabaseRealtime() {
    try {
      const channel = supabase
        .channel('inzar_live_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'quotes' }, (payload) => {
          this.handleRemoteQuoteChange(payload);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'packages' }, () => {
          this.fetchPackagesFromSupabase();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'months_config' }, () => {
          this.fetchMonthsFromSupabase();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'currencies' }, () => {
          this.fetchCurrenciesFromSupabase();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
          this.fetchAnnouncementsFromSupabase();
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, (payload) => {
          if (payload.new) {
            const logs = this.getAuditLogs();
            const updated = [payload.new, ...logs.filter(l => l.id !== payload.new.id)].slice(0, 100);
            localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(updated));
            this.notifyListeners({ type: 'AUDIT_LOGS_UPDATED', payload: updated });
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
          this.fetchProfilesFromSupabase();
        })
        .subscribe((status) => {
          console.log('[Supabase Realtime Status]:', status);
        });

      this.realtimeChannel = channel;
    } catch (err) {
      console.error('[Supabase Realtime Init Error]:', err);
    }
  }

  async pullLatestFromSupabase() {
    await Promise.allSettled([
      this.fetchPackagesFromSupabase(),
      this.fetchCurrenciesFromSupabase(),
      this.fetchMonthsFromSupabase(),
      this.fetchQuotesFromSupabase(),
      this.fetchAnnouncementsFromSupabase(),
      this.fetchAuditLogsFromSupabase(),
      this.fetchProfilesFromSupabase()
    ]);
  }

  // --- Remote Fetch Handlers ---

  async fetchPackagesFromSupabase() {
    if (!this.isSupabaseReady) return;
    try {
      const { data, error } = await supabase.from('packages').select('*');
      if (!error && data && data.length > 0) {
        const formatted = data.map(p => ({
          id: p.id,
          name: p.name,
          code: p.tag || 'STD',
          color: p.color || '#059669',
          profitMargin: Number(p.profit_margin) || 15,
          foodType: p.food_type,
          hotelMakkah: p.hotel_makkah,
          hotelMadinah: p.hotel_madinah,
          distanceMakkah: p.distance_makkah,
          distanceMadinah: p.distance_madinah,
          defaultDaysMakkah: p.default_days_makkah,
          defaultDaysMadinah: p.default_days_madinah,
          makkahFoodPriceSAR: p.makkah_prices?.food || 40,
          madinahFoodPriceSAR: p.madinah_prices?.food || 45,
          monthlyPrices: p.makkah_prices ? {
            jan: { makkahRoomSAR: p.makkah_prices.jan, madinahRoomSAR: p.madinah_prices?.jan },
            feb: { makkahRoomSAR: p.makkah_prices.feb, madinahRoomSAR: p.madinah_prices?.feb },
            mar: { makkahRoomSAR: p.makkah_prices.mar, madinahRoomSAR: p.madinah_prices?.mar },
            apr: { makkahRoomSAR: p.makkah_prices.apr, madinahRoomSAR: p.madinah_prices?.apr },
            may: { makkahRoomSAR: p.makkah_prices.may, madinahRoomSAR: p.madinah_prices?.may },
            jun: { makkahRoomSAR: p.makkah_prices.jun, madinahRoomSAR: p.madinah_prices?.jun },
            jul: { makkahRoomSAR: p.makkah_prices.jul, madinahRoomSAR: p.madinah_prices?.jul },
            aug: { makkahRoomSAR: p.makkah_prices.aug, madinahRoomSAR: p.madinah_prices?.aug },
            sep: { makkahRoomSAR: p.makkah_prices.sep, madinahRoomSAR: p.madinah_prices?.sep },
            oct: { makkahRoomSAR: p.makkah_prices.oct, madinahRoomSAR: p.madinah_prices?.oct },
            nov: { makkahRoomSAR: p.makkah_prices.nov, madinahRoomSAR: p.madinah_prices?.nov },
            dec: { makkahRoomSAR: p.makkah_prices.dec, madinahRoomSAR: p.madinah_prices?.dec },
          } : {},
          fixedExpenses: p.fixed_expenses || {},
          transfers: p.transfers || {}
        }));
        localStorage.setItem(STORAGE_KEYS.PACKAGES, JSON.stringify(formatted));
        this.notifyListeners({ type: 'PACKAGES_UPDATED', payload: formatted });
      }
    } catch (e) {
      console.warn('Supabase packages fetch fallback:', e);
    }
  }

  async fetchCurrenciesFromSupabase() {
    if (!this.isSupabaseReady) return;
    try {
      const { data, error } = await supabase.from('currencies').select('*').single();
      if (!error && data) {
        const formatted = {
          SAR_USD: Number(data.sar_usd) || 3.75,
          USD_TRY: Number(data.usd_try) || 36.50,
          EUR_TRY: Number(data.eur_try) || 39.80,
          EUR_USD: Number(data.eur_usd) || 1.08
        };
        localStorage.setItem(STORAGE_KEYS.CURRENCIES, JSON.stringify(formatted));
        this.notifyListeners({ type: 'CURRENCIES_UPDATED', payload: formatted });
      }
    } catch (e) {}
  }

  async fetchMonthsFromSupabase() {
    if (!this.isSupabaseReady) return;
    try {
      const { data, error } = await supabase.from('months_config').select('*').order('sort_order');
      if (!error && data && data.length > 0) {
        const formatted = data.map(m => ({
          id: m.id,
          name: m.name,
          label: m.label,
          season: m.season,
          isPeak: m.is_peak,
          badge: m.badge,
          subtitle: m.subtitle
        }));
        localStorage.setItem(STORAGE_KEYS.MONTHS, JSON.stringify(formatted));
        this.notifyListeners({ type: 'MONTHS_UPDATED', payload: formatted });
      }
    } catch (e) {}
  }

  async fetchQuotesFromSupabase() {
    if (!this.isSupabaseReady) return;
    try {
      const { data, error } = await supabase.from('quotes').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        const formatted = data.map(q => ({
          id: q.id,
          customerName: q.customer_name,
          customerPhone: q.customer_phone,
          packageId: q.package_id,
          packageName: q.package_name,
          selectedMonth: q.selected_month,
          selectedMonthLabel: q.selected_month_label,
          makkahDays: q.makkah_days,
          madinahDays: q.madinah_days,
          paxCount: q.pax_count,
          roomMatrix: q.room_matrix,
          selectedRoomOccupancy: q.selected_room_occupancy,
          finalPriceUSD: Number(q.final_price_usd),
          finalPriceTRY: Number(q.final_price_try),
          finalPriceEUR: Number(q.final_price_eur),
          currency: q.currency,
          status: q.status,
          statusLabel: q.status === 'approved' ? 'Müşteri Onayladı' : q.status === 'approved_revised' ? 'Onaylı & Revize' : q.status === 'revised' ? 'Sonradan Düzenlendi' : 'Beklemede',
          createdById: q.created_by_id,
          createdByName: q.created_by_name,
          branch: q.branch,
          revisionCount: q.revision_count,
          transfersSelection: q.transfers_selection,
          fixedExpensesIncluded: q.fixed_expenses_included,
          notes: q.notes,
          createdAt: q.created_at,
          updatedAt: q.updated_at
        }));
        localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(formatted));
        this.notifyListeners({ type: 'QUOTES_UPDATED', payload: formatted });
      }
    } catch (e) {}
  }

  async fetchAnnouncementsFromSupabase() {
    if (!this.isSupabaseReady) return;
    try {
      const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        const formatted = data.map(a => ({
          id: a.id,
          title: a.title,
          content: a.content,
          author: a.author,
          priority: a.priority,
          isPinned: a.is_pinned,
          date: new Date(a.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
          createdAt: a.created_at
        }));
        localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(formatted));
        this.notifyListeners({ type: 'ANNOUNCEMENTS_UPDATED', payload: formatted });
      }
    } catch (e) {}
  }

  async fetchAuditLogsFromSupabase() {
    if (!this.isSupabaseReady) return;
    try {
      const { data, error } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(100);
      if (!error && data) {
        localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(data));
        this.notifyListeners({ type: 'AUDIT_LOGS_UPDATED', payload: data });
      }
    } catch (e) {}
  }

  async fetchProfilesFromSupabase() {
    if (!this.isSupabaseReady) return;
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (!error && data && data.length > 0) {
        const formatted = data.map(u => ({
          id: u.id,
          username: u.email.split('@')[0],
          name: u.name,
          role: u.role,
          city: u.city,
          branch: u.branch,
          phone: u.phone,
          email: u.email,
          avatarImage: u.avatar_image,
          isActive: u.is_active,
          createdAt: u.created_at,
          lastLogin: u.last_login
        }));
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(formatted));
        this.notifyListeners({ type: 'USERS_UPDATED', payload: formatted });
      }
    } catch (e) {}
  }

  handleRemoteQuoteChange(payload) {
    this.fetchQuotesFromSupabase();
  }

  // --- Public Sync Methods (Used by UI) ---

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(data) {
    this.listeners.forEach(cb => {
      try { cb(data); } catch (err) { console.error('Sync listener error:', err); }
    });
  }

  broadcast(type, payload) {
    const message = {
      type,
      payload,
      timestamp: new Date().toISOString(),
      senderId: 'client_' + Math.random().toString(36).substring(2, 9)
    };
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(message);
    }
    this.notifyListeners(message);
  }

  getPackages() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PACKAGES);
      if (data) return JSON.parse(data);
    } catch (e) {}
    localStorage.setItem(STORAGE_KEYS.PACKAGES, JSON.stringify(DEFAULT_PACKAGES));
    return DEFAULT_PACKAGES;
  }

  savePackages(packages, user = null, changeNote = '') {
    localStorage.setItem(STORAGE_KEYS.PACKAGES, JSON.stringify(packages));
    this.addAuditLog({
      action: 'PACKAGES_UPDATED',
      user: user?.name || 'Genel Merkez',
      details: changeNote || 'Paket tarifeleri güncellendi.',
      timestamp: new Date().toISOString()
    });
    this.broadcast('PACKAGES_UPDATED', packages);

    // Sync to Supabase
    if (this.isSupabaseReady) {
      packages.forEach(async (pkg) => {
        try {
          await supabase.from('packages').upsert({
            id: pkg.id,
            name: pkg.name,
            tag: pkg.code || 'STD',
            color: pkg.color || '#059669',
            profit_margin: pkg.profitMargin || 15,
            hotel_makkah: pkg.hotelMakkah || '',
            hotel_madinah: pkg.hotelMadinah || '',
            distance_makkah: pkg.distanceMakkah || '',
            distance_madinah: pkg.distanceMadinah || '',
            default_days_makkah: pkg.defaultDaysMakkah || 10,
            default_days_madinah: pkg.defaultDaysMadinah || 4,
            makkah_prices: {
              food: pkg.makkahFoodPriceSAR || 40,
              jan: pkg.monthlyPrices?.jan?.makkahRoomSAR || 0,
              feb: pkg.monthlyPrices?.feb?.makkahRoomSAR || 0,
              mar: pkg.monthlyPrices?.mar?.makkahRoomSAR || 0,
              apr: pkg.monthlyPrices?.apr?.makkahRoomSAR || 0,
              may: pkg.monthlyPrices?.may?.makkahRoomSAR || 0,
              jun: pkg.monthlyPrices?.jun?.makkahRoomSAR || 0,
              jul: pkg.monthlyPrices?.jul?.makkahRoomSAR || 0,
              aug: pkg.monthlyPrices?.aug?.makkahRoomSAR || 0,
              sep: pkg.monthlyPrices?.sep?.makkahRoomSAR || 0,
              oct: pkg.monthlyPrices?.oct?.makkahRoomSAR || 0,
              nov: pkg.monthlyPrices?.nov?.makkahRoomSAR || 0,
              dec: pkg.monthlyPrices?.dec?.makkahRoomSAR || 0,
            },
            madinah_prices: {
              food: pkg.madinahFoodPriceSAR || 45,
              jan: pkg.monthlyPrices?.jan?.madinahRoomSAR || 0,
              feb: pkg.monthlyPrices?.feb?.madinahRoomSAR || 0,
              mar: pkg.monthlyPrices?.mar?.madinahRoomSAR || 0,
              apr: pkg.monthlyPrices?.apr?.madinahRoomSAR || 0,
              may: pkg.monthlyPrices?.may?.madinahRoomSAR || 0,
              jun: pkg.monthlyPrices?.jun?.madinahRoomSAR || 0,
              jul: pkg.monthlyPrices?.jul?.madinahRoomSAR || 0,
              aug: pkg.monthlyPrices?.aug?.madinahRoomSAR || 0,
              sep: pkg.monthlyPrices?.sep?.madinahRoomSAR || 0,
              oct: pkg.monthlyPrices?.oct?.madinahRoomSAR || 0,
              nov: pkg.monthlyPrices?.nov?.madinahRoomSAR || 0,
              dec: pkg.monthlyPrices?.dec?.madinahRoomSAR || 0,
            },
            fixed_expenses: pkg.fixedExpenses || {},
            transfers: pkg.transfers || {},
            updated_at: new Date().toISOString()
          });
        } catch (e) {}
      });
    }
  }

  getCurrencies() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENCIES);
      if (data) return JSON.parse(data);
    } catch (e) {}
    localStorage.setItem(STORAGE_KEYS.CURRENCIES, JSON.stringify(DEFAULT_CURRENCIES));
    return DEFAULT_CURRENCIES;
  }

  saveCurrencies(currencies, user = null, changeNote = '') {
    localStorage.setItem(STORAGE_KEYS.CURRENCIES, JSON.stringify(currencies));
    this.addAuditLog({
      action: 'CURRENCY_UPDATED',
      user: user?.name || 'Genel Merkez',
      details: changeNote || `Kurlar güncellendi (USD/SAR: ${currencies.SAR_USD}, USD/TRY: ${currencies.USD_TRY})`,
      timestamp: new Date().toISOString()
    });
    this.broadcast('CURRENCIES_UPDATED', currencies);

    if (this.isSupabaseReady) {
      supabase.from('currencies').upsert({
        id: 'current_rates',
        usd_try: currencies.USD_TRY,
        eur_try: currencies.EUR_TRY,
        sar_usd: currencies.SAR_USD,
        sar_try: (currencies.USD_TRY / currencies.SAR_USD).toFixed(2),
        eur_usd: currencies.EUR_USD || 1.08,
        source: 'TCMB / Canlı Piyasa',
        updated_at: new Date().toISOString()
      }).then();
    }
  }

  getMonths() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MONTHS);
      if (data) return JSON.parse(data);
    } catch (e) {}
    localStorage.setItem(STORAGE_KEYS.MONTHS, JSON.stringify(DEFAULT_MONTHS));
    return DEFAULT_MONTHS;
  }

  saveMonths(months, user = null, changeNote = '') {
    localStorage.setItem(STORAGE_KEYS.MONTHS, JSON.stringify(months));
    this.addAuditLog({
      action: 'MONTHS_CONFIG_UPDATED',
      user: user?.name || 'Genel Merkez',
      details: changeNote || 'Hicri sezon ve ay etiketleri güncellendi.',
      timestamp: new Date().toISOString()
    });
    this.broadcast('MONTHS_UPDATED', months);

    if (this.isSupabaseReady) {
      months.forEach((m, idx) => {
        supabase.from('months_config').upsert({
          id: m.id,
          name: m.name,
          label: m.label,
          season: m.season || 'standard',
          is_peak: Boolean(m.isPeak),
          badge: m.badge || null,
          subtitle: m.subtitle || null,
          sort_order: idx + 1,
          updated_at: new Date().toISOString()
        }).then();
      });
    }
  }

  getUsers() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  }

  saveUsers(users) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    this.broadcast('USERS_UPDATED', users);
  }

  getAnnouncements() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS);
      if (data) return JSON.parse(data);
    } catch (e) {}
    localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(DEFAULT_ANNOUNCEMENTS));
    return DEFAULT_ANNOUNCEMENTS;
  }

  saveAnnouncement(announcement, user = null) {
    const current = this.getAnnouncements();
    const newAnn = {
      ...announcement,
      id: announcement.id || 'ann_' + Date.now(),
      author: user?.name || announcement.author || 'Genel Merkez',
      date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
      timestamp: new Date().toISOString()
    };
    const updated = [newAnn, ...current.filter(a => a.id !== newAnn.id)];
    localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(updated));
    this.addAuditLog({
      action: 'ANNOUNCEMENT_PUBLISHED',
      user: user?.name || 'Genel Merkez',
      details: `"${newAnn.title}" duyurusu yayınlandı.`,
      timestamp: new Date().toISOString()
    });
    this.broadcast('ANNOUNCEMENTS_UPDATED', updated);

    if (this.isSupabaseReady) {
      supabase.from('announcements').upsert({
        id: newAnn.id,
        title: newAnn.title,
        content: newAnn.content,
        author: newAnn.author,
        priority: newAnn.priority || 'normal',
        is_pinned: Boolean(newAnn.isPinned),
        created_at: newAnn.timestamp
      }).then();
    }

    return updated;
  }

  deleteAnnouncement(annId, user = null) {
    const current = this.getAnnouncements();
    const target = current.find(a => a.id === annId);
    const updated = current.filter(a => a.id !== annId);
    localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(updated));
    this.addAuditLog({
      action: 'ANNOUNCEMENT_DELETED',
      user: user?.name || 'Genel Merkez',
      details: `"${target?.title || annId}" duyurusu silindi.`,
      timestamp: new Date().toISOString()
    });
    this.broadcast('ANNOUNCEMENTS_UPDATED', updated);

    if (this.isSupabaseReady) {
      supabase.from('announcements').delete().eq('id', annId).then();
    }

    return updated;
  }

  getSavedQuotes() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.QUOTES);
      if (data) return JSON.parse(data);
    } catch (e) {}
    return [];
  }

  saveQuote(quote) {
    const current = this.getSavedQuotes();
    const existingIndex = current.findIndex(q => q.id === quote.id);
    let updated;
    let quoteToSave;

    if (existingIndex >= 0) {
      const existing = current[existingIndex];
      quoteToSave = {
        ...existing,
        ...quote,
        status: existing.status === 'approved' ? 'approved_revised' : 'revised',
        statusLabel: 'Sonradan Düzenlenen Teklif',
        updatedAt: new Date().toISOString(),
        revisionCount: (existing.revisionCount || 0) + 1
      };

      updated = [...current];
      updated[existingIndex] = quoteToSave;

      this.addAuditLog({
        action: 'QUOTE_REVISED',
        user: quote.createdByName || 'Personel',
        details: `${quote.customerName || 'Misafir'} adına oluşturulan ${quote.packageName} teklifi revize edildi (${quote.finalPriceUSD} USD).`,
        timestamp: new Date().toISOString()
      });
    } else {
      quoteToSave = {
        ...quote,
        id: quote.id || 'QUO-' + Date.now(),
        status: 'pending',
        statusLabel: 'Beklemede (İlk Teklif)',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        revisionCount: 0
      };
      updated = [quoteToSave, ...current];

      this.addAuditLog({
        action: 'QUOTE_CREATED',
        user: quote.createdByName || 'Personel',
        details: `${quote.customerName || 'Misafir'} adına ${quote.packageName} (${quote.finalPriceUSD} USD) teklifi oluşturuldu.`,
        timestamp: new Date().toISOString()
      });
    }

    localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(updated));
    this.broadcast('QUOTES_UPDATED', updated);

    // Save to Supabase Realtime Table
    if (this.isSupabaseReady) {
      supabase.from('quotes').upsert({
        id: quoteToSave.id,
        customer_name: quoteToSave.customerName,
        customer_phone: quoteToSave.customerPhone || null,
        package_id: quoteToSave.packageId || 'standart',
        package_name: quoteToSave.packageName,
        selected_month: quoteToSave.selectedMonth || 'jan',
        selected_month_label: quoteToSave.selectedMonthLabel || '',
        makkah_days: quoteToSave.makkahDays || 10,
        madinah_days: quoteToSave.madinahDays || 4,
        pax_count: quoteToSave.paxCount || 1,
        room_matrix: quoteToSave.roomMatrix || [],
        selected_room_occupancy: quoteToSave.selectedRoomOccupancy || 2,
        final_price_usd: quoteToSave.finalPriceUSD || 0,
        final_price_try: quoteToSave.finalPriceTRY || 0,
        final_price_eur: quoteToSave.finalPriceEUR || 0,
        currency: quoteToSave.currency || 'USD',
        status: quoteToSave.status || 'pending',
        created_by_id: quoteToSave.createdById || null,
        created_by_name: quoteToSave.createdByName || 'Personel',
        branch: quoteToSave.branch || 'Merkez',
        revision_count: quoteToSave.revisionCount || 0,
        transfers_selection: quoteToSave.transfersSelection || {},
        fixed_expenses_included: quoteToSave.fixedExpensesIncluded || {},
        notes: quoteToSave.notes || null,
        created_at: quoteToSave.createdAt,
        updated_at: quoteToSave.updatedAt
      }).then(({ error }) => {
        if (error) console.error('Supabase quote upsert error:', error);
      });
    }

    return updated;
  }

  updateQuoteStatus(quoteId, newStatus, user = null, note = '') {
    const current = this.getSavedQuotes();
    const updated = current.map(q => {
      if (q.id === quoteId) {
        return {
          ...q,
          status: newStatus,
          statusLabel: newStatus === 'approved' ? 'Müşteri Onayladı' : newStatus === 'revised' ? 'Sonradan Düzenlendi' : 'Beklemede',
          approvedAt: newStatus === 'approved' ? new Date().toISOString() : q.approvedAt,
          approvedBy: newStatus === 'approved' ? (user?.name || 'Müşteri/Personel') : q.approvedBy,
          statusNote: note || q.statusNote,
          updatedAt: new Date().toISOString()
        };
      }
      return q;
    });

    localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(updated));
    const target = current.find(q => q.id === quoteId);
    this.addAuditLog({
      action: newStatus === 'approved' ? 'QUOTE_APPROVED' : 'QUOTE_STATUS_CHANGED',
      user: user?.name || 'Personel',
      details: `${target?.customerName || 'Misafir'} adına teklif durumu: ${newStatus === 'approved' ? 'MÜŞTERİ ONAYLADI' : newStatus} olarak güncellendi.`,
      timestamp: new Date().toISOString()
    });
    this.broadcast('QUOTES_UPDATED', updated);

    if (this.isSupabaseReady) {
      supabase.from('quotes').update({
        status: newStatus,
        updated_at: new Date().toISOString()
      }).eq('id', quoteId).then();
    }

    return updated;
  }

  deleteQuote(quoteId, user = null) {
    const current = this.getSavedQuotes();
    const target = current.find(q => q.id === quoteId);
    const updated = current.filter(q => q.id !== quoteId);
    localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(updated));
    this.addAuditLog({
      action: 'QUOTE_DELETED',
      user: user?.name || 'Genel Merkez',
      details: `${target?.customerName || 'Misafir'} adına olan ${target?.packageName || ''} teklifi silindi.`,
      timestamp: new Date().toISOString()
    });
    this.broadcast('QUOTES_UPDATED', updated);

    if (this.isSupabaseReady) {
      supabase.from('quotes').delete().eq('id', quoteId).then();
    }

    return updated;
  }

  getAuditLogs() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      if (data) return JSON.parse(data);
    } catch (e) {}
    return [];
  }

  addAuditLog(logEntry) {
    const logs = this.getAuditLogs();
    const newLog = {
      id: 'LOG_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      action: logEntry.action,
      user: logEntry.user,
      details: logEntry.details,
      timestamp: logEntry.timestamp || new Date().toISOString()
    };
    const updated = [newLog, ...logs].slice(0, 100);
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(updated));

    if (this.isSupabaseReady) {
      supabase.from('audit_logs').insert({
        action: newLog.action,
        user: newLog.user,
        details: newLog.details,
        timestamp: newLog.timestamp
      }).then();
    }

    return updated;
  }

  resetToDefaults(user = null) {
    localStorage.setItem(STORAGE_KEYS.PACKAGES, JSON.stringify(DEFAULT_PACKAGES));
    localStorage.setItem(STORAGE_KEYS.CURRENCIES, JSON.stringify(DEFAULT_CURRENCIES));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
    localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(DEFAULT_ANNOUNCEMENTS));
    this.addAuditLog({
      action: 'SYSTEM_RESET',
      user: user?.name || 'Yönetici',
      details: 'Sistem fabrika varsayılanlarına sıfırlandı.',
      timestamp: new Date().toISOString()
    });
    this.broadcast('SYSTEM_RESET', { packages: DEFAULT_PACKAGES, currencies: DEFAULT_CURRENCIES });
  }
}

export const syncService = new SyncService();
