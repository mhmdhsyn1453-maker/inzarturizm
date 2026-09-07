// İnzar Turizm - Windows Native & Web Bildirim Servisi
import { soundService } from './soundService';

class NotificationService {
  constructor() {
    this.hasRequestedWebPermission = false;
    this.listeners = new Set();

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

  getCurrentUser() {
    try {
      const saved = localStorage.getItem('inzar_auth_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  }

  // 🎯 Rol & Hedef Kitle Doğrulayıcısı (Kullanıcının İstediği Kurumsal Kurallar)
  shouldDeliver(notifPayload) {
    const { title, type, data, action, subType, force = false } = notifPayload;
    if (force || (title && title.includes('Test'))) return true;

    const user = this.getCurrentUser();
    if (!user) return true; // Oturum açılmamışsa engelleme yapma

    const userRole = (user.role || 'STAFF').toUpperCase();
    const userId = user.id ? String(user.id) : '';
    const userName = (user.name || '').trim().toLowerCase();

    // 📢 KURAL 2: Duyuru Bildirimi (Duyuruyu yayınlayan hariç HERKESE gider)
    if (type === 'announcement') {
      const author = (data?.author || notifPayload.author || '').trim().toLowerCase();
      const authorId = data?.authorId || notifPayload.authorId;
      if (authorId && userId && String(authorId) === userId) {
        return false; // Yayınlayan kendisi, alarm çalma
      }
      if (author && userName && (author.includes(userName) || userName.includes(author))) {
        return false; // Yayınlayan kendisi, alarm çalma
      }
      return true; // Yayınlayan hariç herkese gider
    }

    // 📋 KURAL 1: Yeni Teklif Bildirimi (A personeli oluşturduğunda sadece Genel Merkez ve Yardımcısına)
    // "a personeli bir teklif oluştursa bu bildirim diğer personele gitmeyecek, genel merkez ve genel merkez yardımcısına düşecek"
    const isNewQuote = subType === 'new_quote' || action === 'QUOTE_CREATED' || 
                       (data && (data.status === 'pending' || !data.status) && (title?.includes('Yeni') || action === 'QUOTE_CREATED'));
    if (type === 'quote' && isNewQuote) {
      return userRole === 'ADMIN' || userRole === 'HQ_ASSISTANT';
    }

    // ⚖️ KURAL 3: Teklif Reddi, Teklif Onayı ve Revizyon
    // "teklif reddinden de bildirim teklifi oluşturan personele düşer"
    if (type === 'quote' || type === 'warning') {
      const q = data;
      if (q) {
        const creatorId = q.createdById || q.created_by_id ? String(q.createdById || q.created_by_id) : '';
        const creatorName = (q.createdByName || q.created_by_name || '').trim().toLowerCase();
        const isCreator = (creatorId && userId && creatorId === userId) ||
                          (creatorName && userName && (creatorName.includes(userName) || userName.includes(creatorName)));

        // Teklif Reddedildiğinde: Sadece teklifi oluşturan personele (ve Genel Merkez/Yardımcısına)
        if (q.status === 'hq_rejected' || title?.includes('Reddedildi')) {
          return isCreator || userRole === 'ADMIN' || userRole === 'HQ_ASSISTANT';
        }

        // Teklif Onaylandığında: Teklifi oluşturan personele (ve Genel Merkez/Yardımcısına)
        if (q.status === 'hq_approved' || q.status === 'approved' || title?.includes('Onaylandı')) {
          return isCreator || userRole === 'ADMIN' || userRole === 'HQ_ASSISTANT';
        }

        // Müşteri Onayladığında: Genel Merkez & Yardımcısına (onay vermeleri için) ve personele
        if (q.status === 'customer_approved' || title?.includes('Müşteri')) {
          return isCreator || userRole === 'ADMIN' || userRole === 'HQ_ASSISTANT';
        }

        // Revize Edildiğinde: Genel Merkez & Yardımcısına ve oluşturan personele
        if (q.status === 'revised' || q.status === 'approved_revised' || title?.includes('Revize')) {
          return isCreator || userRole === 'ADMIN' || userRole === 'HQ_ASSISTANT';
        }
      }
    }

    // 🏨 KURAL 4: Veri Merkezinde Değişiklik (Otel & Fiyat Tarifesi)
    // "veri merkezinde değişiklik olduğunda da bu bildirim personele ve genel merkez yardımcısına düşer"
    if (type === 'tariff') {
      return userRole === 'STAFF' || userRole === 'HQ_ASSISTANT';
    }

    return true;
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
