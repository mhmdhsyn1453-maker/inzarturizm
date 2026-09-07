// İnzar Turizm - Web Audio API Lüks Ses Motoru
// Harici mp3/wav dosyasına ihtiyaç duymadan, tarayıcı içinde saf frekans sentezleme

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.soundEnabled = this.getSoundEnabled();

    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.initContext();
      };
      ['click', 'keydown', 'mousedown', 'touchstart'].forEach(evt => {
        window.addEventListener(evt, unlockAudio, { passive: true });
      });
    }
  }

  getSoundEnabled() {
    try {
      const val = localStorage.getItem('INZAR_SOUND_ENABLED');
      return val === null ? true : val === 'true';
    } catch {
      return true;
    }
  }

  setSoundEnabled(enabled) {
    this.soundEnabled = Boolean(enabled);
    try {
      localStorage.setItem('INZAR_SOUND_ENABLED', String(this.soundEnabled));
    } catch {}
  }

  initContext() {
    try {
      if (!this.ctx && typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch (e) {
      console.warn('AudioContext init error:', e);
    }
  }

  // 1. 3D Kart Döndürme / Aerodinamik İpek Süzülme Sesi (Whoosh)
  playFlipWhoosh() {
    if (!this.soundEnabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.15);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.45);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(300, now + 0.45);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // 2. Dijital Parmak İzi Yeşil Tık Onay Çanı (Crystal Harmonic Chime)
  playSuccessChime() {
    if (!this.soundEnabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // Dual Harmonic Crystal Chime (528Hz & 1056Hz)
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);

        gain.gain.setValueAtTime(0.001, now + i * 0.06);
        gain.gain.linearRampToValueAtTime(0.12, now + i * 0.06 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.06 + 0.8);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.85);
      });
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // 3. Canlı Bildirim Sesi (Apple / Slack Tarzı Yumuşak Dıng-Dıng Çanı)
  playNotificationPing() {
    if (!this.soundEnabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      // İki tonlu zarif bildirim akoru (784Hz G5 -> 1046.5Hz C6)
      const tones = [
        { freq: 783.99, time: 0.0, dur: 0.35, vol: 0.14 },
        { freq: 1046.50, time: 0.09, dur: 0.55, vol: 0.18 }
      ];

      tones.forEach(({ freq, time, dur, vol }) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0.001, now + time);
        gain.gain.linearRampToValueAtTime(vol, now + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur + 0.05);
      });
    } catch (e) {
      console.warn('Audio notification ping error:', e);
    }
  }

  // 4. Acil / Genel Merkez Sirküler Bildirim Sesi (Üçlü Yükselen Akor)
  playUrgentAlert() {
    if (!this.soundEnabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const chords = [587.33, 739.99, 880.00, 1174.66]; // D5, F#5, A5, D6

      chords.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        gain.gain.setValueAtTime(0.001, now + idx * 0.07);
        gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.07 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.07 + 0.7);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.75);
      });
    } catch (e) {
      console.warn('Audio urgent alert error:', e);
    }
  }
}

export const soundService = new SoundEngine();
