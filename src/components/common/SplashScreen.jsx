import React, { useState, useEffect } from 'react';
import inzarLogo from '../../assets/inzarturizmlogo.png';

export default function SplashScreen({ onFinish, minDuration = 1600 }) {
  const [progress, setProgress] = useState(15);
  const [statusText, setStatusText] = useState('Sistem başlatılıyor...');
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => {
      setProgress(45);
      setStatusText('Tarife motoru ve otel kurları yükleniyor...');
    }, 400);

    const t2 = setTimeout(() => {
      setProgress(85);
      setStatusText('Güvenli bağlantı kuruluyor...');
    }, 900);

    const t3 = setTimeout(() => {
      setProgress(100);
      setStatusText('Hazır!');
    }, 1300);

    const t4 = setTimeout(() => {
      setIsFadingOut(true);
    }, minDuration);

    const t5 = setTimeout(() => {
      if (onFinish) onFinish();
    }, minDuration + 450);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [minDuration, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950 text-white select-none transition-all duration-500 ease-out ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full bg-emerald-600/20 blur-[130px] animate-pulse" />
        <div className="absolute bottom-10 right-1/4 w-[350px] h-[350px] rounded-full bg-amber-500/15 blur-[100px]" />
      </div>

      {/* Center Branded Card */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-md w-full">
        {/* Glowing Logo Container */}
        <div className="relative mb-6 flex items-center justify-center">
          <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-emerald-500/30 via-amber-400/20 to-emerald-400/30 blur-xl animate-pulse" />
          <img
            src={inzarLogo}
            alt="İnzar Turizm"
            className="relative h-28 sm:h-36 w-auto object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.5)] transform hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-display">
          İNZAR <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">TURİZM</span>
        </h1>
        <p className="text-xs sm:text-sm font-semibold tracking-widest text-emerald-400/90 uppercase mt-1">
          Umre Tarife & Teklif Yönetim Platformu
        </p>

        {/* Progress Bar Container */}
        <div className="w-full max-w-[280px] mt-8">
          <div className="h-1.5 w-full bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-emerald-500/20">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 rounded-full transition-all duration-300 ease-out shadow-[0_0_12px_rgba(16,185,129,0.8)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mt-2.5 px-0.5">
            <span className="truncate">{statusText}</span>
            <span className="font-mono font-bold text-emerald-400 shrink-0 ml-2">{progress}%</span>
          </div>
        </div>

        {/* Bottom Nexus Branding */}
        <div
          className="mt-12 text-[11px] text-slate-500 font-normal tracking-wide flex items-center justify-center gap-1"
          style={{ fontFamily: "'Mark Pro', 'Plus Jakarta Sans', sans-serif" }}
        >
          <span>By <strong className="font-bold text-slate-300">NEXUS</strong> Platforms</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-500 font-mono text-[10px]">v1.0.5</span>
        </div>
      </div>
    </div>
  );
}
