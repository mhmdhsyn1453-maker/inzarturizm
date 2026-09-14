import React from 'react';
import { Check, Layers, Plus, Minus, Hotel, Users } from 'lucide-react';

export default function RoomComparisonTable({ 
  matrix = [], 
  selectedOccupancy = 2, 
  onSelectOccupancy,
  currency = 'USD',
  isMixedRoomMode = false,
  onToggleMixedMode,
  mixedRooms = { single: 0, double: 0, triple: 0, quad: 0 },
  onChangeMixedRoom,
  mixedRoomsBreakdown = null,
  mixedRoomsSummary = null,
}) {
  const roomKeys = [
    { occupancy: 1, key: 'single', label: 'Tek Kişilik Oda', desc: 'Özel Müstakil Tek Kişilik Oda', pax: 1, badge: 'Özel / VIP' },
    { occupancy: 2, key: 'double', label: '2 Kişilik Oda', desc: 'İki Kişilik Standart Paylaşımlı Oda', pax: 2, badge: 'En Çok Tercih Edilen' },
    { occupancy: 3, key: 'triple', label: '3 Kişilik Oda', desc: 'Üç Kişilik Ferah Aile / Grup Odası', pax: 3, badge: 'Ekonomik Aile' },
    { occupancy: 4, key: 'quad', label: '4 Kişilik Oda', desc: 'Dört Kişilik Paylaşımlı Grup Odası', pax: 4, badge: 'En Uygun Fiyat' }
  ];

  return (
    <div className="space-y-4 pt-1 font-sans select-none">
      {/* Üst Segment Seçici: Standart vs Karma Mod (Modern Pill / Kapsül Tasarım) */}
      {onToggleMixedMode && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Hotel className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Oda Yerleşim Modeli</span>
          </span>

          <div className="p-1 bg-slate-100 dark:bg-slate-800/90 rounded-full border border-slate-200 dark:border-slate-700/80 shadow-inner flex items-center gap-1 select-none self-start sm:self-auto">
            <button
              type="button"
              onClick={() => onToggleMixedMode(false)}
              className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ease-out cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                !isMixedRoomMode
                  ? 'bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-700/25 pill-active-glow font-black scale-[1.01]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/40'
              }`}
            >
              <Hotel className="h-3.5 w-3.5" />
              <span>Standart Tek Tip Oda</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleMixedMode(true)}
              className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ease-out cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                isMixedRoomMode
                  ? 'bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-700/25 pill-active-glow font-black scale-[1.01]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/40'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Karma Çoklu Oda Dağılımı</span>
            </button>
          </div>
        </div>
      )}

      {/* Mode 1: Standart Tek Tip Oda Seçimi - Akıcı Geçiş Animasyonlu */}
      {!isMixedRoomMode && (
        <div key="standard-mode" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 animate-tab-content">
          {roomKeys.map((r) => {
            const isSelected = selectedOccupancy === r.occupancy;

            return (
              <button
                key={r.occupancy}
                type="button"
                onClick={() => onSelectOccupancy(r.occupancy)}
                className={`relative flex flex-col justify-between rounded-2xl p-4 text-left transition-all duration-300 ease-out transform cursor-pointer border select-none group hover:-translate-y-1 active:scale-[0.98] ${
                  isSelected
                    ? 'bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white dark:from-emerald-950/50 dark:via-teal-950/30 dark:to-slate-900 border-2 border-emerald-500 dark:border-emerald-500 shadow-md ring-4 ring-emerald-500/15 scale-[1.01]'
                    : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-400 dark:hover:border-emerald-500/60 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm'
                }`}
              >
                {isSelected && (
                  <span className="absolute -top-2.5 -right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md shadow-emerald-600/30 animate-scale-in">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </span>
                )}

                <div className="space-y-2.5 w-full">
                  {/* Kart Başlığı & Rozet */}
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`h-7 w-7 rounded-xl flex items-center justify-center font-black text-xs font-mono transition-all duration-300 ${
                        isSelected 
                          ? 'bg-emerald-600 text-white shadow-xs' 
                          : 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-950/80 group-hover:text-emerald-700 dark:group-hover:text-emerald-300'
                      }`}>
                        {r.occupancy}
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{r.label}</span>
                    </div>
                    {r.badge && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                        isSelected 
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300/60 dark:border-emerald-800/60' 
                          : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200/80 dark:border-slate-700/80'
                      }`}>
                        {r.badge}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-snug">{r.desc}</p>

                  <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Oda Kapasitesi:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">{r.occupancy} Kişilik Oda</span>
                  </div>
                </div>

                {/* Seçim Durumu Rozeti */}
                <div className="mt-3.5 pt-2.5 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between w-full">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">Durum:</span>
                  <span className={`text-xs font-black transition-colors ${
                    isSelected ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    {isSelected ? '✓ Seçili Oda Tipi' : 'Seçmek İçin Tıklayın'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Mode 2: Karma Çoklu Oda Dağılımı - Akıcı Geçiş Animasyonlu */}
      {isMixedRoomMode && (
        <div key="mixed-mode" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 animate-tab-content">
          {roomKeys.map((r) => {
            const count = mixedRooms[r.key] || 0;
            const subPax = count * r.pax;

            return (
              <div 
                key={r.key}
                className={`relative flex flex-col justify-between rounded-2xl p-4 text-left transition-all duration-300 ease-out border select-none ${
                  count > 0 
                    ? 'bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white dark:from-emerald-950/50 dark:via-teal-950/30 dark:to-slate-900 border-2 border-emerald-500 dark:border-emerald-500 shadow-md ring-4 ring-emerald-500/15' 
                    : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {count > 0 && (
                  <span className="absolute -top-2.5 -right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-mono text-xs font-black animate-scale-in">
                    {count}
                  </span>
                )}

                <div className="space-y-3 w-full">
                  {/* Kart Başlığı */}
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`h-7 w-7 rounded-xl flex items-center justify-center font-black text-xs font-mono transition-all duration-300 ${
                        count > 0 
                          ? 'bg-emerald-600 text-white shadow-xs' 
                          : 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}>
                        {r.occupancy}
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{r.label}</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200/80 dark:border-slate-700/80">
                      {r.pax} Kişi/Oda
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-snug">{r.desc}</p>

                  {/* Oda Adedi Sayacı (Zarif ve Akıcı Stepper) */}
                  <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-3xs">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">Oda Sayısı:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onChangeMixedRoom?.(r.key, Math.max(0, count - 1))}
                        className="h-7 w-7 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 active:scale-90 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center border border-slate-200 dark:border-slate-600 transition-all cursor-pointer shadow-3xs"
                        title="1 Oda Azalt"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="font-mono font-black text-sm text-slate-900 dark:text-white min-w-[24px] text-center">
                        {count}
                      </span>
                      <button
                        type="button"
                        onClick={() => onChangeMixedRoom?.(r.key, count + 1)}
                        className="h-7 w-7 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-90 text-white font-bold flex items-center justify-center transition-all cursor-pointer shadow-xs shadow-emerald-700/20"
                        title="1 Oda Ekle"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Misafir Sayısı Bilgisi */}
                  {count > 0 && (
                    <div className="flex items-center justify-between text-xs px-1 text-slate-600 dark:text-slate-400 font-semibold animate-scale-in">
                      <span>Toplam Misafir:</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono">{subPax} Kişi</span>
                    </div>
                  )}
                </div>

                {/* Alt Dağılım Durumu */}
                <div className="mt-3.5 pt-2.5 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs w-full">
                  <span className="text-slate-500 dark:text-slate-400 font-bold">Kapasite:</span>
                  <span className={`font-mono font-black transition-colors ${
                    count > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    {count > 0 ? `${count} Oda (${subPax} Kişi)` : 'Oda Eklenmedi'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
