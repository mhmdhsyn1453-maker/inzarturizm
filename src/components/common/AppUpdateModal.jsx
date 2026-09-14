import React, { useState, useEffect } from 'react';
import { DownloadCloud, RefreshCw, CheckCircle2, Sparkles, X, ArrowUpRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { syncService } from '../../services/syncService';

const CURRENT_APP_VERSION = '1.0.22';

export default function AppUpdateModal() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isRemoteRelease, setIsRemoteRelease] = useState(false);

  useEffect(() => {
    // 1. Desktop Electron updater events
    let unregStatus = null;
    let unregProgress = null;

    if (typeof window !== 'undefined' && window.electronAPI) {
      if (window.electronAPI.onUpdaterStatus) {
        unregStatus = window.electronAPI.onUpdaterStatus((data) => {
          if (data.status === 'available') {
            setUpdateInfo(data);
            setIsRemoteRelease(false);
            setDismissed(false);
          } else if (data.status === 'downloaded') {
            setIsDownloaded(true);
            setUpdateInfo(data);
            setIsRemoteRelease(false);
            setDismissed(false);
            confetti({
              particleCount: 50,
              spread: 70,
              origin: { y: 0.8 }
            });
          }
        });
      }

      if (window.electronAPI.onUpdaterProgress) {
        unregProgress = window.electronAPI.onUpdaterProgress((progress) => {
          setDownloadProgress(progress);
        });
      }
    }

    // 2. Supabase app_versions listener (Cross-platform)
    const checkVersion = (remoteInfo) => {
      if (!remoteInfo?.version) return;
      const currentVer = (window.electronAPI?.appVersion || CURRENT_APP_VERSION).replace(/[^0-9.]/g, '');
      const remoteVer = String(remoteInfo.version).replace(/[^0-9.]/g, '');

      const currentParts = currentVer.split('.').map(Number);
      const remoteParts = remoteVer.split('.').map(Number);
      let isNewer = false;

      for (let i = 0; i < Math.max(currentParts.length, remoteParts.length); i++) {
        const c = currentParts[i] || 0;
        const r = remoteParts[i] || 0;
        if (r > c) { isNewer = true; break; }
        if (r < c) { break; }
      }

      if (isNewer) {
        setUpdateInfo({
          version: remoteInfo.version,
          releaseNotes: remoteInfo.release_notes || remoteInfo.releaseNotes || 'Yeni sürüm yayınlandı.',
          downloadUrl: remoteInfo.download_url || remoteInfo.downloadUrl || '',
          isMandatory: Boolean(remoteInfo.is_mandatory || remoteInfo.isMandatory)
        });
        setIsRemoteRelease(true);
        setDismissed(false);
      }
    };

    const unsubSync = syncService.subscribe((event) => {
      if (event.type === 'APP_VERSION_UPDATED' && event.payload) {
        checkVersion(event.payload);
      }
    });

    try {
      const cached = localStorage.getItem('INZAR_LATEST_VERSION_INFO');
      if (cached) {
        checkVersion(JSON.parse(cached));
      }
    } catch (e) {}

    return () => {
      if (unregStatus) unregStatus();
      if (unregProgress) unregProgress();
      if (unsubSync) unsubSync();
    };
  }, []);

  if (!updateInfo || dismissed) return null;

  const handleInstall = () => {
    if (window.electronAPI?.installUpdate) {
      window.electronAPI.installUpdate();
    } else if (updateInfo.downloadUrl) {
      window.open(updateInfo.downloadUrl, '_blank');
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
                {isDownloaded ? `Yeni Sürüm (v${updateInfo.version}) Hazır!` : `Yeni Sürüm (v${updateInfo.version}) Mevcut`}
              </h4>
            </div>
          </div>

          {!updateInfo.isMandatory && (
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Kapat"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Notes */}
        {updateInfo.releaseNotes && (
          <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed bg-black/20 p-2.5 rounded-2xl border border-white/5 font-sans">
            {typeof updateInfo.releaseNotes === 'string'
              ? updateInfo.releaseNotes.replace(/<[^>]*>?/gm, '').trim()
              : 'Performans iyileştirmeleri ve yeni özellikler içerir.'}
          </p>
        )}

        {/* Progress Bar while downloading in Electron */}
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
        ) : isRemoteRelease && updateInfo.downloadUrl ? (
          <button
            type="button"
            onClick={handleInstall}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all transform hover:scale-102 active:scale-98 cursor-pointer shadow-lg shadow-emerald-500/25"
          >
            <ArrowUpRight className="h-4 w-4" />
            <span>Yeni Sürümü İndir / Yükle</span>
          </button>
        ) : (
          <div className="text-[11px] text-emerald-200/70 text-center font-medium">
            Yeni sürüm genel merkez tarafından sisteme sunulmuştur.
          </div>
        )}

      </div>
    </div>
  );
}
