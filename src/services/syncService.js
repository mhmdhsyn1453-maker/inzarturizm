// İnzar Turizm - Supabase Realtime & Hot-Reload Senkronizasyon Motoru
import { DEFAULT_PACKAGES, DEFAULT_CURRENCIES, DEFAULT_USERS, DEFAULT_MONTHS, DEFAULT_ANNOUNCEMENTS } from '../data/defaultTariffData';
import { supabase, isSupabaseConfigured } from './supabaseClient';

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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () => {
          this.fetchAppSettingsFromSupabase();
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
      this.fetchProfilesFromSupabase(),
      this.fetchCustomersFromSupabase(),
      this.fetchAppSettingsFromSupabase()
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
          currency: q.currency,
          status: q.status,
          statusLabel: q.status === 'customer_approved' ? 'Müşteri Onayladı • Merkez Onayı Bekleniyor' : q.status === 'hq_approved' || q.status === 'approved' ? 'Genel Merkez Onayladı' : q.status === 'hq_rejected' ? 'Genel Merkez Reddetti' : q.status === 'approved_revised' ? 'Onaylı & Revize' : q.status === 'rejected' ? 'Müşteri Reddetti' : q.status === 'revised' ? 'Sonradan Düzenlendi' : q.status === 'expired' ? 'Süresi Doldu (7 Gün)' : 'Müşteri Kararı Bekleniyor',
          validUntil: q.valid_until || (q.created_at ? new Date(new Date(q.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() : null),
          customerApprovedAt: q.customer_approved_at,
          customerApprovedBy: q.customer_approved_by,
          hqApprovedAt: q.hq_approved_at,
          hqApprovedBy: q.hq_approved_by,
          hqNote: q.hq_note,
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

  async fetchCustomersFromSupabase() {
    if (!this.isSupabaseReady) return;
    try {
      const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        const formatted = data.map(c => ({
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
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(formatted));
        this.notifyListeners({ type: 'CUSTOMERS_UPDATED', payload: formatted });
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
          username: u.username || u.email?.split('@')[0],
          password: u.password || '123',
          name: u.name,
          role: u.role,
          city: u.city,
          branch: u.branch,
          phone: u.phone,
          email: u.email,
          avatarImage: u.avatar_image,
          isActive: u.is_active,
          twoFactorEnabled: Boolean(u.two_factor_enabled),
          twoFactorSecret: u.two_factor_secret || null,
          twoFactorBackupCodes: Array.isArray(u.two_factor_backup_codes) ? u.two_factor_backup_codes : [],
          createdAt: u.created_at,
          lastLogin: u.last_login
        }));
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(formatted));
        this.notifyListeners({ type: 'USERS_UPDATED', payload: formatted });
      }
    } catch (e) {}
  }

  async fetchAppSettingsFromSupabase() {
    if (!this.isSupabaseReady) return;
    try {
      const { data, error } = await supabase.from('app_settings').select('*');
      if (!error && data && data.length > 0) {
        data.forEach(item => {
          if (item.key === 'whatsapp_template' && item.value) {
            localStorage.setItem('INZAR_WHATSAPP_TEMPLATE', item.value);
            this.broadcast('WHATSAPP_TEMPLATE_UPDATED', item.value);
          }
        });
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
        first_name: quoteToSave.customerFirstName || (quoteToSave.customerName ? quoteToSave.customerName.split(' ')[0] : null),
        last_name: quoteToSave.customerLastName || (quoteToSave.customerName ? quoteToSave.customerName.split(' ').slice(1).join(' ') : null),
        customer_phone: quoteToSave.customerPhone || null,
        tc_no: quoteToSave.customerTcNo || quoteToSave.tcNo || null,
        package_id: quoteToSave.packageId || 'standart',
        package_name: quoteToSave.packageName,
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
        valid_until: quoteToSave.validUntil || (quoteToSave.createdAt ? new Date(new Date(quoteToSave.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
        customer_approved_at: quoteToSave.customerApprovedAt || null,
        customer_approved_by: quoteToSave.customerApprovedBy || null,
        hq_approved_at: quoteToSave.hqApprovedAt || null,
        hq_approved_by: quoteToSave.hqApprovedBy || null,
        hq_note: quoteToSave.hqNote || null,
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

    // Otomatik Müşteri Kaydı (Customers Tablosuna ve Yerel Havuza)
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

  updateQuoteStatus(quoteId, newStatus, user = null, note = '') {
    const current = this.getSavedQuotes();
    const nowISO = new Date().toISOString();

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
          hqNote: (newStatus === 'hq_approved' || newStatus === 'hq_rejected') ? (note || q.hqNote) : q.hqNote,
          statusNote: note || q.statusNote,
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
      details: `${target?.customerName || 'Misafir'} adına teklif durumu: ${getStatusLabel(newStatus).toUpperCase()} olarak güncellendi.${note ? ` (Merkez Notu: ${note})` : ''}`,
      timestamp: nowISO
    });
    this.broadcast('QUOTES_UPDATED', updated);

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
        if (note) updatePayload.hq_note = note;
      }

      supabase.from('quotes').update(updatePayload).eq('id', quoteId).then();
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

  getUsers() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      if (data) return JSON.parse(data);
    } catch (e) {}
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  }

  saveUsers(users) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    this.broadcast('USERS_UPDATED', users);

    if (this.isSupabaseReady) {
      users.forEach(async (u) => {
        try {
          await supabase.from('profiles').upsert({
            id: (u.id && u.id.includes('-')) ? u.id : undefined,
            username: u.username,
            password: u.password || '123',
            name: u.name,
            role: u.role || 'STAFF',
            city: u.city || 'İstanbul',
            branch: u.branch || 'Merkez',
            phone: u.phone || '',
            avatar_image: u.avatarImage || u.avatar || '',
            is_active: u.isActive !== false,
            two_factor_enabled: Boolean(u.twoFactorEnabled),
            two_factor_secret: u.twoFactorSecret || null,
            two_factor_backup_codes: Array.isArray(u.twoFactorBackupCodes) ? u.twoFactorBackupCodes : []
          }, { onConflict: 'username' });
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

  getWhatsAppTemplate() {
    try {
      const custom = localStorage.getItem('INZAR_WHATSAPP_TEMPLATE');
      if (custom) return custom;
    } catch (e) {}

    return `*İNZAR TURİZM - UMRE FİYAT TEKLİFİ*

Sayın *{MUSTERI_ADI}*, danışmış olduğunuz Umre programı detayları ve özel fiyat teklifiniz hazırlanmıştır.

Resmi teklif mektubunuz ve detaylı fiyat dökümünüz ekteki PDF belgesinde yer almaktadır.

*Paket:* {PAKET_ADI}
*Mekke Oteli:* {MEKKE_OTELI} ({MEKKE_GECE} Gece)
*Medine Oteli:* {MEDINE_OTELI} ({MEDINE_GECE} Gece)
*Toplam Süre:* {TOPLAM_GUN} Gün
*Kişi Başı Teklif:* *{FIYAT_USD} USD* (~{FIYAT_TL} ₺)

*Temsilci:* {TEMSILCI}

Hayırlı ve bereketli ibadetler dileriz.`;
  }

  saveWhatsAppTemplate(template, user = null) {
    localStorage.setItem('INZAR_WHATSAPP_TEMPLATE', template);
    this.addAuditLog({
      action: 'WHATSAPP_TEMPLATE_UPDATED',
      user: user?.name || 'Genel Merkez',
      details: 'Merkezi WhatsApp otonom mesaj şablonu güncellendi.',
      timestamp: new Date().toISOString()
    });
    this.broadcast('WHATSAPP_TEMPLATE_UPDATED', template);

    if (this.isSupabaseReady) {
      supabase.from('app_settings').upsert({
        key: 'whatsapp_template',
        value: template,
        updated_at: new Date().toISOString()
      }).then(({ error }) => {
        if (error) console.error('Supabase whatsapp template upsert error:', error);
      });
    }

    return template;
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
