import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { 
  RefreshCw, 
  Timer, 
  X, 
  ChevronLeft
} from 'lucide-react';

export default function Topbar() {
  const { currencies, currencyStatus, nextSyncSeconds, refreshLiveCurrencies } = useData();
  const [isRatesOpen, setIsRatesOpen] = useState(false);

  const minutes = Math.floor(nextSyncSeconds / 60);
  const seconds = nextSyncSeconds % 60;
  const formattedCountdown = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <header className="relative z-20 bg-transparent border-0 shadow-none px-4 sm:px-6 py-2.5 font-sans">
      <div className="relative flex items-center justify-end w-full min-h-9">
        
        {/* Closed State: Simple "Kurlar" Pill Button Floating at Far Right */}
        {!isRatesOpen && (
          <button
            type="button"
            onClick={() => setIsRatesOpen(true)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/95 hover:bg-emerald-50 text-emerald-950 border border-emerald-300 transition-all duration-200 cursor-pointer spring-pill shadow-xs select-none backdrop-blur-md"
            title="Piyasa Kurlarını Görüntüle"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>

            <span className="text-xs font-bold font-display">Kurlar</span>
            <ChevronLeft className="h-3.5 w-3.5 text-emerald-700" />
          </button>
        )}

        {/* Opened State: One Single Unified Floating Capsule */}
        {isRatesOpen && (
          <div className="w-full flex items-center justify-between gap-3 animate-fade-scale bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-full px-4 py-1.5 shadow-md overflow-x-auto">
            
            {/* Left Title & Live Indicator */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-emerald-950 font-display hidden sm:inline">
                Canlı Piyasa Kurları:
              </span>
            </div>

            {/* Currency Values as Clean Inline Typography (Without separate sub-box containers) */}
            <div className="flex items-center gap-3 font-mono text-xs overflow-x-auto py-0.5">
              {/* USD */}
              <span className="text-slate-600 whitespace-nowrap">
                1 USD = <strong className="text-emerald-800 font-bold">{currencies.USD_TRY} ₺</strong>
              </span>

              <span className="text-slate-300 select-none">•</span>

              {/* EUR */}
              <span className="text-slate-600 whitespace-nowrap">
                1 EUR = <strong className="text-emerald-800 font-bold">{currencies.EUR_TRY} ₺</strong>
              </span>

              <span className="text-slate-300 select-none">•</span>

              {/* SAR / USD */}
              <span className="text-slate-600 whitespace-nowrap">
                1 USD = <strong className="text-amber-900 font-bold">{currencies.SAR_USD} SAR</strong>
              </span>

              <span className="text-slate-300 select-none">•</span>

              {/* Countdown Timer */}
              <div 
                title={`Sonraki otomatik güncellemeye kalan süre: ${formattedCountdown}`}
                className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 whitespace-nowrap select-none"
              >
                <Timer className="h-3.5 w-3.5 text-emerald-600" />
                <span>{formattedCountdown}</span>
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={() => refreshLiveCurrencies(true)}
                disabled={currencyStatus.isLoading}
                title={`Kurları Şimdi Yenile (Son: ${currencyStatus.lastUpdated || 'Canlı'})`}
                className="flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold whitespace-nowrap cursor-pointer shadow-3xs spring-pill"
              >
                <RefreshCw className={`h-3 w-3 ${currencyStatus.isLoading ? 'animate-spin' : ''}`} />
                <span>Yenile</span>
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsRatesOpen(false)}
              className="flex items-center justify-center h-6 w-6 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer shrink-0"
              title="Kurları Kapat"
            >
              <X className="h-3.5 w-3.5" />
            </button>

          </div>
        )}

      </div>
    </header>
  );
}
