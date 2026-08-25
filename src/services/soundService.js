// İnzar Turizm - Web Audio API Lüks Ses Motoru
// Harici mp3/wav dosyasına ihtiyaç duymadan, tarayıcı içinde saf frekans sentezleme

class SoundEngine {
  constructor() {
    this.ctx = null;
  }

  initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // 1. 3D Kart Döndürme / Aerodinamik İpek Süzülme Sesi (Whoosh)
  playFlipWhoosh() {
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
}

export const soundService = new SoundEngine();
