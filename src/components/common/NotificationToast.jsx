import React from 'react';
import { useData } from '../../context/DataContext';
import { Radio, X, Sparkles, CheckCircle2 } from 'lucide-react';

export default function NotificationToast() {
  const { hotReloadAlert, dismissHotReloadAlert } = useData();

  if (!hotReloadAlert) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slide-down max-w-lg w-full px-4">
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-amber-950 p-4 border border-emerald-500/50 shadow-2xl shadow-emerald-950/60 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <Radio className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-emerald-300 font-display">
                Canlı Sistem Güncellemesi
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">
                {hotReloadAlert.timestamp}
              </span>
            </div>
            <p className="text-xs text-slate-200 mt-0.5">
              {hotReloadAlert.message}
            </p>
          </div>
        </div>

        <button
          onClick={dismissHotReloadAlert}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          title="Kapat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
