// İnzar Turizm - Dual-Engine Kesintisiz Ses Motoru
// Web Audio API + Dinamik Data URI WAV Fallback (Arka planda dahi güvenilir ses)

// Hafif saf PCM -> WAV Data URI dönüştürücü (Harici ses dosyası gerekmez)
function createWavDataUri(tones, duration = 0.8, sampleRate = 22050) {
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

  // PCM Sample üretimi
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    tones.forEach(({ freq, start = 0, dur = 0.4, vol = 0.3 }) => {
      if (t >= start && t < start + dur) {
        const localT = t - start;
        const envelope = Math.sin((Math.PI * localT) / dur) * Math.exp(-localT * 3);
        sample += Math.sin(2 * Math.PI * freq * t) * envelope * vol;
      }
    });

    sample = Math.max(-1, Math.min(1, sample));
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

// Önceden hesaplanmış Data URI ses dalgaları
let pingWavUri = null;
let urgentWavUri = null;
let successWavUri = null;

try {
  pingWavUri = createWavDataUri([
    { freq: 783.99, start: 0.0, dur: 0.35, vol: 0.35 },
    { freq: 1046.5, start: 0.1, dur: 0.55, vol: 0.45 }
  ], 0.7);

  urgentWavUri = createWavDataUri([
    { freq: 587.33, start: 0.0, dur: 0.3, vol: 0.35 },
    { freq: 739.99, start: 0.08, dur: 0.35, vol: 0.4 },
    { freq: 880.0, start: 0.16, dur: 0.4, vol: 0.45 },
    { freq: 1174.66, start: 0.24, dur: 0.6, vol: 0.5 }
  ], 0.9);

  successWavUri = createWavDataUri([
    { freq: 523.25, start: 0.0, dur: 0.3, vol: 0.3 },
    { freq: 659.25, start: 0.06, dur: 0.35, vol: 0.35 },
    { freq: 783.99, start: 0.12, dur: 0.4, vol: 0.4 },
    { freq: 1046.5, start: 0.18, dur: 0.6, vol: 0.45 }
  ], 0.85);
} catch (e) {
  console.warn('[SoundEngine] Data URI wav creation failed:', e);
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

  // HTML5 Audio Fallback: AudioContext askıda olsa bile kesinlikle çalar
  playFallbackAudio(dataUri) {
    if (!dataUri || typeof Audio === 'undefined') return;
    try {
      const audio = new Audio(dataUri);
      audio.volume = 0.85;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          // Tarayıcı autoplay politikası gereği kilitlenirse sessizce ele al
          console.debug('[SoundEngine] Fallback audio playback prevented:', err?.message);
        });
      }
    } catch (err) {
      console.warn('[SoundEngine] Fallback audio error:', err);
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
    
    // HTML5 Audio Fallback'i her zaman tetikle (arka plan güvencesi)
    if (successWavUri) {
      this.playFallbackAudio(successWavUri);
    }

    try {
      this.initContext();
      if (!this.ctx || this.ctx.state !== 'running') return;

      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
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

    // HTML5 Audio Fallback'i her zaman tetikle (arka plan güvencesi)
    if (pingWavUri) {
      this.playFallbackAudio(pingWavUri);
    }

    try {
      this.initContext();
      if (!this.ctx || this.ctx.state !== 'running') return;

      const now = this.ctx.currentTime;
      const tones = [
        { freq: 783.99, time: 0.0, dur: 0.35, vol: 0.14 },
        { freq: 1046.5, time: 0.09, dur: 0.55, vol: 0.18 }
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
      console.warn('Audio play error:', e);
    }
  }

  // 4. Acil / Genel Merkez Sirküler Bildirim Sesi (Üçlü Yükselen Akor)
  playUrgentAlert() {
    if (!this.soundEnabled) return;

    // HTML5 Audio Fallback'i her zaman tetikle (arka plan güvencesi)
    if (urgentWavUri) {
      this.playFallbackAudio(urgentWavUri);
    }

    try {
      this.initContext();
      if (!this.ctx || this.ctx.state !== 'running') return;

      const now = this.ctx.currentTime;
      const chords = [587.33, 739.99, 880.0, 1174.66]; // D5, F#5, A5, D6

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
