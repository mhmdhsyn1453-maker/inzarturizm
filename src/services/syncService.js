// İnzar Turizm - Supabase Realtime & Hot-Reload Senkronizasyon Motoru
import { DEFAULT_PACKAGES, DEFAULT_CURRENCIES, DEFAULT_USERS, DEFAULT_MONTHS, DEFAULT_ANNOUNCEMENTS } from '../data/defaultTariffData';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { notificationService } from './notificationService';

const STORAGE_KEYS = {
  PACKAGES: 'inzar_packages_v3',
  CURRENCIES: 'inzar_currencies_v3',
  USERS: 'inzar_users_v3',
  QUOTES: 'inzar_saved_quotes_v3',
  CUSTOMERS: 'inzar_customers_v3',
  AUDIT_LOGS: 'inzar_audit_logs_v3',
  MONTHS: 'inzar_months_config_v3',
  ANNOUNCEMENTS: 'inzar_announcements_v3',
};

class SyncService {
  constructor() {
    this.broadcastChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('inzar_sync_hub_v3') : null;
    this.listeners = new Set();
    this.isSupabaseReady = isSupabaseConfigured;
    this.realtimeChannel = null;
    this.reconnectTimeout = null;
    this.heartbeatTimer = null;
    this.lastProcessedEventTime = 0;
    this.clientId = 'client_' + Math.random().toString(36).substring(2, 9);
    this.recentLocalSavedQuoteIds = new Set();
    this.recentLocalSavedAnnouncementIds = new Set();
    this.recentlyDeletedCustomerKeys = new Set(); // Track recently deleted customers to prevent realtime re-fetch race
    this.lastPackageNotifyTime = 0;

    // Silinen Teklifler Kara Listesi (Hafızadan ve Senkronizasyondan Asla Geri Gelmez)
    this.deletedQuoteIds = new Set();
    try {
      const savedDeleted = localStorage.getItem('inzar_deleted_quotes_v3');
      if (savedDeleted) {
        JSON.parse(savedDeleted).forEach(id => this.deletedQuoteIds.add(id));
      }
    } catch (e) {}

    // Silinen Müşteriler Kara Listesi (Hafızadan ve Senkronizasyondan Asla Geri Dirilmez)
    this.deletedCustomerIds = new Set();
    try {
      const savedDeletedCust = localStorage.getItem('inzar_deleted_customer_ids_v1');
      if (savedDeletedCust) {
        JSON.parse(savedDeletedCust).forEach(id => this.deletedCustomerIds.add(id));
      }
    } catch (e) {}

    // Smart Polling Diff Tracking (WebSocket kopsa bile kaçırmayan akıllı hafıza)
    this.knownAnnouncementIds = new Set();
    try {
      const savedAnnouncements = localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS);
      if (savedAnnouncements) {
        JSON.parse(savedAnnouncements).forEach(a => this.knownAnnouncementIds.add(a.id));
      }
      const storedKnown = localStorage.getItem('inzar_known_announcements_v3');
      if (storedKnown) {
        JSON.parse(storedKnown).forEach(id => this.knownAnnouncementIds.add(id));
      }
    } catch (e) {}
    this.hasInitializedAnnouncements = this.knownAnnouncementIds.size > 0;

    this.knownQuoteStatusMap = new Map();
    this.hasInitializedQuotes = false;
    try {
      const initialQuotes = this.getSavedQuotes();
      if (Array.isArray(initialQuotes) && initialQuotes.length > 0) {
        initialQuotes.forEach(q => this.knownQuoteStatusMap.set(q.id, q.status));
        this.hasInitializedQuotes = true;
      }
    } catch (e) {}

    if (this.broadcastChannel) {
      this.broadcastChannel.onmessage = (event) => {
        if (event.data?.senderId !== this.clientId) {
          if (event.data?.type === 'QUOTE_DELETED' && event.data?.payload?.quoteId) {
            const qId = event.data.payload.quoteId;
            this.deletedQuoteIds.add(qId);
            try {
              localStorage.setItem('inzar_deleted_quotes_v3', JSON.stringify([...this.deletedQuoteIds]));
            } catch (e) {}
            const current = this.getSavedQuotes();
            const filtered = current.filter(q => q.id !== qId);
            localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(filtered));
            this.notifyListeners({ type: 'QUOTES_UPDATED', payload: filtered });
            return;
          }

          if (event.data?.type === 'CUSTOMER_DELETED' && event.data?.payload?.customerId) {
            const cId = event.data.payload.customerId;
            this.deletedCustomerIds.add(cId);
            try {
              localStorage.setItem('inzar_deleted_customer_ids_v1', JSON.stringify([...this.deletedCustomerIds]));
            } catch (e) {}
            const current = this.getCustomers();
            const filtered = current.filter(c => c.id !== cId);
            localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(filtered));
            this.notifyListeners({ type: 'CUSTOMERS_UPDATED', payload: filtered });
            return;
          }

          if (event.data?.notification) {
            notificationService.notify(event.data.notification);
          }
          this.notifyListeners(event.data);
        }
      };
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key && e.key.startsWith('inzar_')) {
          this.notifyListeners({ type: 'STORAGE_CHANGE', key: e.key });
        }
      });

      this.setupFocusListeners();
    }

    // Initialize Supabase Realtime Subscriptions & Smart Heartbeat Poller
    if (this.isSupabaseReady && supabase) {
      this.initSupabaseRealtime();
      this.pullLatestFromSupabase();
      this.startHeartbeatPoller();
    }
  }

  // 📡 Supabase Realtime Doğrudan İstemciden İstemciye Canlı Yayın (50ms ultra düşük gecikme)
  sendSupabaseBroadcast(event, payload) {
    if (!this.isSupabaseReady || !this.realtimeChannel) return;
    try {
      this.realtimeChannel.send({
        type: 'broadcast',
        event,
        payload: {
          ...payload,
          senderClientId: this.clientId,
          timestamp: new Date().toISOString()
        }
      }).catch(err => {
        console.debug('[Supabase Broadcast Send Notice]:', err?.message);
      });
    } catch (e) {}
  }

  // 🔄 Pencereye veya Sekmeye Geri Dönüldüğünde Zorunlu Anlık Çekme
  setupFocusListeners() {
    if (typeof window === 'undefined') return;

    const handleFocus = () => {
      this.pullLatestFromSupabase();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        handleFocus();
      }
    });

    if (window.electronAPI?.onWindowFocus) {
      window.electronAPI.onWindowFocus(() => {
        handleFocus();
      });
    }
  }

  // 💓 30 Saniyelik Arka Plan Akıllı Kalp Atışı (Smart Polling Fallback)
  startHeartbeatPoller() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      this.pullLatestFromSupabase();
    }, 30000);
  }

  initSupabaseRealtime() {
    if (!this.isSupabaseReady || !supabase) return;

    if (this.realtimeChannel) {
      try {
        supabase.removeChannel(this.realtimeChannel);
      } catch (e) {}
    }

    try {
      const channel = supabase
        .channel('inzar_live_sync_v6', {
          config: {
            broadcast: { self: false } // Kendi fırlattığımız broadcast'i tekrar dinlemeyelim
          }
        })
        // 📢 Canlı Supabase Broadcast Dinleyicisi (Tüm şubeler & genel merkez anlık bildirim akışı)
        .on('broadcast', { event: 'app_notification' }, ({ payload }) => {
          if (!payload) return;
          if (payload.senderClientId === this.clientId) return; // Kendi mesajımızsa geç

          if (payload.notification) {
            notificationService.notify(payload.notification);
          } else if (payload.title && payload.message) {
            notificationService.notify({
              title: payload.title,
              message: payload.message,
              type: payload.type || 'info',
              sound: payload.sound || 'default',
              data: payload.data
            });
          }

          if (payload.refreshType === 'announcements') {
            this.fetchAnnouncementsFromSupabase();
          } else if (payload.refreshType === 'quotes') {
            this.fetchQuotesFromSupabase();
          } else if (payload.refreshType === 'packages') {
            this.fetchPackagesFromSupabase();
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'quotes' }, (payload) => {
          this.handleRemoteQuoteChange(payload);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'packages' }, (payload) => {
          this.handleRemotePackageChange(payload);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'currencies' }, (payload) => {
          this.handleRemoteCurrencyChange(payload);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'months_config' }, () => {
          this.fetchMonthsFromSupabase();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, (payload) => {
          this.handleRemoteAnnouncementChange(payload);
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, (payload) => {
          if (payload.new) {
            const logs = this.getAuditLogs();
            const updated = [payload.new, ...logs.filter(l => l.id !== payload.new.id)].slice(0, 100);
            localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(updated));
            this.notifyListeners({ type: 'AUDIT_LOGS_UPDATED', payload: updated });
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
          this.handleRemoteProfileChange(payload);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
          this.fetchCustomersFromSupabase();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () => {
          this.fetchAppSettingsFromSupabase();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'app_versions' }, () => {
          this.fetchAppVersionsFromSupabase();
        })
        .subscribe((status) => {
          console.log('[Supabase Realtime Status]:', status);
          if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn('[Realtime Connection Dropped, Auto-reconnecting in 3s...]');
            if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = setTimeout(() => {
              this.initSupabaseRealtime();
            }, 3000);
          }
        });

      this.realtimeChannel = channel;
    } catch (err) {
      console.error('[Supabase Realtime Init Error]:', err);
    }
  }

  getCurrentAuthUser() {
    try {
      const saved = localStorage.getItem('inzar_auth_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  }

  async pullLatestFromSupabase(user = null) {
    const activeUser = user || this.getCurrentAuthUser();
    await Promise.allSettled([
      this.fetchPackagesFromSupabase(),
      this.fetchCurrenciesFromSupabase(),
      this.fetchMonthsFromSupabase(),
      this.fetchQuotesFromSupabase(activeUser),
      this.fetchAnnouncementsFromSupabase(),
      this.fetchAuditLogsFromSupabase(),
      this.fetchProfilesFromSupabase(),
      this.fetchCustomersFromSupabase(),
      this.fetchAppSettingsFromSupabase(),
      this.fetchAppVersionsFromSupabase()
    ]);
  }

  // --- Remote Fetch Handlers ---

  async fetchPackagesFromSupabase() {
    if (!this.isSupabaseReady) return;
    try {
      const { data, error } = await supabase.from('packages').select('*');
      if (!error && data && data.length > 0) {
        const formatted = data.map(p => {
          let makkahHotels = [];
          if (Array.isArray(p.makkah_hotels) && p.makkah_hotels.length > 0) {
            makkahHotels = p.makkah_hotels.map(h => ({
              ...h,
              dateRanges: Array.isArray(h.dateRanges) ? h.dateRanges : []
            }));
          } else if (Array.isArray(p.makkah_prices?.makkahHotels) && p.makkah_prices.makkahHotels.length > 0) {
            makkahHotels = p.makkah_prices.makkahHotels.map(h => ({
              ...h,
              dateRanges: Array.isArray(h.dateRanges) ? h.dateRanges : []
            }));
          } else {
            makkahHotels = [
              {
                id: `${p.id}_makkah_1`,
                name: p.hotel_makkah || 'Mekke Oteli',
                distance: p.distance_makkah || '1000m (Servisli)',
                mealType: p.meal_makkah?.includes('Tabldot') ? 'Tabldot' : 'Açık Büfe',
                foodPriceSAR: p.makkah_prices?.food || 40,
                dateRanges: [],
                monthlyPrices: {
                  jan: { roomSAR: p.makkah_prices?.jan || 0, foodSAR: p.makkah_prices?.food || 40 },
                  feb: { roomSAR: p.makkah_prices?.feb || 0, foodSAR: p.makkah_prices?.food || 40 },
                  mar: { roomSAR: p.makkah_prices?.mar || 0, foodSAR: p.makkah_prices?.food || 40 },
                  apr: { roomSAR: p.makkah_prices?.apr || 0, foodSAR: p.makkah_prices?.food || 40 },
                  may: { roomSAR: p.makkah_prices?.may || 0, foodSAR: p.makkah_prices?.food || 40 },
                  jun: { roomSAR: p.makkah_prices?.jun || 0, foodSAR: p.makkah_prices?.food || 40 },
                  jul: { roomSAR: p.makkah_prices?.jul || 0, foodSAR: p.makkah_prices?.food || 40 },
                  aug: { roomSAR: p.makkah_prices?.aug || 0, foodSAR: p.makkah_prices?.food || 40 },
                  sep: { roomSAR: p.makkah_prices?.sep || 0, foodSAR: p.makkah_prices?.food || 40 },
                  oct: { roomSAR: p.makkah_prices?.oct || 0, foodSAR: p.makkah_prices?.food || 40 },
                  nov: { roomSAR: p.makkah_prices?.nov || 0, foodSAR: p.makkah_prices?.food || 40 },
                  dec: { roomSAR: p.makkah_prices?.dec || 0, foodSAR: p.makkah_prices?.food || 40 },
                }
              }
            ];
          }

          let madinahHotels = [];
          if (Array.isArray(p.madinah_hotels) && p.madinah_hotels.length > 0) {
            madinahHotels = p.madinah_hotels.map(h => ({
              ...h,
              dateRanges: Array.isArray(h.dateRanges) ? h.dateRanges : []
            }));
          } else if (Array.isArray(p.madinah_prices?.madinahHotels) && p.madinah_prices.madinahHotels.length > 0) {
            madinahHotels = p.madinah_prices.madinahHotels.map(h => ({
              ...h,
              dateRanges: Array.isArray(h.dateRanges) ? h.dateRanges : []
            }));
          } else {
            madinahHotels = [
              {
                id: `${p.id}_madinah_1`,
                name: p.hotel_madinah || 'Medine Oteli',
                distance: p.distance_madinah || '350m (Yürüme)',
                mealType: p.meal_madinah?.includes('Tabldot') ? 'Tabldot' : 'Açık Büfe',
                foodPriceSAR: p.madinah_prices?.food || 45,
                dateRanges: [],
                monthlyPrices: {
                  jan: { roomSAR: p.madinah_prices?.jan || 0, foodSAR: p.madinah_prices?.food || 45 },
                  feb: { roomSAR: p.madinah_prices?.feb || 0, foodSAR: p.madinah_prices?.food || 45 },
                  mar: { roomSAR: p.madinah_prices?.mar || 0, foodSAR: p.madinah_prices?.food || 45 },
                  apr: { roomSAR: p.madinah_prices?.apr || 0, foodSAR: p.madinah_prices?.food || 45 },
                  may: { roomSAR: p.madinah_prices?.may || 0, foodSAR: p.madinah_prices?.food || 45 },
                  jun: { roomSAR: p.madinah_prices?.jun || 0, foodSAR: p.madinah_prices?.food || 45 },
                  jul: { roomSAR: p.madinah_prices?.jul || 0, foodSAR: p.madinah_prices?.food || 45 },
                  aug: { roomSAR: p.madinah_prices?.aug || 0, foodSAR: p.madinah_prices?.food || 45 },
                  sep: { roomSAR: p.madinah_prices?.sep || 0, foodSAR: p.madinah_prices?.food || 45 },
                  oct: { roomSAR: p.madinah_prices?.oct || 0, foodSAR: p.madinah_prices?.food || 45 },
                  nov: { roomSAR: p.madinah_prices?.nov || 0, foodSAR: p.madinah_prices?.food || 45 },
                  dec: { roomSAR: p.madinah_prices?.dec || 0, foodSAR: p.madinah_prices?.food || 45 },
                }
              }
            ];
          }

          return {
            id: p.id,
            name: p.name,
            code: p.tag || 'STD',
            color: p.color || '#059669',
            profitMargin: Number(p.profit_margin) || 15,
            foodType: p.food_type,
            hotelMakkah: makkahHotels[0]?.name || p.hotel_makkah,
            hotelMadinah: madinahHotels[0]?.name || p.hotel_madinah,
            distanceMakkah: makkahHotels[0]?.distance || p.distance_makkah,
            distanceMadinah: madinahHotels[0]?.distance || p.distance_madinah,
            mealMakkah: makkahHotels[0]?.mealType || p.meal_makkah || 'Açık Büfe',
            mealMadinah: madinahHotels[0]?.mealType || p.meal_madinah || 'Açık Büfe',
            defaultDaysMakkah: p.default_days_makkah,
            defaultDaysMadinah: p.default_days_madinah,
            makkahFoodPriceSAR: makkahHotels[0]?.foodPriceSAR || p.makkah_prices?.food || 40,
            madinahFoodPriceSAR: madinahHotels[0]?.foodPriceSAR || p.madinah_prices?.food || 45,
            makkahHotels,
            madinahHotels,
            monthlyPrices: p.makkah_prices ? {
              jan: { makkahRoomSAR: p.makkah_prices.jan, madinahRoomSAR: p.madinah_prices?.jan, makkahFoodSAR: p.makkah_prices.food, madinahFoodSAR: p.madinah_prices?.food },
              feb: { makkahRoomSAR: p.makkah_prices.feb, madinahRoomSAR: p.madinah_prices?.feb, makkahFoodSAR: p.makkah_prices.food, madinahFoodSAR: p.madinah_prices?.food },
              mar: { makkahRoomSAR: p.makkah_prices.mar, madinahRoomSAR: p.madinah_prices?.mar, makkahFoodSAR: p.makkah_prices.food, madinahFoodSAR: p.madinah_prices?.food },
              apr: { makkahRoomSAR: p.makkah_prices.apr, madinahRoomSAR: p.madinah_prices?.apr, makkahFoodSAR: p.makkah_prices.food, madinahFoodSAR: p.madinah_prices?.food },
              may: { makkahRoomSAR: p.makkah_prices.may, madinahRoomSAR: p.madinah_prices?.may, makkahFoodSAR: p.makkah_prices.food, madinahFoodSAR: p.madinah_prices?.food },
              jun: { makkahRoomSAR: p.makkah_prices.jun, madinahRoomSAR: p.madinah_prices?.jun, makkahFoodSAR: p.makkah_prices.food, madinahFoodSAR: p.madinah_prices?.food },
              jul: { makkahRoomSAR: p.makkah_prices.jul, madinahRoomSAR: p.madinah_prices?.jul, makkahFoodSAR: p.makkah_prices.food, madinahFoodSAR: p.madinah_prices?.food },
              aug: { makkahRoomSAR: p.makkah_prices.aug, madinahRoomSAR: p.madinah_prices?.aug, makkahFoodSAR: p.makkah_prices.food, madinahFoodSAR: p.madinah_prices?.food },
              sep: { makkahRoomSAR: p.makkah_prices.sep, madinahRoomSAR: p.madinah_prices?.sep, makkahFoodSAR: p.makkah_prices.food, madinahFoodSAR: p.madinah_prices?.food },
              oct: { makkahRoomSAR: p.makkah_prices.oct, madinahRoomSAR: p.madinah_prices?.oct, makkahFoodSAR: p.makkah_prices.food, madinahFoodSAR: p.madinah_prices?.food },
              nov: { makkahRoomSAR: p.makkah_prices.nov, madinahRoomSAR: p.madinah_prices?.nov, makkahFoodSAR: p.makkah_prices.food, madinahFoodSAR: p.madinah_prices?.food },
              dec: { makkahRoomSAR: p.makkah_prices.dec, madinahRoomSAR: p.madinah_prices?.dec, makkahFoodSAR: p.makkah_prices.food, madinahFoodSAR: p.madinah_prices?.food },
            } : {},
            fixedExpenses: p.fixed_expenses || {},
            fixedExpensesList: Array.isArray(p.fixed_expenses_list) ? p.fixed_expenses_list : (p.fixedExpensesList || []),
            transfers: p.transfers || {}
          };
        });
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
    } catch (e) {
      console.warn('Supabase fetchMonthsFromSupabase error:', e);
    }
  }

  async fetchQuotesFromSupabase(user = null) {
    if (!this.isSupabaseReady) return;
    try {
      const activeUser = user || this.getCurrentAuthUser();
      const role = (activeUser?.role || '').toUpperCase();
      const isHqOrAdmin = role === 'ADMIN' || role === 'HQ_ASSISTANT';

      let query = supabase.from('quotes').select('*');

      // 🔒 Rol Bazlı Veritabanı Düzeyinde İzolasyon:
      // Normal personel yalnızca kendi oluşturduğu teklifleri veritabanından çekebilir.
      // Diğer şubelerin ve personellerin teklifleri kesinlikle istemciye indirilmez.
      if (!isHqOrAdmin && activeUser) {
        const conditions = [];
        if (activeUser.id) conditions.push(`created_by_id.eq.${activeUser.id}`);
        if (activeUser.username) conditions.push(`created_by_id.eq.${activeUser.username}`);
        if (activeUser.name) conditions.push(`created_by_name.ilike.%${activeUser.name}%`);

        if (conditions.length > 0) {
          query = query.or(conditions.join(','));
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (!error && data) {
        const formatted = data.map(q => ({
          id: q.id,
          customerName: q.customer_name,
          customerFirstName: q.first_name || (q.customer_name ? q.customer_name.split(' ')[0] : ''),
          customerLastName: q.last_name || (q.customer_name ? q.customer_name.split(' ').slice(1).join(' ') : ''),
          customerPhone: q.customer_phone,
          customerTcNo: q.tc_no || q.customer_tc_no || '',
          tcNo: q.tc_no || q.customer_tc_no || '',
          packageId: q.package_id,
          packageName: q.package_name,
          selectedMonth: q.selected_month,
          selectedMonthLabel: q.selected_month_label,
          startDate: q.start_date || q.startDate || '',
          endDate: q.end_date || q.endDate || '',
          routeOrder: q.route_order || q.routeOrder || 'makkah_first',
          routeSchedule: q.route_schedule || q.routeSchedule || null,
          selectedMakkahHotelId: q.selected_makkah_hotel_id || q.selectedMakkahHotelId || null,
          selectedMadinahHotelId: q.selected_madinah_hotel_id || q.selectedMadinahHotelId || null,
          includeMeals: q.include_meals !== undefined ? q.include_meals : true,
          includeMakkahMeals: q.include_makkah_meals !== undefined ? q.include_makkah_meals : true,
          includeMadinahMeals: q.include_madinah_meals !== undefined ? q.include_madinah_meals : true,
          isMixedRoomMode: Boolean(q.is_mixed_room_mode ?? q.isMixedRoomMode),
          mixedRooms: q.mixed_rooms || q.mixedRooms || { single: 0, double: 0, triple: 0, quad: 0 },
          mixedRoomsBreakdown: q.mixed_rooms_breakdown || q.mixedRoomsBreakdown || null,
          mixedRoomsSummary: q.mixed_rooms_summary || q.mixedRoomsSummary || null,
          makkahDays: q.makkah_days,
          madinahDays: q.madinah_days,
          paxCount: q.pax_count,
          roomMatrix: q.room_matrix,
          selectedRoomOccupancy: q.selected_room_occupancy,
          finalPriceUSD: Number(q.final_price_usd),
          finalPriceTRY: Number(q.final_price_try),
          finalPriceEUR: Number(q.final_price_eur),
          profitMarginPercent: q.profit_margin_percent !== undefined ? Number(q.profit_margin_percent) : (q.profit_margin !== undefined ? Number(q.profit_margin) : 15),
          packageProfitMargin: q.package_profit_margin !== undefined ? Number(q.package_profit_margin) : (q.profit_margin !== undefined ? Number(q.profit_margin) : 15),
          applyProfitMargin: q.apply_profit_margin !== undefined ? Boolean(q.apply_profit_margin) : true,
          currency: q.currency,
          status: q.status,
          statusLabel: q.status === 'customer_approved' ? 'Müşteri Onayladı • Merkez Onayı Bekleniyor' : q.status === 'hq_approved' || q.status === 'approved' ? 'Genel Merkez Onayladı' : q.status === 'hq_rejected' ? 'Genel Merkez Reddetti' : q.status === 'approved_revised' ? 'Onaylı & Revize' : q.status === 'rejected' ? 'Müşteri Reddetti' : q.status === 'revised' ? 'Sonradan Düzenlendi' : q.status === 'expired' ? 'Süresi Doldu (7 Gün)' : 'Müşteri Kararı Bekleniyor',
          validUntil: q.valid_until || (q.created_at ? new Date(new Date(q.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() : null),
          customerApprovedAt: q.customer_approved_at,
          customerApprovedBy: q.customer_approved_by,
          hqApprovedAt: q.hq_approved_at,
          hqApprovedBy: q.hq_approved_by,
          hqNote: (() => {
            const raw = q.hq_note;
            if (!raw) return '';
            if (typeof raw === 'string' && (raw.startsWith('{"id":') || raw.includes('"sessionToken"'))) {
              return 'Genel Merkez tarafından uygun görülmedi / revize istendi.';
            }
            return typeof raw === 'string' ? raw : (raw?.reason || raw?.note || 'Genel Merkez tarafından uygun görülmedi / revize istendi.');
          })(),
          createdById: q.created_by_id,
          createdByName: q.created_by_name,
          branch: q.branch,
          revisionCount: q.revision_count,
          transfersSelection: q.transfers_selection,
          fixedExpensesIncluded: q.fixed_expenses_included,
          notes: q.notes,
          pdfUrl: q.pdf_url || null,
          createdAt: q.created_at,
          updatedAt: q.updated_at
        }));

        // 🧠 Smart Polling Diff Detector (Teklif Değişikliklerini Kaçırmayan Akıllı Hafıza)
        if (!this.hasInitializedQuotes) {
          formatted.forEach(q => this.knownQuoteStatusMap.set(q.id, q.status));
          this.hasInitializedQuotes = true;
        } else {
          formatted.forEach(q => {
            const prevStatus = this.knownQuoteStatusMap.get(q.id);
            if (prevStatus === undefined) {
              // Yepyeni bir teklif tespit edildi
              this.knownQuoteStatusMap.set(q.id, q.status);
              if (!this.recentLocalSavedQuoteIds.has(q.id)) {
                notificationService.notify({
                  title: '📋 Yeni Umre Teklifi',
                  message: `${q.customerName || 'Misafir'} adına ${q.packageName || ''} teklifi oluşturuldu (${q.finalPriceUSD} USD • ${q.createdByName || 'Personel'})`,
                  type: 'quote',
                  subType: 'new_quote',
                  sound: 'default',
                  data: q
                });
              }
            } else if (prevStatus !== q.status) {
              // Teklifin durumu güncellendi
              this.knownQuoteStatusMap.set(q.id, q.status);
              if (q.status === 'hq_approved' || q.status === 'approved') {
                notificationService.notify({
                  title: '✓ Teklif Onaylandı',
                  message: `${q.customerName || 'Misafir'} teklifi Genel Merkez tarafından ONAYLANDI.`,
                  type: 'quote',
                  sound: 'success',
                  data: q
                });
              } else if (q.status === 'hq_rejected') {
                notificationService.notify({
                  title: '✕ Teklif Reddedildi',
                  message: `${q.customerName || 'Misafir'} teklifi Genel Merkez tarafından reddedildi.`,
                  type: 'warning',
                  sound: 'urgent',
                  data: q
                });
              } else if (q.status === 'customer_approved') {
                notificationService.notify({
                  title: '🤝 Müşteri Teklifi Kabul Etti',
                  message: `${q.customerName || 'Misafir'} teklifi kabul etti, Merkez onayı bekleniyor.`,
                  type: 'quote',
                  sound: 'success',
                  data: q
                });
              }
            }
          });
        }

        // 🛡️ Akıllı Harmanlama (Smart Merge): Silinmiş teklifleri asla dahil etme ve diriltme
        const activeFormatted = formatted.filter(q => !this.deletedQuoteIds?.has(q.id));
        const localQuotes = this.getSavedQuotes().filter(lq => !this.deletedQuoteIds?.has(lq.id));
        const remoteIds = new Set(activeFormatted.map(q => q.id));
        const unsyncedLocals = localQuotes.filter(lq => !remoteIds.has(lq.id) && !this.deletedQuoteIds?.has(lq.id));

        // SADECE son oluşturulmuş ve henüz Supabase'e ulaşmamış yerelleri gönder (silinmiş olanları ASLA tekrar yükleme)
        if (unsyncedLocals.length > 0) {
          const validLocalsToPush = unsyncedLocals.filter(lq => this.recentLocalSavedQuoteIds?.has(lq.id));
          validLocalsToPush.forEach(lq => this.pushQuoteToSupabase(lq));
        }

        const mergedQuotes = [...activeFormatted, ...unsyncedLocals].filter(q => !this.deletedQuoteIds?.has(q.id)).sort((a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0));

        localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(mergedQuotes));
        this.notifyListeners({ type: 'QUOTES_UPDATED', payload: mergedQuotes });
      }
    } catch (e) {
      console.warn('[Supabase fetchQuotes error]:', e);
    }
  }

  async fetchCustomersFromSupabase() {
    if (!this.isSupabaseReady) return;
    try {
      const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        // Filter out permanently deleted or recently deleted customers
        const filteredData = data.filter(c => {
          const cId = c.id || '';
          if (this.deletedCustomerIds?.has(cId)) return false;
          const cTc = (c.tc_no || '').replace(/\D/g, '');
          const cPhone = (c.phone || '').replace(/\D/g, '');
          const cName = (c.full_name || '').trim().toLocaleLowerCase('tr-TR');
          if (this.recentlyDeletedCustomerKeys.has(`id:${cId}`)) return false;
          if (cTc && this.recentlyDeletedCustomerKeys.has(`tc:${cTc}`)) return false;
          if (cPhone && this.recentlyDeletedCustomerKeys.has(`phone:${cPhone}`)) return false;
          if (cName && this.recentlyDeletedCustomerKeys.has(`name:${cName}`)) return false;
          return true;
        });

        const formatted = filteredData.map(c => ({
          id: c.id,
          tcNo: c.tc_no || '',
          firstName: c.first_name || '',
          lastName: c.last_name || '',
          fullName: c.full_name || `${c.first_name} ${c.last_name}`.trim(),
          phone: c.phone || '',
          createdById: c.created_by_id || null,
          createdByName: c.created_by_name || '',
          branch: c.branch || 'Merkez',
          notes: c.notes || '',
          createdAt: c.created_at,
          updatedAt: c.updated_at
        }));
        const localCustomers = this.getCustomers().filter(lc => !this.deletedCustomerIds?.has(lc.id));
        const remoteIds = new Set(formatted.map(c => c.id));
        // Only re-add locals that are genuinely active and NOT deleted
        const unsyncedLocals = localCustomers.filter(lc => {
          if (remoteIds.has(lc.id)) return false;
          if (this.deletedCustomerIds?.has(lc.id)) return false;
          if (this.recentlyDeletedCustomerKeys.has(`id:${lc.id}`)) return false;
          const lcTc = (lc.tcNo || '').replace(/\D/g, '');
          if (lcTc && this.recentlyDeletedCustomerKeys.has(`tc:${lcTc}`)) return false;
          return true;
        });

        const mergedCustomers = [...formatted, ...unsyncedLocals]
          .filter(c => !this.deletedCustomerIds?.has(c.id))
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(mergedCustomers));
        this.notifyListeners({ type: 'CUSTOMERS_UPDATED', payload: mergedCustomers });
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

        // 🧠 Smart Polling Diff Detector (Yeni Duyuruları Anında Yakalayan Akıllı Hafıza)
        if (!this.hasInitializedAnnouncements) {
          // İlk yüklemede mevcutları hafızaya al, eski duyurular için bildirim basma
          formatted.forEach(a => this.knownAnnouncementIds.add(a.id));
          this.hasInitializedAnnouncements = true;
          try {
            localStorage.setItem('inzar_known_announcements_v3', JSON.stringify([...this.knownAnnouncementIds]));
          } catch (e) {}
        } else {
          // Sonraki heartbeat kontrollerinde SADECE son 5 dakika içinde eklenmiş ve henüz bilinmeyen yeni duyuru için bildirim bas
          formatted.forEach(a => {
            if (!this.knownAnnouncementIds.has(a.id)) {
              this.knownAnnouncementIds.add(a.id);
              try {
                localStorage.setItem('inzar_known_announcements_v3', JSON.stringify([...this.knownAnnouncementIds]));
              } catch (e) {}

              const isVeryRecent = a.createdAt && (Date.now() - new Date(a.createdAt).getTime() < 5 * 60 * 1000);
              if (isVeryRecent && !this.recentLocalSavedAnnouncementIds.has(a.id)) {
                notificationService.notify({
                  title: '📢 Genel Merkez Duyurusu',
                  message: a.title,
                  type: 'announcement',
                  sound: 'urgent',
                  data: a
                });
              }
            }
          });
        }

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
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, name, role, city, branch, phone, email, avatar_image, is_active, two_factor_enabled, read_announcements, created_at, last_login');
      if (!error && data && data.length > 0) {
        const formatted = data.map(u => ({
          id: u.id,
          username: u.username || u.email?.split('@')[0],
          name: u.name,
          role: u.role,
          city: u.city,
          branch: u.branch,
          phone: u.phone,
          email: u.email,
          avatarImage: u.avatar_image,
          isActive: u.is_active,
          twoFactorEnabled: Boolean(u.two_factor_enabled),
          readAnnouncements: Array.isArray(u.read_announcements) ? u.read_announcements : [],
          createdAt: u.created_at,
          lastLogin: u.last_login
        }));
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(formatted));
        this.notifyListeners({ type: 'USERS_UPDATED', payload: formatted });
      }
    } catch (e) {}
  }

  async markAnnouncementsReadInDatabase(userId, announcementIds) {
    if (!this.isSupabaseReady || !userId) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          read_announcements: announcementIds,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      if (error) console.error('[Supabase markAnnouncementsRead error]:', error);
    } catch (err) {
      console.error('[Supabase markAnnouncementsRead exception]:', err);
    }
  }

  async fetchAppSettingsFromSupabase() {
    if (!this.isSupabaseReady) return;
    try {
      const { data, error } = await supabase.from('app_settings').select('*');
      if (!error && data && data.length > 0) {
        const storedTemplates = JSON.parse(localStorage.getItem('INZAR_WHATSAPP_TEMPLATES') || '{}');
        let hasTemplateUpdate = false;

        const allSettings = {};
        data.forEach(item => {
          allSettings[item.key] = item.value;
          localStorage.setItem(`INZAR_SETTING_${item.key}`, item.value);

          if (item.key === 'whatsapp_template' && item.value) {
            storedTemplates.quote = item.value;
            localStorage.setItem('INZAR_WHATSAPP_TEMPLATE', item.value);
            hasTemplateUpdate = true;
          } else if (item.key.startsWith('whatsapp_template_') && item.value) {
            const type = item.key.replace('whatsapp_template_', '');
            storedTemplates[type] = item.value;
            hasTemplateUpdate = true;
          }
        });

        localStorage.setItem('INZAR_APP_SETTINGS', JSON.stringify(allSettings));
        this.notifyListeners({ type: 'APP_SETTINGS_UPDATED', payload: allSettings });

        if (hasTemplateUpdate) {
          localStorage.setItem('INZAR_WHATSAPP_TEMPLATES', JSON.stringify(storedTemplates));
          this.broadcast('WHATSAPP_TEMPLATE_UPDATED', storedTemplates);
          this.notifyListeners({ type: 'WHATSAPP_TEMPLATES_UPDATED', payload: storedTemplates });
        }
      }
    } catch (e) {
      console.warn('Supabase app_settings fetch error:', e);
    }
  }

  getAppSetting(key, defaultValue = null) {
    try {
      const val = localStorage.getItem(`INZAR_SETTING_${key}`);
      if (val !== null) return val;
      const all = JSON.parse(localStorage.getItem('INZAR_APP_SETTINGS') || '{}');
      if (all[key] !== undefined) return all[key];
    } catch (e) {}
    return defaultValue;
  }

  async saveAppSetting(key, value, user = null) {
    const stringVal = typeof value === 'string' ? value : JSON.stringify(value);
    try {
      localStorage.setItem(`INZAR_SETTING_${key}`, stringVal);
      const all = JSON.parse(localStorage.getItem('INZAR_APP_SETTINGS') || '{}');
      all[key] = stringVal;
      localStorage.setItem('INZAR_APP_SETTINGS', JSON.stringify(all));
    } catch (e) {}

    this.notifyListeners({ type: 'APP_SETTINGS_UPDATED', payload: { key, value: stringVal } });
    this.broadcast('APP_SETTINGS_UPDATED', { key, value: stringVal });

    if (this.isSupabaseReady && supabase) {
      try {
        await supabase.from('app_settings').upsert({
          key,
          value: stringVal,
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Supabase app_settings save error:', err);
      }
    }
  }

  async fetchAppVersionsFromSupabase() {
    if (!this.isSupabaseReady || !supabase) return;
    try {
      const { data, error } = await supabase.from('app_versions').select('*').order('published_at', { ascending: false }).limit(5);
      if (!error && data && data.length > 0) {
        const latest = data[0];
        localStorage.setItem('INZAR_LATEST_VERSION_INFO', JSON.stringify(latest));
        this.notifyListeners({ type: 'APP_VERSION_UPDATED', payload: latest });
        this.broadcast('APP_VERSION_UPDATED', latest);
        return latest;
      }
    } catch (err) {
      console.warn('Supabase app_versions fetch error:', err);
    }
    return null;
  }

  async publishAppVersion(versionData, user = null) {
    const payload = {
      id: versionData.id || 'latest_release',
      version: versionData.version || '1.0.23',
      release_notes: versionData.releaseNotes || versionData.release_notes || '',
      download_url: versionData.downloadUrl || versionData.download_url || '',
      is_mandatory: Boolean(versionData.isMandatory || versionData.is_mandatory),
      published_by: user?.name || 'Genel Merkez Bilgi İşlem',
      published_at: new Date().toISOString()
    };

    localStorage.setItem('INZAR_LATEST_VERSION_INFO', JSON.stringify(payload));
    this.broadcast('APP_VERSION_UPDATED', payload);
    this.notifyListeners({ type: 'APP_VERSION_UPDATED', payload });

    if (this.isSupabaseReady && supabase) {
      try {
        await supabase.from('app_versions').upsert(payload);
        this.addAuditLog({
          action: 'APP_VERSION_PUBLISHED',
          user: user?.name || 'Genel Merkez',
          details: `Yeni sistem sürümü yayınlandı: v${payload.version}`,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        console.error('Supabase publish app version error:', err);
      }
    }
    return payload;
  }

  handleRemoteQuoteChange(payload) {
    if (payload?.eventType === 'DELETE') {
      const qId = payload?.old?.id || payload?.old_record?.id;
      if (qId) {
        if (!this.deletedQuoteIds) this.deletedQuoteIds = new Set();
        this.deletedQuoteIds.add(qId);
        try {
          localStorage.setItem('inzar_deleted_quotes_v3', JSON.stringify([...this.deletedQuoteIds]));
        } catch (e) {}
        this.knownQuoteStatusMap.delete(qId);
        const current = this.getSavedQuotes();
        const updated = current.filter(q => q.id !== qId);
        localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(updated));
        this.notifyListeners({ type: 'QUOTES_UPDATED', payload: updated });
      }
      return;
    }

    this.fetchQuotesFromSupabase();

    if (!payload || !payload.new) return;
    const q = payload.new;

    if (this.deletedQuoteIds?.has(q.id)) return;

    // Kendi oluşturduğumuz anlık işlemse bildirim tekrarı yapma
    if (this.recentLocalSavedQuoteIds?.has(q.id)) return;

    if (payload.eventType === 'INSERT') {
      notificationService.notify({
        title: '📋 Yeni Umre Teklifi',
        message: `${q.customer_name || 'Misafir'} adına ${q.package_name || ''} teklifi oluşturuldu (${q.final_price_usd} USD • ${q.created_by_name || 'Personel'})`,
        type: 'quote',
        subType: 'new_quote',
        sound: 'default',
        data: q
      });
    } else if (payload.eventType === 'UPDATE') {
      if (q.status === 'hq_approved' || q.status === 'approved') {
        notificationService.notify({
          title: '✓ Teklif Onaylandı',
          message: `${q.customer_name || 'Misafir'} teklifi Genel Merkez tarafından ONAYLANDI.`,
          type: 'quote',
          sound: 'success',
          data: q
        });
      } else if (q.status === 'hq_rejected') {
        notificationService.notify({
          title: '✕ Teklif Reddedildi',
          message: `${q.customer_name || 'Misafir'} teklifi Genel Merkez tarafından reddedildi.`,
          type: 'warning',
          sound: 'urgent',
          data: q
        });
      } else if (q.status === 'customer_approved') {
        notificationService.notify({
          title: '🤝 Müşteri Teklifi Kabul Etti',
          message: `${q.customer_name || 'Misafir'} teklifi kabul etti, Merkez onayı bekleniyor.`,
          type: 'quote',
          sound: 'success',
          data: q
        });
      } else if (q.status === 'revised' || q.status === 'approved_revised') {
        notificationService.notify({
          title: '✏️ Teklif Revize Edildi',
          message: `${q.customer_name || 'Misafir'} teklifinde değişiklik yapıldı (${q.final_price_usd} USD • ${q.created_by_name || 'Personel'}).`,
          type: 'quote',
          sound: 'default',
          data: q
        });
      }
    }
  }

  handleRemoteAnnouncementChange(payload) {
    this.fetchAnnouncementsFromSupabase();
    if (payload?.eventType === 'INSERT' && payload?.new) {
      const isKnown = this.knownAnnouncementIds.has(payload.new.id);
      const isRecentLocal = this.recentLocalSavedAnnouncementIds.has(payload.new.id);
      this.knownAnnouncementIds.add(payload.new.id);
      try {
        localStorage.setItem('inzar_known_announcements_v3', JSON.stringify([...this.knownAnnouncementIds]));
      } catch (e) {}

      if (!isKnown && !isRecentLocal) {
        notificationService.notify({
          title: '📢 Genel Merkez Duyurusu',
          message: payload.new.title,
          type: 'announcement',
          sound: 'urgent',
          data: payload.new
        });
      }
    }
  }

  handleRemotePackageChange(payload) {
    this.fetchPackagesFromSupabase();
    if (Date.now() - (this.lastPackageNotifyTime || 0) > 6000) {
      this.lastPackageNotifyTime = Date.now();
      notificationService.notify({
        title: '🏨 Otel & Fiyat Tarifesi Güncellendi',
        message: 'Genel Merkez otel ve fiyat tarifesinde canlı güncelleme yaptı.',
        type: 'tariff',
        sound: 'default'
      });
    }
  }

  handleRemoteProfileChange(payload) {
    this.fetchProfilesFromSupabase();
    this.notifyListeners({ type: 'PROFILES_UPDATED' });
  }

  handleRemoteCurrencyChange(payload) {
    this.fetchCurrenciesFromSupabase();
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

  broadcast(type, payload, notification = null) {
    const message = {
      type,
      payload,
      notification,
      timestamp: new Date().toISOString(),
      senderId: this.clientId
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
    this.broadcast('PACKAGES_UPDATED', packages, {
      title: '🏨 Otel & Fiyat Tarifesi Güncellendi',
      message: changeNote || 'Genel Merkez otel ve fiyat tarifesinde güncelleme yaptı.',
      type: 'tariff',
      sound: 'default'
    });

    this.sendSupabaseBroadcast('app_notification', {
      title: '🏨 Otel & Fiyat Tarifesi Güncellendi',
      message: changeNote || 'Genel Merkez otel ve fiyat tarifesinde güncelleme yaptı.',
      type: 'tariff',
      sound: 'default',
      refreshType: 'packages'
    });

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
            meal_makkah: pkg.mealMakkah || 'Açık Büfe',
            meal_madinah: pkg.mealMadinah || 'Açık Büfe',
            default_days_makkah: pkg.defaultDaysMakkah || 10,
            default_days_madinah: pkg.defaultDaysMadinah || 4,
            makkah_hotels: pkg.makkahHotels || [],
            madinah_hotels: pkg.madinahHotels || [],
            makkah_prices: {
              food: pkg.makkahFoodPriceSAR || 40,
              makkahHotels: pkg.makkahHotels || [],
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
              madinahHotels: pkg.madinahHotels || [],
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
            fixed_expenses_list: pkg.fixedExpensesList || [],
            transfers: pkg.transfers || {},
            updated_at: new Date().toISOString()
          });
        } catch (e) {
          console.error('[Supabase savePackages error]:', e);
        }
      });
    }
  }

  async deletePackage(pkgId, user = null, changeNote = '') {
    const current = this.getPackages();
    const target = current.find(p => p.id === pkgId);
    const updated = current.filter(p => p.id !== pkgId);
    localStorage.setItem(STORAGE_KEYS.PACKAGES, JSON.stringify(updated));

    const note = changeNote || `${target?.name || pkgId} paketi sistemden silindi.`;

    this.addAuditLog({
      action: 'PACKAGE_DELETED',
      user: user?.name || 'Genel Merkez',
      details: note,
      timestamp: new Date().toISOString()
    });

    this.broadcast('PACKAGES_UPDATED', updated, {
      title: '🗑️ Paket Silindi',
      message: note,
      type: 'tariff',
      sound: 'default'
    });

    this.sendSupabaseBroadcast('app_notification', {
      title: '🗑️ Paket Silindi',
      message: note,
      type: 'tariff',
      sound: 'default',
      refreshType: 'packages'
    });

    if (this.isSupabaseReady) {
      try {
        const { error } = await supabase.from('packages').delete().eq('id', pkgId);
        if (error) console.error('[Supabase deletePackage error]:', error);
      } catch (e) {
        console.error('[Supabase deletePackage exception]:', e);
      }
    }

    return updated;
  }

  getCurrencies() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENCIES);
      if (data) return JSON.parse(data);
    } catch (e) {}
    localStorage.setItem(STORAGE_KEYS.CURRENCIES, JSON.stringify(DEFAULT_CURRENCIES));
    return DEFAULT_CURRENCIES;
  }

  saveCurrencies(currencies, user = null, changeNote = '', shouldAudit = true) {
    localStorage.setItem(STORAGE_KEYS.CURRENCIES, JSON.stringify(currencies));
    if (shouldAudit) {
      this.addAuditLog({
        action: 'CURRENCY_UPDATED',
        user: user?.name || 'Genel Merkez',
        details: changeNote || `Kurlar güncellendi (USD/SAR: ${currencies.SAR_USD}, USD/TRY: ${currencies.USD_TRY})`,
        timestamp: new Date().toISOString()
      });
    }
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
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Eski hardcoded metinleri (Erken Yaz, Güz Dönemi, vb.) temizle ve Sezon Tipine çevir
          const legacyTerms = ['Tatili', 'Recep', 'Şaban', 'Erken Yaz', 'Yaz Dönemi', 'Güz Dönemi', 'Sezon Açılışı', 'Yıl Sonu', 'Standart Sezon'];
          const sanitized = parsed.map(m => {
            const hasLegacy = legacyTerms.some(term => (m.subtitle || '').includes(term));
            const cleanSeason = hasLegacy ? (m.badge || 'Standart') : (m.subtitle || m.badge || 'Standart');
            return {
              ...m,
              subtitle: cleanSeason,
              badge: m.badge === 'Standart' ? null : m.badge
            };
          });
          localStorage.setItem(STORAGE_KEYS.MONTHS, JSON.stringify(sanitized));
          return sanitized;
        }
      }
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

    // Yerel hafızaya kaydet (Smart diff poller kendi yayınladığımız duyuru için tekrar bildirim çıkarmasın)
    this.knownAnnouncementIds.add(newAnn.id);
    this.recentLocalSavedAnnouncementIds.add(newAnn.id);
    setTimeout(() => {
      this.recentLocalSavedAnnouncementIds.delete(newAnn.id);
    }, 20000);

    this.addAuditLog({
      action: 'ANNOUNCEMENT_PUBLISHED',
      user: user?.name || 'Genel Merkez',
      details: `"${newAnn.title}" duyurusu yayınlandı.`,
      timestamp: new Date().toISOString()
    });

    // 🔔 1. Duyuruyu yayınlayan Genel Merkez sorumlusunun ekranına anında onay & başarı bildirimi
    notificationService.notify({
      title: '📢 Duyuru Yayınlandı',
      message: `"${newAnn.title}" duyurusu sisteme başarıyla kaydedildi ve tüm personele iletildi.`,
      type: 'announcement',
      sound: 'success',
      force: true,
      data: newAnn
    });

    // 📡 2. Yerel sekmelere yayın
    this.broadcast('ANNOUNCEMENTS_UPDATED', updated, {
      title: '📢 Genel Merkez Duyurusu',
      message: newAnn.title,
      type: 'announcement',
      sound: 'urgent',
      data: newAnn
    });

    // 🚀 3. Supabase Realtime Broadcast ile tüm açık şube ve personellerin ekranına 50ms içinde anında fırlat
    this.sendSupabaseBroadcast('app_notification', {
      title: '📢 Genel Merkez Duyurusu',
      message: newAnn.title,
      type: 'announcement',
      sound: 'urgent',
      refreshType: 'announcements',
      data: newAnn
    });

    if (this.isSupabaseReady) {
      supabase.from('announcements').upsert({
        id: newAnn.id,
        title: newAnn.title,
        content: newAnn.content,
        author: newAnn.author,
        priority: newAnn.priority || 'normal',
        is_pinned: Boolean(newAnn.isPinned),
        created_at: newAnn.timestamp
      }).then(({ error }) => {
        if (error) console.error('Supabase announcement upsert error:', error);
      });
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
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed
            .filter(q => !this.deletedQuoteIds?.has(q.id))
            .map(q => {
            let hqNote = q.hqNote || q.hq_note || '';
            if (typeof hqNote === 'object' && hqNote !== null) {
              hqNote = hqNote.reason || hqNote.note || '';
            }
            if (typeof hqNote === 'string' && (hqNote.startsWith('{"id":') || hqNote.includes('"sessionToken"'))) {
              hqNote = 'Genel Merkez tarafından uygun görülmedi / revize istendi.';
            }
            return {
              ...q,
              hqNote
            };
          });
        }
      }
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
      updated = [quoteToSave, ...current.filter(q => q.id !== quoteToSave.id)];

      this.addAuditLog({
        action: 'QUOTE_CREATED',
        user: quote.createdByName || 'Personel',
        details: `${quote.customerName || 'Misafir'} adına ${quote.packageName} (${quote.finalPriceUSD} USD) teklifi oluşturuldu.`,
        timestamp: new Date().toISOString()
      });
    }

    // 🛡️ 1. ZORUNLU YEREL DEPOLAMA (Karanlık/Açık mod fark etmeksizin ASLA kaybolmaz)
    localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(updated));

    if (!this.recentLocalSavedQuoteIds) this.recentLocalSavedQuoteIds = new Set();
    this.recentLocalSavedQuoteIds.add(quoteToSave.id);
    setTimeout(() => {
      this.recentLocalSavedQuoteIds.delete(quoteToSave.id);
    }, 15000);

    const quoteNotifTitle = existingIndex >= 0 ? '✏️ Teklif Revize Edildi' : '📋 Yeni Umre Teklifi';
    const quoteNotifMsg = `${quoteToSave.customerName || 'Misafir'} adına ${quoteToSave.packageName || ''} teklifi ${existingIndex >= 0 ? 'revize edildi' : 'oluşturuldu'} (${quoteToSave.finalPriceUSD} USD • ${quoteToSave.createdByName || 'Personel'})`;

    this.broadcast('QUOTES_UPDATED', updated, {
      title: quoteNotifTitle,
      message: quoteNotifMsg,
      type: 'quote',
      sound: 'default',
      data: quoteToSave
    });

    this.sendSupabaseBroadcast('app_notification', {
      title: quoteNotifTitle,
      message: quoteNotifMsg,
      type: 'quote',
      sound: 'default',
      refreshType: 'quotes',
      data: quoteToSave
    });

    // 🛡️ 2. Supabase Realtime Tablosuna Kaydet/Güncelle
    this.pushQuoteToSupabase(quoteToSave);

    // 🛡️ 3. Otomatik Müşteri Kaydı (Customers Tablosuna ve Yerel Havuza)
    if (quoteToSave.customerFirstName || quoteToSave.customerLastName || quoteToSave.customerName) {
      this.saveCustomer({
        tcNo: quoteToSave.customerTcNo || quoteToSave.tcNo || '',
        firstName: quoteToSave.customerFirstName || (quoteToSave.customerName ? quoteToSave.customerName.split(' ')[0] : ''),
        lastName: quoteToSave.customerLastName || (quoteToSave.customerName ? quoteToSave.customerName.split(' ').slice(1).join(' ') : ''),
        fullName: quoteToSave.customerName || `${quoteToSave.customerFirstName || ''} ${quoteToSave.customerLastName || ''}`.trim(),
        phone: quoteToSave.customerPhone || '',
        createdById: quoteToSave.createdById,
        createdByName: quoteToSave.createdByName,
        branch: quoteToSave.branch,
        notes: quoteToSave.notes
      });
    }

    return updated;
  }

  async pushQuoteToSupabase(quoteToSave) {
    if (!this.isSupabaseReady) return;
    try {
      const nowISO = new Date().toISOString();
      const payload = {
        id: quoteToSave.id,
        customer_name: quoteToSave.customerName || `${quoteToSave.customerFirstName || ''} ${quoteToSave.customerLastName || ''}`.trim() || 'Misafir',
        first_name: quoteToSave.customerFirstName || (quoteToSave.customerName ? quoteToSave.customerName.split(' ')[0] : null),
        last_name: quoteToSave.customerLastName || (quoteToSave.customerName ? quoteToSave.customerName.split(' ').slice(1).join(' ') : null),
        customer_phone: quoteToSave.customerPhone || null,
        tc_no: quoteToSave.customerTcNo || quoteToSave.tcNo || null,
        package_id: quoteToSave.packageId || 'standart',
        package_name: quoteToSave.packageName || 'Standart Paket',
        selected_month: quoteToSave.selectedMonth || 'jan',
        selected_month_label: quoteToSave.selectedMonthLabel || '',
        start_date: quoteToSave.startDate || null,
        end_date: quoteToSave.endDate || null,
        route_order: quoteToSave.routeOrder || 'makkah_first',
        route_schedule: quoteToSave.routeSchedule || null,
        selected_makkah_hotel_id: quoteToSave.selectedMakkahHotelId || null,
        selected_madinah_hotel_id: quoteToSave.selectedMadinahHotelId || null,
        include_meals: quoteToSave.includeMeals !== undefined ? quoteToSave.includeMeals : true,
        include_makkah_meals: quoteToSave.includeMakkahMeals !== undefined ? quoteToSave.includeMakkahMeals : true,
        include_madinah_meals: quoteToSave.includeMadinahMeals !== undefined ? quoteToSave.includeMadinahMeals : true,
        is_mixed_room_mode: Boolean(quoteToSave.isMixedRoomMode),
        mixed_rooms: quoteToSave.mixedRooms || null,
        mixed_rooms_breakdown: quoteToSave.mixedRoomsBreakdown || null,
        mixed_rooms_summary: quoteToSave.mixedRoomsSummary || null,
        makkah_days: Number(quoteToSave.makkahDays) || 10,
        madinah_days: Number(quoteToSave.madinahDays) || 4,
        pax_count: Number(quoteToSave.paxCount) || 1,
        room_matrix: Array.isArray(quoteToSave.roomMatrix) ? quoteToSave.roomMatrix : [],
        selected_room_occupancy: Number(quoteToSave.selectedRoomOccupancy) || 2,
        final_price_usd: Number(quoteToSave.finalPriceUSD) || 0,
        final_price_try: Number(quoteToSave.finalPriceTRY) || 0,
        final_price_eur: Number(quoteToSave.finalPriceEUR) || 0,
        profit_margin_percent: quoteToSave.profitMarginPercent !== undefined ? Number(quoteToSave.profitMarginPercent) : 15,
        package_profit_margin: quoteToSave.packageProfitMargin !== undefined ? Number(quoteToSave.packageProfitMargin) : 15,
        apply_profit_margin: quoteToSave.applyProfitMargin !== undefined ? Boolean(quoteToSave.applyProfitMargin) : true,
        currency: quoteToSave.currency || 'USD',
        status: quoteToSave.status || 'pending',
        valid_until: quoteToSave.validUntil || (quoteToSave.createdAt ? new Date(new Date(quoteToSave.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
        customer_approved_at: quoteToSave.customerApprovedAt || null,
        customer_approved_by: quoteToSave.customerApprovedBy || null,
        hq_approved_at: quoteToSave.hqApprovedAt || null,
        hq_approved_by: quoteToSave.hqApprovedBy || null,
        hq_note: (typeof quoteToSave.hqNote === 'string' && !quoteToSave.hqNote.startsWith('{"id":')) ? quoteToSave.hqNote : null,
        created_by_id: quoteToSave.createdById || null,
        created_by_name: quoteToSave.createdByName || 'Personel',
        branch: quoteToSave.branch || 'Merkez',
        revision_count: quoteToSave.revisionCount || 0,
        transfers_selection: quoteToSave.transfersSelection || {},
        fixed_expenses_included: quoteToSave.fixedExpensesIncluded || {},
        notes: quoteToSave.notes || null,
        pdf_url: quoteToSave.pdfUrl || quoteToSave.pdf_url || null,
        created_at: quoteToSave.createdAt || nowISO,
        updated_at: quoteToSave.updatedAt || nowISO
      };

      const { error } = await supabase.from('quotes').upsert(payload);
      if (error) {
        console.error('[Supabase quote upsert error]:', error);
      }
    } catch (err) {
      console.error('[Supabase quote push exception]:', err);
    }
  }

  getCustomers() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      if (data) return JSON.parse(data);
    } catch (e) {}
    return [];
  }

  saveCustomer(customer) {
    const current = this.getCustomers();
    const cleanTc = (customer.tcNo || '').trim();
    const cleanPhone = (customer.phone || '').replace(/\D/g, '');
    const fullName = (customer.fullName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim()).toUpperCase();

    const existingIndex = current.findIndex(c => {
      if (cleanTc && c.tcNo && cleanTc === c.tcNo.trim()) return true;
      if (cleanPhone && c.phone && cleanPhone === c.phone.replace(/\D/g, '')) return true;
      if (c.fullName && c.fullName.toUpperCase() === fullName) return true;
      return false;
    });

    let updated;
    let customerToSave;

    if (existingIndex >= 0) {
      customerToSave = {
        ...current[existingIndex],
        ...customer,
        fullName,
        updatedAt: new Date().toISOString()
      };
      updated = [...current];
      updated[existingIndex] = customerToSave;
    } else {
      customerToSave = {
        ...customer,
        id: customer.id || 'CUST-' + Date.now(),
        fullName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      updated = [customerToSave, ...current];
    }

    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updated));
    this.broadcast('CUSTOMERS_UPDATED', updated);

    if (this.isSupabaseReady) {
      supabase.from('customers').upsert({
        id: customerToSave.id,
        tc_no: customerToSave.tcNo || null,
        first_name: customerToSave.firstName || '',
        last_name: customerToSave.lastName || '',
        full_name: customerToSave.fullName || '',
        phone: customerToSave.phone || null,
        created_by_id: customerToSave.createdById || null,
        created_by_name: customerToSave.createdByName || '',
        branch: customerToSave.branch || 'Merkez',
        notes: customerToSave.notes || null,
        created_at: customerToSave.createdAt,
        updated_at: customerToSave.updatedAt
      }).then(({ error }) => {
        if (error) console.error('Supabase customer upsert error:', error);
      });
    }

    return updated;
  }

  async deleteCustomer(targetInfo, user = null, deleteQuotes = true) {
    const current = this.getCustomers();
    
    // targetInfo can be a string customerId or an object { id, tcNo, phone, fullName }
    let targetId = typeof targetInfo === 'string' ? targetInfo : targetInfo?.id;
    let targetTc = typeof targetInfo === 'object' ? (targetInfo?.tcNo || '').replace(/\D/g, '') : '';
    let targetPhone = typeof targetInfo === 'object' ? (targetInfo?.phone || '').replace(/\D/g, '') : '';
    let targetName = typeof targetInfo === 'object' ? (targetInfo?.fullName || `${targetInfo?.firstName || ''} ${targetInfo?.lastName || ''}`).trim() : '';

    // If targetId is provided, enrich from current list if missing
    if (targetId && (!targetTc || !targetPhone || !targetName)) {
      const found = current.find(c => c.id === targetId);
      if (found) {
        if (!targetTc) targetTc = (found.tcNo || '').replace(/\D/g, '');
        if (!targetPhone) targetPhone = (found.phone || '').replace(/\D/g, '');
        if (!targetName) targetName = (found.fullName || `${found.firstName || ''} ${found.lastName || ''}`).trim();
      }
    }

    // Match all duplicate/same customer records in local pool
    const updated = current.filter(c => {
      if (targetId && c.id === targetId) return false;
      const cTc = (c.tcNo || '').replace(/\D/g, '');
      const cPhone = (c.phone || '').replace(/\D/g, '');
      const cName = (c.fullName || `${c.firstName || ''} ${c.lastName || ''}`).trim().toLocaleLowerCase('tr-TR');

      if (targetTc && cTc && targetTc === cTc) return false;
      if (targetPhone && cPhone && (targetPhone.endsWith(cPhone) || cPhone.endsWith(targetPhone))) return false;
      if (targetName && cName && targetName.toLocaleLowerCase('tr-TR') === cName) return false;
      return true;
    });

    // Track deleted customer keys to prevent realtime re-fetch race condition
    if (targetId) {
      this.recentlyDeletedCustomerKeys.add(`id:${targetId}`);
      this.deletedCustomerIds.add(targetId);
      try {
        localStorage.setItem('inzar_deleted_customer_ids_v1', JSON.stringify([...this.deletedCustomerIds]));
      } catch (e) {}
    }
    if (targetTc) this.recentlyDeletedCustomerKeys.add(`tc:${targetTc}`);
    if (targetPhone) this.recentlyDeletedCustomerKeys.add(`phone:${targetPhone}`);
    if (targetName) this.recentlyDeletedCustomerKeys.add(`name:${targetName.toLocaleLowerCase('tr-TR')}`);
    // Auto-cleanup after 15 seconds (enough time for Supabase delete to propagate)
    setTimeout(() => {
      if (targetId) this.recentlyDeletedCustomerKeys.delete(`id:${targetId}`);
      if (targetTc) this.recentlyDeletedCustomerKeys.delete(`tc:${targetTc}`);
      if (targetPhone) this.recentlyDeletedCustomerKeys.delete(`phone:${targetPhone}`);
      if (targetName) this.recentlyDeletedCustomerKeys.delete(`name:${targetName.toLocaleLowerCase('tr-TR')}`);
    }, 15000);

    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updated));
    this.addAuditLog({
      action: 'CUSTOMER_DELETED',
      user: user?.name || 'Personel',
      details: `${targetName || targetId} misafir kaydı veritabanından kalıcı olarak silindi.`,
      timestamp: new Date().toISOString()
    });
    this.broadcast('CUSTOMERS_UPDATED', updated);
    if (targetId) {
      this.broadcast('CUSTOMER_DELETED', { customerId: targetId });
    }
    this.notifyListeners({ type: 'CUSTOMERS_UPDATED', payload: updated });

    // Delete customer's past quotes if requested (so the customer doesn't reappear in history)
    if (deleteQuotes) {
      const currentQuotes = this.getSavedQuotes();
      const updatedQuotes = currentQuotes.filter(q => {
        const qTc = (q.tcNo || q.customerTcNo || '').replace(/\D/g, '');
        const qPhone = (q.customerPhone || '').replace(/\D/g, '');
        const qName = (q.customerName || `${q.firstName || ''} ${q.lastName || ''}`).trim().toLocaleLowerCase('tr-TR');

        if (targetTc && qTc && targetTc === qTc) return false;
        if (targetPhone && qPhone && (targetPhone.endsWith(qPhone) || qPhone.endsWith(targetPhone))) return false;
        if (targetName && qName && targetName.toLocaleLowerCase('tr-TR') === qName) return false;
        return true;
      });

      localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(updatedQuotes));
      this.broadcast('QUOTES_UPDATED', updatedQuotes);
      this.notifyListeners({ type: 'QUOTES_UPDATED', payload: updatedQuotes });

      if (this.isSupabaseReady) {
        try {
          if (targetTc) {
            await supabase.from('quotes').delete().eq('tc_no', targetTc);
          }
          if (targetPhone) {
            await supabase.from('quotes').delete().eq('customer_phone', targetPhone);
          }
          if (targetName) {
            await supabase.from('quotes').delete().ilike('customer_name', targetName);
          }
        } catch (e) {
          console.warn('Supabase customer quotes delete error:', e);
        }
      }
    }

    if (this.isSupabaseReady) {
      try {
        if (targetId) {
          await supabase.from('customers').delete().eq('id', targetId);
        }
        if (targetTc) {
          await supabase.from('customers').delete().eq('tc_no', targetTc);
        }
        if (targetPhone) {
          await supabase.from('customers').delete().eq('phone', targetPhone);
        }
        if (targetName) {
          await supabase.from('customers').delete().ilike('full_name', targetName);
        }
      } catch (err) {
        console.error('Supabase customer delete error:', err);
      }
    }

    return updated;
  }

  async searchCustomersLive({ name = '', tcNo = '', phone = '' }) {
    const cleanTc = (tcNo || '').replace(/\D/g, '').trim();
    const rawPhone = (phone || '').replace(/\D/g, '').trim();
    const searchName = (name || '').trim();

    // 1. Yerel havuzda ara
    const localCustomers = this.getCustomers();
    let matchedCustomer = localCustomers.find(c => {
      const cTc = (c.tcNo || '').replace(/\D/g, '').trim();
      const cPhone = (c.phone || '').replace(/\D/g, '').trim();
      const cName = (c.fullName || `${c.firstName || ''} ${c.lastName || ''}`).toLocaleLowerCase('tr-TR').trim();
      if (cleanTc && cTc && cleanTc === cTc) return true;
      if (rawPhone && cPhone && (rawPhone.endsWith(cPhone) || cPhone.endsWith(rawPhone))) return true;
      if (searchName && cName.includes(searchName.toLocaleLowerCase('tr-TR'))) return true;
      return false;
    });

    let matchedQuotes = [];
    const localQuotes = this.getSavedQuotes();
    matchedQuotes = localQuotes.filter(q => {
      const qTc = (q.customerTcNo || q.tcNo || '').replace(/\D/g, '').trim();
      const qPhone = (q.customerPhone || '').replace(/\D/g, '').trim();
      const qName = (q.customerName || '').toLocaleLowerCase('tr-TR').trim();
      if (cleanTc && qTc && cleanTc === qTc) return true;
      if (rawPhone && qPhone && (rawPhone.endsWith(qPhone) || qPhone.endsWith(rawPhone))) return true;
      if (searchName && qName.includes(searchName.toLocaleLowerCase('tr-TR'))) return true;
      return false;
    });

    // 2. Canlı Supabase Sorgulaması (Yerelde bulunamadıysa veya eksik geçmiş varsa canlı veritabanından çek)
    if (this.isSupabaseReady) {
      try {
        const orConds = [];
        if (cleanTc) orConds.push(`tc_no.eq.${cleanTc}`);
        if (rawPhone) {
          orConds.push(`phone.eq.${rawPhone}`);
          if (rawPhone.length >= 7) {
            orConds.push(`phone.ilike.%${rawPhone.slice(-7)}%`);
          }
        }
        if (searchName && searchName.length >= 2) {
          orConds.push(`full_name.ilike.%${searchName}%`);
        }

        if (orConds.length > 0) {
          const { data: dbCusts, error: custErr } = await supabase
            .from('customers')
            .select('*')
            .or(orConds.join(','))
            .limit(10);

          if (!custErr && Array.isArray(dbCusts) && dbCusts.length > 0) {
            const bestDbCust = dbCusts[0];
            const formatted = {
              id: bestDbCust.id,
              tcNo: bestDbCust.tc_no || '',
              firstName: bestDbCust.first_name || '',
              lastName: bestDbCust.last_name || '',
              fullName: bestDbCust.full_name || `${bestDbCust.first_name || ''} ${bestDbCust.last_name || ''}`.trim(),
              phone: bestDbCust.phone || '',
              createdById: bestDbCust.created_by_id,
              createdByName: bestDbCust.created_by_name,
              branch: bestDbCust.branch || 'Merkez',
              notes: bestDbCust.notes || '',
              createdAt: bestDbCust.created_at,
              updatedAt: bestDbCust.updated_at
            };

            if (!matchedCustomer) {
              matchedCustomer = formatted;
            }
            this.saveCustomer(formatted);
          }

          // Canlı Geçmiş Teklifler Sorgusu
          const quoteOrConds = [];
          if (cleanTc) quoteOrConds.push(`tc_no.eq.${cleanTc}`);
          if (rawPhone) quoteOrConds.push(`customer_phone.ilike.%${rawPhone.slice(-7)}%`);
          if (searchName && searchName.length >= 3) quoteOrConds.push(`customer_name.ilike.%${searchName}%`);

          if (quoteOrConds.length > 0) {
            const { data: dbQuotes, error: qErr } = await supabase
              .from('quotes')
              .select('*')
              .or(quoteOrConds.join(','))
              .order('created_at', { ascending: false })
              .limit(20);

            if (!qErr && Array.isArray(dbQuotes) && dbQuotes.length > 0) {
              const formattedDbQuotes = dbQuotes.map(q => ({
                id: q.id,
                customerName: q.customer_name,
                customerFirstName: q.first_name || (q.customer_name ? q.customer_name.split(' ')[0] : ''),
                customerLastName: q.last_name || (q.customer_name ? q.customer_name.split(' ').slice(1).join(' ') : ''),
                customerPhone: q.customer_phone,
                customerTcNo: q.tc_no || '',
                tcNo: q.tc_no || '',
                packageName: q.package_name,
                finalPriceUSD: Number(q.final_price_usd) || 0,
                status: q.status,
                pdfUrl: q.pdf_url || null,
                createdAt: q.created_at,
                createdByName: q.created_by_name,
                branch: q.branch
              }));

              const existingIds = new Set(matchedQuotes.map(mq => mq.id));
              formattedDbQuotes.forEach(fq => {
                if (!existingIds.has(fq.id)) {
                  matchedQuotes.push(fq);
                  existingIds.add(fq.id);
                }
              });
            }
          }
        }
      } catch (err) {
        console.warn('[searchCustomersLive error]:', err);
      }
    }

    return {
      customer: matchedCustomer || null,
      quotes: matchedQuotes || []
    };
  }

  updateQuoteStatus(quoteId, newStatus, user = null, note = '') {
    const current = this.getSavedQuotes();
    const nowISO = new Date().toISOString();

    // 🛡️ Sanitize note: ensure it is always a clean string, NEVER an object or JSON user dump
    let cleanNote = '';
    if (typeof note === 'string') {
      cleanNote = note.trim();
      if (cleanNote.startsWith('{"id":') || cleanNote.includes('"sessionToken"')) {
        cleanNote = 'Genel Merkez tarafından uygun görülmedi / revize istendi.';
      }
    } else if (typeof note === 'object' && note !== null) {
      cleanNote = typeof note.reason === 'string' ? note.reason : (typeof note.note === 'string' ? note.note : '');
    }

    if (newStatus === 'hq_rejected' && !cleanNote) {
      cleanNote = 'Genel Merkez tarafından uygun görülmedi / revize istendi.';
    }

    const getStatusLabel = (s) => {
      switch(s) {
        case 'customer_approved': return 'Müşteri Onayladı • Merkez Onayı Bekleniyor';
        case 'hq_approved': return 'Genel Merkez Onayladı';
        case 'hq_rejected': return 'Genel Merkez Reddetti';
        case 'approved': return 'Genel Merkez Onayladı';
        case 'rejected': return 'Müşteri Reddetti';
        case 'revised': return 'Sonradan Düzenlendi';
        case 'approved_revised': return 'Onaylı & Revize';
        case 'expired': return 'Süresi Doldu (7 Gün)';
        default: return 'Müşteri Kararı Bekleniyor';
      }
    };

    const updated = current.map(q => {
      if (q.id === quoteId) {
        return {
          ...q,
          status: newStatus,
          statusLabel: getStatusLabel(newStatus),
          customerApprovedAt: newStatus === 'customer_approved' ? nowISO : q.customerApprovedAt,
          customerApprovedBy: newStatus === 'customer_approved' ? (user?.name || 'Personel') : q.customerApprovedBy,
          hqApprovedAt: (newStatus === 'hq_approved' || newStatus === 'approved') ? nowISO : (newStatus === 'hq_rejected' ? nowISO : q.hqApprovedAt),
          hqApprovedBy: (newStatus === 'hq_approved' || newStatus === 'approved' || newStatus === 'hq_rejected') ? (user?.name || 'Genel Merkez') : q.hqApprovedBy,
          hqNote: (newStatus === 'hq_approved' || newStatus === 'hq_rejected') ? (cleanNote || q.hqNote || '') : (q.hqNote || ''),
          statusNote: cleanNote || q.statusNote || '',
          updatedAt: nowISO
        };
      }
      return q;
    });

    localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(updated));
    const target = current.find(q => q.id === quoteId);
    this.addAuditLog({
      action: newStatus === 'customer_approved' ? 'QUOTE_CUSTOMER_APPROVED' : newStatus === 'hq_approved' ? 'QUOTE_HQ_APPROVED' : newStatus === 'hq_rejected' ? 'QUOTE_HQ_REJECTED' : 'QUOTE_STATUS_CHANGED',
      user: user?.name || 'Personel',
      details: `${target?.customerName || 'Misafir'} adına teklif durumu: ${getStatusLabel(newStatus).toUpperCase()} olarak güncellendi.${cleanNote ? ` (Merkez Notu: ${cleanNote})` : ''}`,
      timestamp: nowISO
    });

    const isApprove = newStatus === 'hq_approved' || newStatus === 'approved';
    const isReject = newStatus === 'hq_rejected';
    const isCustApprove = newStatus === 'customer_approved';

    const statusNotifTitle = isApprove ? '✓ Teklif Onaylandı' : isReject ? '✕ Teklif Reddedildi' : isCustApprove ? '🤝 Müşteri Teklifi Kabul Etti' : '📋 Teklif Durumu Güncellendi';
    const statusNotifMsg = `${target?.customerName || 'Misafir'} teklifinin durumu "${getStatusLabel(newStatus)}" olarak güncellendi.`;
    const statusNotifType = isApprove || isCustApprove ? 'quote' : isReject ? 'warning' : 'info';
    const statusNotifSound = isApprove || isCustApprove ? 'success' : isReject ? 'urgent' : 'default';

    this.broadcast('QUOTES_UPDATED', updated, {
      title: statusNotifTitle,
      message: statusNotifMsg,
      type: statusNotifType,
      sound: statusNotifSound,
      data: target
    });

    this.sendSupabaseBroadcast('app_notification', {
      title: statusNotifTitle,
      message: statusNotifMsg,
      type: statusNotifType,
      sound: statusNotifSound,
      refreshType: 'quotes',
      data: target
    });

    if (this.isSupabaseReady) {
      const updatePayload = {
        status: newStatus,
        updated_at: nowISO
      };
      if (newStatus === 'customer_approved') {
        updatePayload.customer_approved_at = nowISO;
        updatePayload.customer_approved_by = user?.name || 'Personel';
      }
      if (newStatus === 'hq_approved' || newStatus === 'approved' || newStatus === 'hq_rejected') {
        updatePayload.hq_approved_at = nowISO;
        updatePayload.hq_approved_by = user?.name || 'Genel Merkez';
        if (cleanNote) updatePayload.hq_note = cleanNote;
      }

      supabase.from('quotes').update(updatePayload).eq('id', quoteId).then(({ error }) => {
        if (error) console.error('[Supabase updateQuoteStatus error]:', error);
      });
    }

    return updated;
  }

  deleteQuote(quoteId, user = null) {
    if (!quoteId) return [];

    // 1. Silinen ID'yi kara listeye al ve kalıcı yap (ASLA geri gelmez)
    if (!this.deletedQuoteIds) this.deletedQuoteIds = new Set();
    this.deletedQuoteIds.add(quoteId);
    try {
      localStorage.setItem('inzar_deleted_quotes_v3', JSON.stringify([...this.deletedQuoteIds]));
    } catch (e) {}

    // 2. Durum takip haritasından çıkar (yanlış bildirim gitmesin)
    this.knownQuoteStatusMap.delete(quoteId);

    // 3. Yerel depolamadan çıkar
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

    // 4. Tüm sekmelere ve dinleyicilere yayınla
    this.broadcast('QUOTES_UPDATED', updated);
    this.broadcast('QUOTE_DELETED', { quoteId });
    this.notifyListeners({ type: 'QUOTES_UPDATED', payload: updated });

    // 5. Supabase veritabanından kalıcı olarak sil
    if (this.isSupabaseReady) {
      supabase.from('quotes').delete().eq('id', quoteId).then(({ error }) => {
        if (error) console.error('[Supabase deleteQuote error]:', error);
      });
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

  getUsers() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      if (data) return JSON.parse(data);
    } catch (e) {}
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  }

  saveUsers(users) {
    const safeUsersForStorage = (users || []).map(u => {
      const copy = { ...u };
      delete copy.twoFactorSecret;
      delete copy.twoFactorBackupCodes;
      return copy;
    });
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(safeUsersForStorage));
    this.broadcast('USERS_UPDATED', safeUsersForStorage);

    if (this.isSupabaseReady) {
      users.forEach(async (u) => {
        try {
          const profilePayload = {
            id: (u.id && u.id.includes('-')) ? u.id : undefined,
            username: u.username,
            name: u.name,
            role: u.role || 'STAFF',
            city: u.city || 'İstanbul',
            branch: u.branch || 'Merkez',
            phone: u.phone || '',
            email: u.email || `${u.username}@inzarturizm.com`,
            avatar_image: u.avatarImage || u.avatar || '',
            is_active: u.isActive !== false,
            two_factor_enabled: Boolean(u.twoFactorEnabled),
            updated_at: new Date().toISOString()
          };
          if (u.password) {
            profilePayload.password = u.password;
          }
          if (u.twoFactorSecret !== undefined) {
            profilePayload.two_factor_secret = u.twoFactorSecret;
          }
          if (u.twoFactorBackupCodes !== undefined) {
            profilePayload.two_factor_backup_codes = Array.isArray(u.twoFactorBackupCodes) ? u.twoFactorBackupCodes : [];
          }
          await supabase.from('profiles').upsert(profilePayload, { onConflict: 'username' });
        } catch (err) {
          console.error('Supabase profile save error:', err);
        }
      });
    }
  }

  async deleteUser(staffId, username = '', email = '') {
    const current = this.getUsers();
    const updated = current.filter(u => u.id !== staffId && (username ? u.username !== username : true));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated));
    this.broadcast('USERS_UPDATED', updated);

    if (this.isSupabaseReady) {
      try {
        if (staffId && staffId.includes('-')) {
          await supabase.from('profiles').delete().eq('id', staffId);
        }
        if (username) {
          await supabase.from('profiles').delete().eq('username', username);
        }
        if (email) {
          await supabase.from('profiles').delete().eq('email', email);
        }
      } catch (err) {
        console.error('Supabase profile deletion error:', err);
      }
    }
    return updated;
  }

  async markAnnouncementsReadInDatabase(userId, announcementIds) {
    if (!userId) return;
    try {
      // 1. Yerel kullanıcı profilini güncelle
      const users = this.getUsers();
      const userIndex = users.findIndex(u => u.id === userId || u.username === userId);
      if (userIndex >= 0) {
        const existing = Array.isArray(users[userIndex].readAnnouncements) ? users[userIndex].readAnnouncements : [];
        const merged = Array.from(new Set([...existing, ...announcementIds]));
        users[userIndex].readAnnouncements = merged;
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        this.notifyListeners({ type: 'USERS_UPDATED', payload: users });
      }

      // 2. Supabase profiles tablosunda read_announcements kolonunu güncelle
      if (this.isSupabaseReady) {
        const isUUID = typeof userId === 'string' && userId.includes('-');
        let query = supabase.from('profiles').update({
          read_announcements: announcementIds,
          updated_at: new Date().toISOString()
        });

        if (isUUID) {
          query = query.eq('id', userId);
        } else {
          query = query.eq('username', userId);
        }
        await query;
      }
    } catch (err) {
      console.error('Failed to sync read announcements to Supabase:', err);
    }
  }

  getWhatsAppTemplate(type = 'quote') {
    try {
      const allTemplates = JSON.parse(localStorage.getItem('INZAR_WHATSAPP_TEMPLATES') || '{}');
      if (allTemplates && allTemplates[type]) {
        return allTemplates[type];
      }
      // Backward compatibility for legacy single template
      if (type === 'quote') {
        const legacy = localStorage.getItem('INZAR_WHATSAPP_TEMPLATE');
        if (legacy) return legacy;
      }
    } catch (e) {}

    const defaults = {
      quote: `*İNZAR TURİZM - UMRE FİYAT TEKLİFİ* 🕋

Sayın *{MUSTERI_ADI}*, danışmış olduğunuz Umre programı detayları ve özel fiyat teklifiniz hazırlanmıştır.

Resmi teklif mektubunuz ve detaylı fiyat dökümünüz ekteki PDF belgesinde yer almaktadır.

*Paket:* {PAKET_ADI}
*Mekke Oteli:* {MEKKE_OTELI} ({MEKKE_GECE} Gece)
*Medine Oteli:* {MEDINE_OTELI} ({MEDINE_GECE} Gece)
*Toplam Süre:* {TOPLAM_GUN} Gün
*Kişi Başı Teklif:* *{FIYAT_USD} USD* (~{FIYAT_TL} ₺)

*Temsilci:* {TEMSILCI}

Hayırlı ve bereketli ibadetler dileriz.`,

      hq_approved: `*İNZAR TURİZM GENEL MERKEZ ONAY BİLDİRİMİ* 🕋✨

Sayın *{MUSTERI_ADI}*,

Temsilciniz *{TEMSILCI}* tarafından hazırlanan *{PAKET_ADI}* Umre teklifiniz ({TEKLIF_NO}) Genel Merkezimiz tarafından *RESMİ OLARAK ONAYLANMIŞTIR*.

📋 *Onaylanan Program Özeti:*
• *Paket:* {PAKET_ADI}
• *Kişi Sayısı:* {KISI_SAYISI} Kişi
• *Toplam Süre:* {TOPLAM_GUN} Gün ({MEKKE_GECE} Gece Mekke, {MEDINE_GECE} Gece Medine)
• *Mekke Oteli:* {MEKKE_OTELI}
• *Medine Oteli:* {MEDINE_OTELI}
• *Toplam Bedel:* *{FIYAT_USD} USD* (~{FIYAT_TL} ₺)

Resmi teklif mektubunuz ve detaylı fiyat dökümünüz ekteki PDF belgesinde yer almaktadır.

Umre kaydınız ve vize/otel işlemleriniz resmen başlatılmıştır. Hayırlı ve bereketli ibadetler dileriz.

📍 *İnzar Turizm Genel Merkez*
🌐 inzar.com.tr`,

      hq_rejected: `*İNZAR TURİZM BİLGİLENDİRME* 🕋

Sayın *{MUSTERI_ADI}*,

*{PAKET_ADI}* Umre programı talebiniz ({TEKLIF_NO}) Genel Merkezimiz tarafından incelenmiş olup mevcut kontenjan ve operasyonel şartlar doğrultusunda bu haliyle onaylanamamıştır.{MERKEZ_NOTU}

Temsilciniz *{TEMSILCI}*, size en uygun alternatif tarih ve paket seçenekleriyle en kısa sürede irtibata geçecektir.

Anlayışınız için teşekkür eder, hayırlı günler dileriz.

📍 *İnzar Turizm Genel Merkez*
🌐 inzar.com.tr`,

      rejected: `*İNZAR TURİZM - BİLGİLENDİRME* 🕋

Sayın *{MUSTERI_ADI}*,

*{PAKET_ADI}* Umre teklifiniz ({TEKLIF_NO}) talebiniz doğrultusunda iptal edilmiş olarak kaydedilmiştir.

Farklı bir tarih veya program planlamak isterseniz temsilciniz *{TEMSILCI}* ile dilediğiniz zaman iletişime geçebilirsiniz.

Hayırlı günler dileriz.

📍 *İnzar Turizm*\n🌐 inzar.com.tr`
    };

    return defaults[type] || defaults.quote;
  }

  getAllWhatsAppTemplates() {
    return {
      quote: this.getWhatsAppTemplate('quote'),
      hq_approved: this.getWhatsAppTemplate('hq_approved'),
      hq_rejected: this.getWhatsAppTemplate('hq_rejected'),
      rejected: this.getWhatsAppTemplate('rejected')
    };
  }

  saveWhatsAppTemplate(type, template, user = null) {
    try {
      const allTemplates = JSON.parse(localStorage.getItem('INZAR_WHATSAPP_TEMPLATES') || '{}');
      if (typeof type === 'object') {
        Object.assign(allTemplates, type);
      } else {
        allTemplates[type] = template;
      }
      localStorage.setItem('INZAR_WHATSAPP_TEMPLATES', JSON.stringify(allTemplates));
      if (typeof type === 'string' && type === 'quote') {
        localStorage.setItem('INZAR_WHATSAPP_TEMPLATE', template);
      }
    } catch (e) {}

    this.addAuditLog({
      action: 'WHATSAPP_TEMPLATE_UPDATED',
      user: user?.name || 'Genel Merkez',
      details: `WhatsApp ${type} mesaj şablonu güncellendi.`,
      timestamp: new Date().toISOString()
    });
    this.broadcast('WHATSAPP_TEMPLATE_UPDATED', { type, template });

    if (this.isSupabaseReady) {
      supabase.from('app_settings').upsert({
        key: `whatsapp_template_${type}`,
        value: typeof template === 'string' ? template : JSON.stringify(template),
        updated_at: new Date().toISOString()
      }).then(({ error }) => {
        if (error) console.error('Supabase whatsapp template upsert error:', error);
      });
    }

    return template;
  }

  saveAsDefaultWhatsAppTemplate(type, template, user = null) {
    try {
      const customDefaults = JSON.parse(localStorage.getItem('INZAR_WHATSAPP_CUSTOM_DEFAULTS') || '{}');
      if (typeof type === 'object') {
        Object.assign(customDefaults, type);
      } else {
        customDefaults[type] = template;
      }
      localStorage.setItem('INZAR_WHATSAPP_CUSTOM_DEFAULTS', JSON.stringify(customDefaults));
    } catch (e) {}

    this.saveWhatsAppTemplate(type, template, user);

    this.addAuditLog({
      action: 'WHATSAPP_DEFAULT_TEMPLATE_SAVED',
      user: user?.name || 'Genel Merkez',
      details: `WhatsApp ${type} şablonu yeni kurumsal varsayılan olarak kaydedildi.`,
      timestamp: new Date().toISOString()
    });

    if (this.isSupabaseReady) {
      supabase.from('app_settings').upsert({
        key: `whatsapp_default_${type}`,
        value: typeof template === 'string' ? template : JSON.stringify(template),
        updated_at: new Date().toISOString()
      }).then(({ error }) => {
        if (error) console.error('Supabase default template upsert error:', error);
      });
    }

    return template;
  }

  resetWhatsAppTemplateToFactory(type, user = null) {
    try {
      const allTemplates = JSON.parse(localStorage.getItem('INZAR_WHATSAPP_TEMPLATES') || '{}');
      const customDefaults = JSON.parse(localStorage.getItem('INZAR_WHATSAPP_CUSTOM_DEFAULTS') || '{}');
      delete allTemplates[type];
      delete customDefaults[type];
      localStorage.setItem('INZAR_WHATSAPP_TEMPLATES', JSON.stringify(allTemplates));
      localStorage.setItem('INZAR_WHATSAPP_CUSTOM_DEFAULTS', JSON.stringify(customDefaults));
      if (type === 'quote') {
        localStorage.removeItem('INZAR_WHATSAPP_TEMPLATE');
      }
    } catch (e) {}

    this.addAuditLog({
      action: 'WHATSAPP_TEMPLATE_FACTORY_RESET',
      user: user?.name || 'Genel Merkez',
      details: `WhatsApp ${type} şablonu fabrika ayarlarına sıfırlandı.`,
      timestamp: new Date().toISOString()
    });

    if (this.isSupabaseReady) {
      supabase.from('app_settings').delete().in('key', [`whatsapp_template_${type}`, `whatsapp_default_${type}`]).then(({ error }) => {
        if (error) console.error('Supabase reset template delete error:', error);
      });
    }

    return this.getWhatsAppTemplate(type);
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
