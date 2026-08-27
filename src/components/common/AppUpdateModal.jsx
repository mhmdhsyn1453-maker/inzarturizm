import React, { useState, useEffect } from 'react';
import { DownloadCloud, RefreshCw, CheckCircle2, Sparkles, X, ArrowUpRight } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function AppUpdateModal() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI) return;

    const unregStatus = window.electronAPI.onUpdaterStatus((data) => {
      if (data.status === 'available') {
        setUpdateInfo(data);
        setDismissed(false);
      } else if (data.status === 'downloaded') {
        setIsDownloaded(true);
        setUpdateInfo(data);
        setDismissed(false);
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.8 }
        });
      }
    });

    const unregProgress = window.electronAPI.onUpdaterProgress((progress) => {
      setDownloadProgress(progress);
    });

    return () => {
      if (unregStatus) unregStatus();
      if (unregProgress) unregProgress();
    };
  }, []);

  if (!updateInfo || dismissed) return null;

  const handleInstall = () => {
    if (window.electronAPI?.installUpdate) {
      window.electronAPI.installUpdate();
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-slide-up select-none">
      <div className="pearl-card rounded-3xl p-5 bg-gradient-to-br from-emerald-900 via-emerald-950 to-slate-950 text-white border border-emerald-500/40 shadow-2xl space-y-3.5">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              {isDownloaded ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : (
                <DownloadCloud className="h-5 w-5 text-amber-300 animate-bounce" />
              )}
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                SİSTEM GÜNCELLEMESİ
              </div>
              <h4 className="text-sm font-bold text-white font-display">
                {isDownloaded ? `Yeni Sürüm (v${updateInfo.version}) Hazır!` : `Yeni Sürüm (v${updateInfo.version}) İndiriliyor`}
              </h4>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Notes */}
        {updateInfo.releaseNotes && (
          <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed bg-black/20 p-2.5 rounded-2xl border border-white/5 font-sans">
            {typeof updateInfo.releaseNotes === 'string'
              ? updateInfo.releaseNotes.replace(/<[^>]*>?/gm, '').trim()
              : 'Performans iyileştirmeleri ve yeni özellikler içerir.'}
          </p>
        )}

        {/* Progress Bar while downloading */}
        {!isDownloaded && downloadProgress && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-emerald-200">
              <span>İndiriliyor...</span>
              <span>%{Math.round(downloadProgress.percent || 0)}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-200"
                style={{ width: `${downloadProgress.percent || 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Button */}
        {isDownloaded ? (
          <button
            type="button"
            onClick={handleInstall}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all transform hover:scale-102 active:scale-98 cursor-pointer shadow-lg shadow-emerald-500/25"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Şimdi Yeniden Başlat & Güncelle</span>
          </button>
        ) : (
          <div className="text-[11px] text-emerald-200/70 text-center font-medium">
            Güncelleme arka planda tamamlandığında bildirilecektir.
          </div>
        )}

      </div>
    </div>
  );
}
