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
        this.requestPermission();
      };
      window.addEventListener('click', unlockAudioAndPermission, { once: true });
      window.addEventListener('keydown', unlockAudioAndPermission, { once: true });
    }
  }

  // Kullanıcı izin durumunu kontrol et ve iste
  async requestPermission() {
    if (typeof window !== 'undefined' && 'Notification' in window && !window.electronAPI) {
      if (Notification.permission === 'default' && !this.hasRequestedWebPermission) {
        this.hasRequestedWebPermission = true;
        try {
          const res = await Notification.requestPermission();
          return res;
        } catch (e) {
          console.warn('Web notification permission error:', e);
        }
      }
    }
    return null;
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
            icon: icon || '/favicon.ico',
            badge: '/favicon.ico',
            silent: false
          });

          if (onClick) {
            notif.onclick = () => {
              window.focus();
              onClick();
            };
          }
        } else if (Notification.permission === 'default') {
          const perm = await this.requestPermission();
          if (perm === 'granted') {
            new Notification(title || 'İnzar Turizm', {
              body: body || '',
              icon: icon || '/favicon.ico'
            });
          }
        }
      }
    } catch (err) {
      console.warn('[Desktop Notification Error]:', err);
    }
  }

  // 🔊 & 🔔 2. Tam Kapsamlı Kullanıcı Uyarısı (Windows Bildirimi + Ses + Arayüz Toast'ı)
  notify({
    title,
    message,
    type = 'info', // 'info' | 'quote' | 'announcement' | 'tariff' | 'staff' | 'warning'
    sound = 'default', // 'default' | 'urgent' | 'success' | 'none'
    showDesktop = true,
    data = null
  }) {
    // 1. Ses Çal
    if (sound === 'urgent' || type === 'announcement') {
      soundService.playUrgentAlert();
    } else if (sound === 'success') {
      soundService.playSuccessChime();
    } else if (sound !== 'none') {
      soundService.playNotificationPing();
    }

    // 2. Windows Masaüstü Bildirimi Gönder
    if (showDesktop) {
      this.showDesktopNotification({
        title: title || 'İnzar Turizm',
        body: message || ''
      });
    }

    // 3. Uygulama İçi Dinleyicilere Bildir (Toast Gösterimi)
    const eventPayload = {
      id: Date.now() + Math.random().toString(36).substring(2, 6),
      title,
      message,
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
