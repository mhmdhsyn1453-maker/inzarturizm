// İnzar Turizm - Windows Native & Web Bildirim Servisi
import { soundService } from './soundService';

class NotificationService {
  constructor() {
    this.hasRequestedWebPermission = false;
    this.listeners = new Set();
    this.currentUser = null;

    // Kullanıcının sayfaya ilk tıklamasında ses bağlamını ve tarayıcı bildirim iznini etkinleştir
    if (typeof window !== 'undefined') {
      const unlockAudioAndPermission = () => {
        soundService.initContext();
        this.requestPermission().catch(() => {});
      };
      window.addEventListener('click', unlockAudioAndPermission, { once: true });
      window.addEventListener('keydown', unlockAudioAndPermission, { once: true });
    }
  }

  // Kullanıcı izin durumunu kontrol et ve iste (UI'dan da açıkça çağrılabilir)
  async requestPermission() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (window.electronAPI) {
        return 'granted'; // Electron ortamında işletim sistemi izinleri geçerlidir
      }

      if (Notification.permission === 'default') {
        this.hasRequestedWebPermission = true;
        try {
          const res = await Notification.requestPermission();
          return res;
        } catch (e) {
          console.warn('[NotificationService] Web notification permission error:', e);
          return null;
        }
      }
      return Notification.permission;
    }
    return null;
  }

  getPermissionStatus() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (window.electronAPI) return 'granted';
      return Notification.permission;
    }
    return 'unsupported';
  }

  // 🔔 1. Windows Native veya Web Push Bildirimi Gönder
  async showDesktopNotification({ title, body, icon, onClick }) {
    try {
      // 1. Electron Masaüstü Uygulamasıysa (Windows Native Notification)
      if (window.electronAPI?.showNativeNotification) {
        window.electronAPI.showNativeNotification({
          title: title || 'İnzar Turizm',
          body: body || '',
          icon
        });
        return;
      }

      // 2. Tarayıcı / Web Modu Fallback
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          const notif = new Notification(title || 'İnzar Turizm', {
            body: body || '',
            icon: icon || '/icon-01.png',
            badge: '/icon-01.png',
            silent: false
          });

          notif.onclick = () => {
            try {
              window.focus();
              if (window.electronAPI?.focusWindow) {
                window.electronAPI.focusWindow();
              }
              if (onClick) onClick();
            } catch (e) {}
          };
        } else if (Notification.permission === 'default') {
          // İzin henüz verilmemişse izin iste ve onaylanırsa bildir
          const perm = await this.requestPermission();
          if (perm === 'granted') {
            new Notification(title || 'İnzar Turizm', {
              body: body || '',
              icon: icon || '/icon-01.png'
            });
          }
        }
      }
    } catch (err) {
      console.warn('[Desktop Notification Error]:', err);
    }
  }

  setCurrentUser(user) {
    this.currentUser = user || null;
  }

  getCurrentUser() {
    if (this.currentUser) return this.currentUser;
    try {
      const saved = localStorage.getItem('inzar_auth_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  }

  // 🛡️ Teklifi oluşturan personeli güvenli ve kesin olarak doğrula
  checkIfUserIsCreator(q, user) {
    if (!q || !user) return false;

    const userId = String(user.id || '').trim().toLowerCase();
    const username = String(user.username || '').trim().toLowerCase();
    const userName = String(user.name || '').trim().toLocaleLowerCase('tr-TR');

    const creatorId = String(q.createdById || q.created_by_id || q.createdBy || q.created_by || '').trim().toLowerCase();
    const creatorName = String(q.createdByName || q.created_by_name || q.agentName || q.agent_name || '').trim().toLocaleLowerCase('tr-TR');

    if (userId && creatorId && userId === creatorId) return true;
    if (username && creatorId && (username === creatorId || creatorId.includes(username))) return true;

    // Genel fallback isim kontrolü ('personel', 'genel merkez', 'admin' gibi genel isimleri isim benzerliğinden koru)
    const genericTerms = ['personel', 'genel merkez', 'admin', 'user', 'kullanıcı', 'misafir'];
    const isGeneric = genericTerms.some(t => creatorName === t);

    if (!isGeneric && userName && creatorName) {
      if (userName === creatorName) return true;
      if (creatorName.includes(userName) || userName.includes(creatorName)) return true;
    }

    return false;
  }

  // 🎯 Rol & Hedef Kitle Doğrulayıcısı (Genel Merkez, Yardımcısı ve Personel İzolasyonu)
  shouldDeliver(notifPayload) {
    if (!notifPayload || typeof notifPayload !== 'object') return false;
    const { title = '', message = '', type = 'info', data = null, action = '', subType = '', force = false } = notifPayload;

    // Test bildirimleri doğrudan geçsin
    if (force || (title && title.includes('Test'))) return true;

    const user = this.getCurrentUser();
    if (!user) return false; // Oturum açık değilse bildirim verme

    const userRole = String(user.role || 'STAFF').toUpperCase();
    const isHqOrAdmin = userRole === 'ADMIN' || userRole === 'HQ_ASSISTANT';

    // ----------------------------------------------------
    // 📢 1. DUYURULAR (type === 'announcement')
    // Genel Merkez tüm şubelere ve personele duyuru geçer.
    // Duyuruyu yazan kişi hariç HERKESE gider.
    // ----------------------------------------------------
    if (type === 'announcement') {
      const author = (data?.author || notifPayload.author || '').trim().toLowerCase();
      const authorId = String(data?.authorId || notifPayload.authorId || '');
      const myId = String(user.id || '');
      const myName = String(user.name || '').trim().toLowerCase();

      if (authorId && myId && authorId === myId) return false;
      if (author && myName && (author.includes(myName) || myName.includes(author))) return false;
      return true;
    }

    // ----------------------------------------------------
    // 🏨 2. OTEL & FİYAT TARİFESİ (type === 'tariff')
    // Genel Merkez fiyat değiştirdiğinde şube personeli ve genel merkez yardımcısı haberdar olur.
    // ----------------------------------------------------
    if (type === 'tariff') {
      return true;
    }

    // ----------------------------------------------------
    // 📋 3. TEKLİF BİLDİRİMLERİ (type === 'quote' veya type === 'warning' ile teklif verisi)
    // ----------------------------------------------------
    if (type === 'quote' || (type === 'warning' && (title.includes('Teklif') || data?.packageName))) {
      const q = data;
      const isCreator = this.checkIfUserIsCreator(q, user);

      // A) YENİ TEKLİF BİLDİRİMİ
      // Kural: "A personeli teklif verince bunun bildirimi genel merkeze ve de yardımcısına gider, B personeline de bu bildirim gitmez."
      // Teklifi açan A personeline de yeni teklif bildirimi gitmez (zaten kendisi oluşturdu).
      const isNewQuote = subType === 'new_quote' || 
                         action === 'QUOTE_CREATED' || 
                         title.includes('Yeni Umre Teklifi') || 
                         title.includes('Yeni Teklif') ||
                         message.includes('teklifi oluşturuldu') ||
                         (q && (q.status === 'pending' || !q.status) && !title.includes('Onay') && !title.includes('Red') && !title.includes('Revize'));

      if (isNewQuote) {
        // SADECE Genel Merkez ve Genel Merkez Yardımcısına gider! Personellere (B personeli dahil) ASLA GİTMEZ!
        return isHqOrAdmin;
      }

      // B) MÜŞTERİ TEKLİFİ KABUL ETTİ (customer_approved)
      // Genel Merkez ve Genel Merkez Yardımcısı onay vermek için görür.
      // Teklifi hazırlayan personel de müşterisinin kabul ettiğini görür.
      // Diğer personeller (B personeli) ASLA GÖRMEZ!
      const isCustomerApproved = subType === 'customer_approved' || 
                                 q?.status === 'customer_approved' || 
                                 title.includes('Müşteri Teklifi Kabul Etti') || 
                                 title.includes('Müşteri');

      if (isCustomerApproved) {
        return isHqOrAdmin || isCreator;
      }

      // C) GENEL MERKEZ ONAYLADI (hq_approved / approved)
      // Teklifi hazırlayan personele gider ("Teklifiniz onaylandı").
      // Genel Merkez ve Yardımcısı görür.
      // Diğer personeller (B personeli) ASLA GÖRMEZ!
      const isHqApproved = subType === 'quote_approved' || 
                           q?.status === 'hq_approved' || 
                           q?.status === 'approved' || 
                           title.includes('Onaylandı');

      if (isHqApproved) {
        return isHqOrAdmin || isCreator;
      }

      // D) GENEL MERKEZ REDDETTİ (hq_rejected)
      // Teklifi hazırlayan personele gider ("Teklifiniz reddedildi").
      // Genel Merkez ve Yardımcısı görür.
      // Diğer personeller (B personeli) ASLA GÖRMEZ!
      const isHqRejected = subType === 'quote_rejected' || 
                           q?.status === 'hq_rejected' || 
                           title.includes('Reddedildi');

      if (isHqRejected) {
        return isHqOrAdmin || isCreator;
      }

      // E) TEKLİF REVİZE EDİLDİ (revised / approved_revised)
      // Genel Merkez ve Yardımcısı teklifin değiştiğini görür.
      // Teklifi hazırlayan personel görür.
      // Diğer personeller (B personeli) ASLA GÖRMEZ!
      const isRevised = subType === 'quote_revised' || 
                        action === 'QUOTE_REVISED' || 
                        q?.status === 'revised' || 
                        q?.status === 'approved_revised' || 
                        title.includes('Revize');

      if (isRevised) {
        return isHqOrAdmin || isCreator;
      }

      // F) DİĞER TÜM TEKLİF DURUM BİLDİRİMLERİ İÇİN KESİN KURAL:
      // Genel Merkez ve Genel Merkez Yardımcısı görebilir.
      // Personel SADECE VE SADECE kendisinin oluşturduğu teklifse görebilir!
      // B personeline veya ilgisiz personele ASLA gitmez!
      return isHqOrAdmin || isCreator;
    }

    // ----------------------------------------------------
    // 👤 4. PERSONEL & YETKİ BİLDİRİMLERİ (type === 'staff')
    // Sadece Genel Merkez ve Genel Merkez Yardımcısı alır.
    // ----------------------------------------------------
    if (type === 'staff') {
      return isHqOrAdmin;
    }

    return isHqOrAdmin;
  }

  // 🔊 & 🔔 2. Tam Kapsamlı Kullanıcı Uyarısı (Windows Bildirimi + Ses + Arayüz Toast'ı)
  notify(payload) {
    if (!payload || typeof payload !== 'object') return null;

    // 🎯 Kullanıcının kurumsal rol ve hedef filtrelemesini uygula
    if (!this.shouldDeliver(payload)) {
      return null;
    }

    const {
      title,
      message,
      type = 'info', // 'info' | 'quote' | 'announcement' | 'tariff' | 'staff' | 'warning'
      sound = 'default', // 'default' | 'urgent' | 'success' | 'none'
      showDesktop = true,
      data = null,
      onClick = null
    } = payload;

    // 1. Ses Çal (Dual-Engine: Hem osilatör hem wav arka plan güvencesi)
    try {
      soundService.initContext();
      if (sound === 'urgent' || type === 'announcement') {
        soundService.playUrgentAlert();
      } else if (sound === 'success') {
        soundService.playSuccessChime();
      } else if (sound !== 'none') {
        soundService.playNotificationPing();
      }
    } catch (soundErr) {
      console.warn('[NotificationService] Sound play error:', soundErr);
    }

    // 2. Windows Masaüstü Bildirimi Gönder (Kullanıcı ister uygulamada ister başka yerde olsun her daim fırlatılır)
    if (showDesktop) {
      this.showDesktopNotification({
        title: title || 'İnzar Turizm',
        body: message || '',
        onClick
      });
    }

    // 3. Uygulama İçi Dinleyicilere Bildir (Sağ Üst Toast & Header Bell Akışı)
    const eventPayload = {
      id: Date.now() + Math.random().toString(36).substring(2, 6),
      title: title || 'İnzar Turizm',
      message: message || '',
      type,
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      data
    };

    this.listeners.forEach(callback => {
      try {
        callback(eventPayload);
      } catch (err) {
        console.error('Notification listener error:', err);
      }
    });

    return eventPayload;
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
}

export const notificationService = new NotificationService();
