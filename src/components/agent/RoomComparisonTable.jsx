import React from 'react';
import { Users, Check, Building, Building2, Layers, Plus, Minus, Hotel } from 'lucide-react';

export default function RoomComparisonTable({ 
  matrix = [], 
  selectedOccupancy = 2, 
  onSelectOccupancy,
  currency = 'USD',
  isMixedRoomMode = false,
  onToggleMixedMode,
  mixedRooms = { single: 0, double: 0, triple: 0, quad: 0 },
  onChangeMixedRoom
}) {
  const roomKeys = [
    { occupancy: 1, key: 'single', label: 'Tek Kişilik Oda', desc: 'Özel Tek Kişilik', pax: 1 },
    { occupancy: 2, key: 'double', label: '2 Kişilik Oda', desc: 'Eşler veya 2 Kişi', pax: 2 },
    { occupancy: 3, key: 'triple', label: '3 Kişilik Oda', desc: '3 Kişilik Paylaşımlı', pax: 3 },
    { occupancy: 4, key: 'quad', label: '4 Kişilik Oda', desc: '4 Kişilik Aile / Grup', pax: 4 }
  ];

  const totalMixedRooms = (mixedRooms.single || 0) + (mixedRooms.double || 0) + (mixedRooms.triple || 0) + (mixedRooms.quad || 0);
  const totalMixedPax = ((mixedRooms.single || 0) * 1) + ((mixedRooms.double || 0) * 2) + ((mixedRooms.triple || 0) * 3) + ((mixedRooms.quad || 0) * 4);

  return (
    <div className="space-y-3 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-display">
          <Hotel className="h-4 w-4 text-emerald-700" />
          <span>{isMixedRoomMode ? 'Grup Karma Oda Dağılımı' : 'Oda Tiplerine Göre Kişi Başı Otel & Yemek Maliyeti'}</span>
        </h4>

        {/* Mode Switch Pills */}
        {onToggleMixedMode && (
          <div className="flex items-center gap-1 p-1 bg-slate-100/90 border border-slate-200/80 rounded-full select-none">
            <button
              type="button"
              onClick={() => onToggleMixedMode(false)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer spring-pill ${
                !isMixedRoomMode
                  ? 'bg-gradient-to-r from-emerald-700 to-emerald-800 text-white shadow-xs shadow-emerald-800/30'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              Standart Teklif
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
              <span>Karma Oda Dağılımı</span>
            </button>
          </div>
        )}
      </div>

      {/* Mode 1: Standart Tekli Seçim & Karşılaştırma */}
      {!isMixedRoomMode && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-scale">
          {matrix.map((item) => {
            const isSelected = selectedOccupancy === item.occupancy;
            
            const usdVal = item.finalPriceUSD ?? item.priceUSD ?? 0;
            const tryVal = item.finalPriceTRY ?? item.priceTRY ?? 0;
            const eurVal = item.finalPriceEUR ?? item.priceEUR ?? 0;
            const sarVal = item.finalPriceSAR ?? item.priceSAR ?? 0;

            let priceStr = `${usdVal.toLocaleString('tr-TR')} $`;
            let makkahStr = `${(item.makkahUSD || 0).toLocaleString('tr-TR')} $`;
            let madinahStr = `${(item.madinahUSD || 0).toLocaleString('tr-TR')} $`;

            if (currency === 'TRY') {
              priceStr = `${tryVal.toLocaleString('tr-TR')} ₺`;
            } else if (currency === 'EUR') {
              priceStr = `${eurVal.toLocaleString('tr-TR')} €`;
            } else if (currency === 'SAR') {
              priceStr = `${sarVal.toLocaleString('tr-TR')} SAR`;
              makkahStr = `${(item.makkahTotalSAR || 0).toLocaleString('tr-TR')} SAR`;
              madinahStr = `${(item.madinahTotalSAR || 0).toLocaleString('tr-TR')} SAR`;
            }

            return (
              <button
                key={item.occupancy}
                type="button"
                onClick={() => onSelectOccupancy(item.occupancy)}
                className={`relative flex flex-col justify-between rounded-2xl p-4 text-left transition-all duration-300 transform cursor-pointer border select-none ${
                  isSelected
                    ? 'bg-emerald-50/95 border-emerald-600 shadow-sm ring-2 ring-emerald-600/30 scale-101'
                    : 'bg-white border-slate-200/90 hover:border-emerald-300 hover:bg-slate-50/80 hover:shadow-2xs'
                }`}
              >
                {isSelected && (
                  <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md animate-fade-scale">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </span>
                )}

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-lg text-[11px] font-mono font-bold transition-colors ${
                      isSelected ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {item.occupancy}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">{item.desc}</p>

                  {/* Mekke & Medine Ayrımı */}
                  <div className="space-y-1 pt-1.5 border-t border-slate-100 text-[11px]">
                    {item.makkahDays > 0 && (
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-1">
                          <Building className="h-3 w-3 text-emerald-600" />
                          <span>Mekke ({item.makkahDays}G):</span>
                        </span>
                        <span className="font-mono font-semibold text-slate-800">{makkahStr}</span>
                      </div>
                    )}

                    {item.madinahDays > 0 && (
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-amber-600" />
                          <span>Medine ({item.madinahDays}G):</span>
                        </span>
                        <span className="font-mono font-semibold text-slate-800">{madinahStr}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-baseline justify-between">
                  <span className="text-[10px] text-slate-500 font-medium">Kişi Başı Otel & Yemek:</span>
                  <span className={`text-base font-black font-mono transition-colors ${
                    isSelected ? 'text-emerald-800' : 'text-slate-900'
                  }`}>
                    {priceStr}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Mode 2: Gelişmiş Karma Oda Dağılımı (Grup) */}
      {isMixedRoomMode && (
        <div className="space-y-3 animate-fade-scale">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {roomKeys.map((r) => {
              const matrixItem = matrix.find(m => m.occupancy === r.occupancy) || {};
              const count = mixedRooms[r.key] || 0;
              const subPax = count * r.pax;

              const usdVal = matrixItem.finalPriceUSD ?? matrixItem.priceUSD ?? 0;
              const sarVal = matrixItem.finalPriceSAR ?? matrixItem.priceSAR ?? 0;
              const tryVal = matrixItem.finalPriceTRY ?? matrixItem.priceTRY ?? 0;
              const eurVal = matrixItem.finalPriceEUR ?? matrixItem.priceEUR ?? 0;

              let rateStr = `${usdVal} $`;
              if (currency === 'TRY') rateStr = `${tryVal} ₺`;
              if (currency === 'EUR') rateStr = `${eurVal} €`;
              if (currency === 'SAR') rateStr = `${sarVal} SAR`;

              return (
                <div 
                  key={r.key}
                  className={`rounded-2xl p-4 border transition-all ${
                    count > 0 
                      ? 'bg-emerald-50/50 border-emerald-300 shadow-2xs' 
                      : 'bg-white border-slate-200/90'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <span className={`flex h-5 w-5 items-center justify-center rounded-lg text-[11px] font-mono font-bold ${
                        count > 0 ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {r.occupancy}
                      </span>
                      <span>{r.label}</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 font-mono">
                      {rateStr}/kişi
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-200/70">
                    <div>
                      <div className="text-[10px] text-slate-500 font-bold">Oda Adedi:</div>
                      <div className="text-xs font-bold text-slate-700 font-mono">{subPax} Kişi</div>
                    </div>

                    <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-slate-200 shadow-3xs">
                      <button
                        type="button"
                        onClick={() => onChangeMixedRoom && onChangeMixedRoom(r.key, Math.max(0, count - 1))}
                        className="h-7 w-7 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-90 text-slate-700 font-bold flex items-center justify-center cursor-pointer transition-all spring-pill"
                        title="1 Oda Azalt"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="font-mono font-black text-sm text-slate-900 min-w-[28px] text-center select-none">
                        {count}
                      </span>
                      <button
                        type="button"
                        onClick={() => onChangeMixedRoom && onChangeMixedRoom(r.key, Math.min(100, count + 1))}
                        className="h-7 w-7 rounded-lg bg-emerald-700 hover:bg-emerald-600 active:scale-90 text-white font-bold flex items-center justify-center cursor-pointer transition-all spring-pill shadow-xs"
                        title="1 Oda Artır"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Karma Dağılım Özeti */}
          <div className="p-3.5 rounded-2xl bg-emerald-900 text-white flex flex-wrap items-center justify-between gap-3 shadow-md shadow-emerald-950/20">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-100">Grup Konaklama Dağılımı:</div>
                <div className="text-sm font-black font-mono text-white">
                  {totalMixedRooms} Oda • Toplam {totalMixedPax} Misafir
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[11px] text-emerald-200 font-medium">Kişi sayısı ve teklif tutarı</div>
              <div className="text-xs font-bold text-emerald-300">Grup toplamına göre otomatik eşitlendi ✓</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
