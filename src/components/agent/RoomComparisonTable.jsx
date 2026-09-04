import React from 'react';
import { Users, Check, Building, Building2, Layers, Plus, Minus, Hotel, Sparkles } from 'lucide-react';

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
    <div className="space-y-3 pt-1 font-sans select-none">
      {onToggleMixedMode && (
        <div className="flex flex-wrap items-center justify-center gap-3 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-1 p-1 bg-slate-100/90 border border-slate-200/80 rounded-full select-none shadow-3xs">
            <button
              type="button"
              onClick={() => onToggleMixedMode(false)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer spring-pill flex items-center gap-1.5 ${
                !isMixedRoomMode
                  ? 'bg-gradient-to-r from-emerald-700 to-emerald-800 text-white shadow-xs shadow-emerald-800/30'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Hotel className="h-3.5 w-3.5" />
              <span>Standart Tek Tip Oda</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleMixedMode(true)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer spring-pill flex items-center gap-1.5 ${
                isMixedRoomMode
                  ? 'bg-gradient-to-r from-emerald-700 to-emerald-800 text-white shadow-xs shadow-emerald-800/30'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Karma Çoklu Oda Dağılımı</span>
            </button>
          </div>
        </div>
      )}

      {/* Mode 1: Standart Tek Tip Oda Seçimi - Fiyatlar Gizli, Sadece Kişi Başı Toplam Paket Bedeli */}
      {!isMixedRoomMode && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 animate-fade-scale">
          {roomKeys.map((r) => {
            const item = matrix.find(m => m.occupancy === r.occupancy) || {};
            const isSelected = selectedOccupancy === r.occupancy;
            
            const isUnpriced = item.hasTariff === false || item.isUnpriced;
            const usdVal = item.priceUSD || 0;
            const tryVal = item.priceTRY || 0;
            const eurVal = item.priceEUR || 0;
            const sarVal = item.priceSAR || 0;

            let priceStr = isUnpriced ? 'Merkez Belirlememiş ⚠️' : `${usdVal.toLocaleString('tr-TR')} $`;
            if (!isUnpriced) {
              if (currency === 'TRY') priceStr = `${tryVal.toLocaleString('tr-TR')} ₺`;
              else if (currency === 'EUR') priceStr = `${eurVal.toLocaleString('tr-TR')} €`;
              else if (currency === 'SAR') priceStr = `${sarVal.toLocaleString('tr-TR')} SAR`;
            }

            return (
              <button
                key={r.occupancy}
                type="button"
                onClick={() => onSelectOccupancy(r.occupancy)}
                className={`relative flex flex-col justify-between rounded-2xl p-4 text-left transition-all duration-300 transform cursor-pointer border select-none group hover:-translate-y-0.5 active:scale-[0.99] ${
                  isSelected
                    ? 'bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white border-2 border-emerald-600 shadow-md ring-4 ring-emerald-500/20 scale-[1.01]'
                    : 'bg-white border-slate-200/90 hover:border-emerald-400 hover:bg-slate-50/70 hover:shadow-sm'
                }`}
              >
                {isSelected && (
                  <span className="absolute -top-2.5 -right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md animate-scale-in">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </span>
                )}

                <div className="space-y-2.5 w-full">
                  {/* Kart Başlığı & Rozet */}
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`h-7 w-7 rounded-xl flex items-center justify-center font-bold text-xs font-mono transition-all ${
                        isSelected ? 'bg-emerald-700 text-white shadow-2xs' : 'bg-slate-100 text-slate-700 group-hover:bg-emerald-100 group-hover:text-emerald-800'
                      }`}>
                        {r.occupancy}
                      </div>
                      <span className="font-bold text-slate-900 text-sm">{r.label}</span>
                    </div>
                    {r.badge && (
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                        isSelected ? 'bg-emerald-200/80 text-emerald-900' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {r.badge}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 font-medium leading-snug">{r.desc}</p>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Oda Kapasitesi:</span>
                    <span className="font-bold text-slate-900 font-mono">{r.occupancy} Kişilik Oda</span>
                  </div>
                </div>

                {/* Seçim Durumu Rozeti (Fiyatsız, Temiz ve Sade) */}
                <div className="mt-3.5 pt-2.5 border-t border-slate-200/80 flex items-center justify-between w-full">
                  <span className="text-[11px] text-slate-500 font-bold">Durum:</span>
                  <span className={`text-xs font-black transition-colors ${
                    isSelected ? 'text-emerald-700' : 'text-slate-400'
                  }`}>
                    {isSelected ? '✓ Seçili Oda Tipi' : 'Seçmek İçin Tıklayın'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Mode 2: Karma Çoklu Oda Dağılımı - Ara Fiyatlar Gizli, Oda Sayacı ve Kişi Başı/Toplam Fiyat */}
      {isMixedRoomMode && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 animate-fade-scale">
          {roomKeys.map((r) => {
            const matrixItem = matrix.find(m => m.occupancy === r.occupancy) || {};
            const count = mixedRooms[r.key] || 0;
            const subPax = count * r.pax;

            const perPersonPriceUSD = matrixItem.priceUSD || 0;
            const perPersonPriceTRY = matrixItem.priceTRY || 0;
            const perPersonPriceSAR = matrixItem.priceSAR || 0;
            const perPersonPriceEUR = matrixItem.priceEUR || 0;

            const isItemUnpriced = matrixItem.hasTariff === false || matrixItem.isUnpriced;

            let rateStr = isItemUnpriced ? 'Merkez Belirlememiş ⚠️' : `${perPersonPriceUSD.toLocaleString('tr-TR')} $`;
            let subtotalStr = isItemUnpriced ? '—' : `${(subPax * perPersonPriceUSD).toLocaleString('tr-TR')} $`;

            if (!isItemUnpriced) {
              if (currency === 'TRY') {
                rateStr = `${perPersonPriceTRY.toLocaleString('tr-TR')} ₺`;
                subtotalStr = `${(subPax * perPersonPriceTRY).toLocaleString('tr-TR')} ₺`;
              } else if (currency === 'EUR') {
                rateStr = `${perPersonPriceEUR.toLocaleString('tr-TR')} €`;
                subtotalStr = `${(subPax * perPersonPriceEUR).toLocaleString('tr-TR')} €`;
              } else if (currency === 'SAR') {
                rateStr = `${perPersonPriceSAR.toLocaleString('tr-TR')} SAR`;
                subtotalStr = `${(subPax * perPersonPriceSAR).toLocaleString('tr-TR')} SAR`;
              }
            }

            return (
              <div 
                key={r.key}
                className={`relative flex flex-col justify-between rounded-2xl p-4 text-left transition-all duration-300 border select-none ${
                  count > 0 
                    ? 'bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white border-2 border-emerald-600 shadow-md ring-4 ring-emerald-500/20' 
                    : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
                }`}
              >
                {count > 0 && (
                  <span className="absolute -top-2.5 -right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md font-mono text-xs font-black animate-scale-in">
                    {count}
                  </span>
                )}

                <div className="space-y-3 w-full">
                  {/* Kart Başlığı */}
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`h-7 w-7 rounded-xl flex items-center justify-center font-bold text-xs font-mono transition-all ${
                        count > 0 ? 'bg-emerald-700 text-white shadow-2xs' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {r.occupancy}
                      </div>
                      <span className="font-bold text-slate-900 text-sm">{r.label}</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">
                      {r.pax} Kişi/Oda
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 font-medium leading-snug">{r.desc}</p>

                  {/* Oda Adedi Sayacı */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-700">Oda Sayısı:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onChangeMixedRoom?.(r.key, Math.max(0, count - 1))}
                        className="h-7 w-7 rounded-xl bg-white hover:bg-slate-200 active:scale-90 text-slate-700 font-bold flex items-center justify-center border border-slate-200 transition-all cursor-pointer shadow-3xs"
                        title="1 Oda Azalt"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="font-mono font-black text-sm text-slate-900 min-w-[24px] text-center">
                        {count}
                      </span>
                      <button
                        type="button"
                        onClick={() => onChangeMixedRoom?.(r.key, count + 1)}
                        className="h-7 w-7 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:scale-90 text-white font-bold flex items-center justify-center transition-all cursor-pointer shadow-xs shadow-emerald-800/30"
                        title="1 Oda Ekle"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Misafir Sayısı Bilgisi */}
                  {count > 0 && (
                    <div className="flex items-center justify-between text-xs px-1 text-slate-600 font-semibold">
                      <span>Toplam Misafir:</span>
                      <span className="font-bold text-emerald-800 font-mono">{subPax} Kişi</span>
                    </div>
                  )}
                </div>

                {/* Alt Dağılım Durumu (Fiyatsız, Sadece Oda & Kişi Durumu) */}
                <div className="mt-3.5 pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-xs w-full">
                  <span className="text-slate-500 font-bold">Kapasite:</span>
                  <span className={`font-mono font-black ${
                    count > 0 ? 'text-emerald-800' : 'text-slate-400'
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
