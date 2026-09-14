// İnzar Turizm - Modern Akıllı Telefon Bildirim Ses Motoru (Ultra-Clean Smartphone Sound Engine)
// Apple iOS / Samsung OneUI tarzı zarif, yumuşak ve kristal netliğinde bildirim çanları

// Temiz Saf PCM -> WAV Data URI dönüştürücü (Harici ses dosyası gerekmez)
function createWavDataUri(tones, duration = 0.5, sampleRate = 44100) {
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = new Uint8Array(44 + numSamples * 2);
  const view = new DataView(buffer.buffer);

  // RIFF Chunk
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + numSamples * 2, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // fmt Subchunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, 1, true); // NumChannels (1 = Mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample

  // data Subchunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, numSamples * 2, true);

  // Yumuşak akustik telefon çanı sentezi (Zero-crossing sine envelope)
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    tones.forEach(({ freq, start = 0, dur = 0.3, vol = 0.25 }) => {
      if (t >= start && t < start + dur) {
        const localT = t - start;
        // Akustik çan sönümlenmesi: Hızlı yumuşak vuruş (attack) ve kadife gibi sönümlenme (exponential decay)
        const attack = Math.min(1, localT / 0.006);
        const decay = Math.exp(-localT * 8);
        const envelope = attack * decay;
        // Temel frekans + hafif 2. harmonik (zenginlik için)
        sample += (Math.sin(2 * Math.PI * freq * t) * 0.85 + Math.sin(4 * Math.PI * freq * t) * 0.15) * envelope * vol;
      }
    });

    sample = Math.max(-0.95, Math.min(0.95, sample));
    view.setInt16(44 + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }

  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}

// Önceden hesaplanmış, zarif akıllı telefon bildirim dalgaları
let phonePingWavUri = null;
let phoneChimeWavUri = null;
let phoneAlertWavUri = null;

try {
  // Klasik Akıllı Telefon Çift "Ting" Tonu (D5 -> A5)
  phonePingWavUri = createWavDataUri([
    { freq: 587.33, start: 0.0, dur: 0.14, vol: 0.22 },
    { freq: 880.00, start: 0.08, dur: 0.32, vol: 0.28 }
  ], 0.45);

  // Başarı / Onay Telefon Tonu (C5 -> E5 -> G5)
  phoneChimeWavUri = createWavDataUri([
    { freq: 523.25, start: 0.0, dur: 0.12, vol: 0.2 },
    { freq: 659.25, start: 0.06, dur: 0.14, vol: 0.22 },
    { freq: 783.99, start: 0.12, dur: 0.32, vol: 0.26 }
  ], 0.5);

  // Önemli / Duyuru Bildirim Tonu (F#5 -> C#6)
  phoneAlertWavUri = createWavDataUri([
    { freq: 739.99, start: 0.0, dur: 0.15, vol: 0.24 },
    { freq: 1108.73, start: 0.09, dur: 0.35, vol: 0.3 }
  ], 0.5);
} catch (e) {
  console.warn('[SoundEngine] WAV creation warning:', e);
}

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.soundEnabled = this.getSoundEnabled();

    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.initContext();
      };
      ['click', 'keydown', 'mousedown', 'touchstart', 'focus'].forEach(evt => {
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

  // HTML5 Audio Fallback: Sadece Web Audio API askıdaysa veya çalışmıyorsa devreye girer (Asla çift ses çalmaz)
  playFallbackAudio(dataUri) {
    if (!dataUri || typeof Audio === 'undefined') return;
    try {
      const audio = new Audio(dataUri);
      audio.volume = 0.65;
      audio.play().catch(() => {});
    } catch (err) {}
  }

  // 1. Akıcı Sayfa / Kart Geçiş Fısıltısı (Whoosh)
  playFlipWhoosh() {
    if (!this.soundEnabled) return;
    try {
      this.initContext();
      if (!this.ctx || this.ctx.state !== 'running') return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.35);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(300, now + 0.35);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {}
  }

  // 2. Akıllı Telefon Başarı / Onay Çanı (Apple Pay / iOS Note tarzı yumuşak 3 ton)
  playSuccessChime() {
    if (!this.soundEnabled) return;

    this.initContext();
    if (!this.ctx || this.ctx.state !== 'running') {
      if (phoneChimeWavUri) this.playFallbackAudio(phoneChimeWavUri);
      return;
    }

    try {
      const now = this.ctx.currentTime;
      const notes = [
        { freq: 523.25, time: 0.0, dur: 0.22, vol: 0.10 },  // C5
        { freq: 659.25, time: 0.07, dur: 0.25, vol: 0.12 }, // E5
        { freq: 783.99, time: 0.14, dur: 0.40, vol: 0.14 }  // G5
      ];

      notes.forEach(({ freq, time, dur, vol }) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0.0001, now + time);
        gain.gain.linearRampToValueAtTime(vol, now + time + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur + 0.02);
      });
    } catch (e) {
      if (phoneChimeWavUri) this.playFallbackAudio(phoneChimeWavUri);
    }
  }

  // 3. Akıllı Telefon Standart Bildirim Sesi (Apple / Telegram Tarzı Çift "Ting" Sesi)
  playNotificationPing() {
    if (!this.soundEnabled) return;

    this.initContext();
    if (!this.ctx || this.ctx.state !== 'running') {
      if (phonePingWavUri) this.playFallbackAudio(phonePingWavUri);
      return;
    }

    try {
      const now = this.ctx.currentTime;
      const tones = [
        { freq: 587.33, time: 0.0, dur: 0.16, vol: 0.12 }, // D5 (ilk vuruş)
        { freq: 880.00, time: 0.08, dur: 0.38, vol: 0.15 }  // A5 (tatlı çınlama)
      ];

      tones.forEach(({ freq, time, dur, vol }) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);

        // Doğal telefon çanı zarfı: Yumuşak attack, berrak sönüm
        gain.gain.setValueAtTime(0.0001, now + time);
        gain.gain.linearRampToValueAtTime(vol, now + time + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur + 0.02);
      });
    } catch (e) {
      if (phonePingWavUri) this.playFallbackAudio(phonePingWavUri);
    }
  }

  // 4. Genel Merkez Duyuru Bildirim Sesi (Zarif Çift Tonlu Telefon Uyarısı)
  playUrgentAlert() {
    if (!this.soundEnabled) return;

    this.initContext();
    if (!this.ctx || this.ctx.state !== 'running') {
      if (phoneAlertWavUri) this.playFallbackAudio(phoneAlertWavUri);
      return;
    }

    try {
      const now = this.ctx.currentTime;
      const notes = [
        { freq: 739.99, time: 0.0, dur: 0.18, vol: 0.13 },  // F#5
        { freq: 1108.73, time: 0.09, dur: 0.42, vol: 0.16 } // C#6 (kristal çan)
      ];

      notes.forEach(({ freq, time, dur, vol }) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine'; // Tırmalayan üçgen/kare dalga yerine berrak saf sinüs
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0.0001, now + time);
        gain.gain.linearRampToValueAtTime(vol, now + time + 0.007);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur + 0.02);
      });
    } catch (e) {
      if (phoneAlertWavUri) this.playFallbackAudio(phoneAlertWavUri);
    }
  }
}

export const soundService = new SoundEngine();
