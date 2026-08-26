import React from 'react';
import { Users, Check, Building, Building2, Layers, Plus, Minus, Hotel, Calculator } from 'lucide-react';

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
    { occupancy: 1, key: 'single', label: 'Tek Kişilik Oda', desc: 'Özel Tek Kişilik Oda', pax: 1 },
    { occupancy: 2, key: 'double', label: '2 Kişilik Oda', desc: 'Eşler veya 2 Kişi', pax: 2 },
    { occupancy: 3, key: 'triple', label: '3 Kişilik Oda', desc: '3 Kişilik Paylaşımlı', pax: 3 },
    { occupancy: 4, key: 'quad', label: '4 Kişilik Oda', desc: '4 Kişilik Aile / Grup', pax: 4 }
  ];

  return (
    <div className="space-y-3 pt-2 font-sans select-none">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-display">
          <Hotel className="h-4 w-4 text-emerald-700" />
          <span>{isMixedRoomMode ? 'Çoklu Oda Teklifi & Dağılımı' : 'Tekli Oda Teklifi & Karşılaştırması'}</span>
        </h4>

        {/* Mode Switch Pills: Tekli Oda Teklifi vs Çoklu Oda Teklifi */}
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
              Tekli Oda Teklifi
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
              <span>Çoklu Oda Teklifi</span>
            </button>
          </div>
        )}
      </div>

      {/* Mode 1: Tekli Oda Teklifi - 4 Kartlı Detaylı Matematiksel Formül Karşılaştırması */}
      {!isMixedRoomMode && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 animate-fade-scale">
          {matrix.map((item) => {
            const isSelected = selectedOccupancy === item.occupancy;
            
            const usdVal = item.priceUSD || 0;
            const tryVal = item.priceTRY || 0;
            const eurVal = item.priceEUR || 0;
            const sarVal = item.priceSAR || 0;

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
                className={`relative flex flex-col justify-between rounded-2xl p-4 text-left transition-all duration-300 transform cursor-pointer border select-none group hover:-translate-y-0.5 active:scale-[0.99] ${
                  isSelected
                    ? 'bg-gradient-to-b from-emerald-50/90 via-emerald-50/40 to-white border-2 border-emerald-600 shadow-md ring-4 ring-emerald-500/20 scale-[1.01]'
                    : 'bg-white border-slate-200/90 hover:border-emerald-400 hover:bg-slate-50/70 hover:shadow-sm'
                }`}
              >
                {isSelected && (
                  <span className="absolute -top-2.5 -right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md animate-scale-in">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </span>
                )}

                <div className="space-y-2.5 w-full">
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-mono font-bold transition-all ${
                        isSelected ? 'bg-emerald-700 text-white shadow-2xs' : 'bg-slate-100 text-slate-700 group-hover:bg-emerald-100 group-hover:text-emerald-800'
                      }`}>
                        {item.occupancy}
                      </span>
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">{item.label}</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">
                      {item.occupancy === 1 ? 'Tekli' : `${item.occupancy} Kişilik`}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 font-medium">{item.desc}</p>

                  {/* Detaylı Mekke Formül & Hesap Dökümü */}
                  {item.makkahDays > 0 && (
                    <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-[11px] space-y-1">
                      <div className="flex items-center justify-between font-bold text-emerald-950">
                        <span className="flex items-center gap-1">
                          <Building className="h-3 w-3 text-emerald-700" />
                          <span>Mekke ({item.makkahDays}G):</span>
                        </span>
                        <span className="font-mono text-xs">{makkahStr}</span>
                      </div>
                      <div className="text-[10px] text-emerald-800/90 leading-tight space-y-0.5">
                        <div className="flex justify-between text-slate-600">
                          <span>Oda Payı: ({item.makkahRoomSAR}÷{item.occupancy}):</span>
                          <span className="font-mono font-semibold">{item.makkahDailyRoomPerPax} SAR/g</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Günlük Yemek:</span>
                          <span className="font-mono font-semibold">+{item.makkahFoodSAR} SAR/g</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Detaylı Medine Formül & Hesap Dökümü */}
                  {item.madinahDays > 0 && (
                    <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-100 text-[11px] space-y-1">
                      <div className="flex items-center justify-between font-bold text-amber-950">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-amber-700" />
                          <span>Medine ({item.madinahDays}G):</span>
                        </span>
                        <span className="font-mono text-xs">{madinahStr}</span>
                      </div>
                      <div className="text-[10px] text-amber-800/90 leading-tight space-y-0.5">
                        <div className="flex justify-between text-slate-600">
                          <span>Oda Payı: ({item.madinahRoomSAR}÷{item.occupancy}):</span>
                          <span className="font-mono font-semibold">{item.madinahDailyRoomPerPax} SAR/g</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Günlük Yemek:</span>
                          <span className="font-mono font-semibold">+{item.madinahFoodSAR} SAR/g</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Result Line */}
                <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-baseline justify-between w-full">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Kişi Başı Otel+Yemek:</span>
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

      {/* Mode 2: Çoklu Oda Teklifi - Tekli Oda ile Birebir Aynı Zengin Detay Formülleri + Oda Sayacı */}
      {isMixedRoomMode && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 animate-fade-scale">
          {roomKeys.map((r) => {
            const matrixItem = matrix.find(m => m.occupancy === r.occupancy) || {};
            const breakdownItem = mixedRoomsBreakdown?.[r.key] || {};
            const count = mixedRooms[r.key] || 0;
            const subPax = count * r.pax;

            // Bu oda tipinin net kişi başı saf otel+yemek fiyatı
            const perPersonPriceUSD = matrixItem.priceUSD || 0;
            const perPersonPriceTRY = matrixItem.priceTRY || 0;
            const perPersonPriceSAR = matrixItem.priceSAR || 0;
            const perPersonPriceEUR = matrixItem.priceEUR || 0;

            let rateStr = `${perPersonPriceUSD.toLocaleString('tr-TR')} $`;
            let subtotalStr = `${(subPax * perPersonPriceUSD).toLocaleString('tr-TR')} $`;
            let makkahStr = `${(matrixItem.makkahUSD || 0).toLocaleString('tr-TR')} $`;
            let madinahStr = `${(matrixItem.madinahUSD || 0).toLocaleString('tr-TR')} $`;

            if (currency === 'TRY') {
              rateStr = `${perPersonPriceTRY.toLocaleString('tr-TR')} ₺`;
              subtotalStr = `${(subPax * perPersonPriceTRY).toLocaleString('tr-TR')} ₺`;
            } else if (currency === 'EUR') {
              rateStr = `${perPersonPriceEUR.toLocaleString('tr-TR')} €`;
              subtotalStr = `${(subPax * perPersonPriceEUR).toLocaleString('tr-TR')} €`;
            } else if (currency === 'SAR') {
              rateStr = `${perPersonPriceSAR.toLocaleString('tr-TR')} SAR`;
              subtotalStr = `${(subPax * perPersonPriceSAR).toLocaleString('tr-TR')} SAR`;
              makkahStr = `${(matrixItem.makkahTotalSAR || 0).toLocaleString('tr-TR')} SAR`;
              madinahStr = `${(matrixItem.madinahTotalSAR || 0).toLocaleString('tr-TR')} SAR`;
            }

            return (
              <div 
                key={r.key}
                className={`relative flex flex-col justify-between rounded-2xl p-4 text-left transition-all duration-300 border select-none ${
                  count > 0 
                    ? 'bg-gradient-to-b from-emerald-50/90 via-emerald-50/40 to-white border-2 border-emerald-600 shadow-md ring-4 ring-emerald-500/20' 
                    : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
                }`}
              >
                {count > 0 && (
                  <span className="absolute -top-2.5 -right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md font-mono text-xs font-black animate-scale-in">
                    {count}
                  </span>
                )}

                <div className="space-y-2.5 w-full">
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-mono font-bold transition-all ${
                        count > 0 ? 'bg-emerald-700 text-white shadow-2xs' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {r.occupancy}
                      </span>
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">{r.label}</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">
                      {r.occupancy === 1 ? 'Tekli' : `${r.occupancy} Kişilik`}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 font-medium">{r.desc}</p>

                  {/* Detaylı Mekke Formül & Hesap Dökümü (Tekli Oda İle Aynı) */}
                  {matrixItem.makkahDays > 0 && (
                    <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-[11px] space-y-1">
                      <div className="flex items-center justify-between font-bold text-emerald-950">
                        <span className="flex items-center gap-1">
                          <Building className="h-3 w-3 text-emerald-700" />
                          <span>Mekke ({matrixItem.makkahDays}G):</span>
                        </span>
                        <span className="font-mono text-xs">{makkahStr}</span>
                      </div>
                      <div className="text-[10px] text-emerald-800/90 leading-tight space-y-0.5">
                        <div className="flex justify-between text-slate-600">
                          <span>Oda Payı: ({matrixItem.makkahRoomSAR}÷{r.occupancy}):</span>
                          <span className="font-mono font-semibold">{matrixItem.makkahDailyRoomPerPax} SAR/g</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Günlük Yemek:</span>
                          <span className="font-mono font-semibold">+{matrixItem.makkahFoodSAR} SAR/g</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Detaylı Medine Formül & Hesap Dökümü (Tekli Oda İle Aynı) */}
                  {matrixItem.madinahDays > 0 && (
                    <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-100 text-[11px] space-y-1">
                      <div className="flex items-center justify-between font-bold text-amber-950">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-amber-700" />
                          <span>Medine ({matrixItem.madinahDays}G):</span>
                        </span>
                        <span className="font-mono text-xs">{madinahStr}</span>
                      </div>
                      <div className="text-[10px] text-amber-800/90 leading-tight space-y-0.5">
                        <div className="flex justify-between text-slate-600">
                          <span>Oda Payı: ({matrixItem.madinahRoomSAR}÷{r.occupancy}):</span>
                          <span className="font-mono font-semibold">{matrixItem.madinahDailyRoomPerPax} SAR/g</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Günlük Yemek:</span>
                          <span className="font-mono font-semibold">+{matrixItem.madinahFoodSAR} SAR/g</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Alt Kısım: Kişi Başı Fiyat & Oda Sayacı & Ara Toplam */}
                <div className="mt-3 pt-2.5 border-t border-slate-200 space-y-2 w-full">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Kişi Başı Fiyat:</span>
                    <span className="text-sm font-black font-mono text-emerald-900">
                      {rateStr}
                    </span>
                  </div>

                  {/* Room Counter Controls */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold">Oda Adedi:</div>
                      <div className="text-xs font-black text-slate-900 font-mono">
                        {count} Oda ({subPax} Kişi)
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-slate-200 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => onChangeMixedRoom && onChangeMixedRoom(r.key, Math.max(0, count - 1))}
                        className="h-6 w-6 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-90 text-slate-700 font-bold flex items-center justify-center cursor-pointer transition-all spring-pill"
                        title="1 Oda Azalt"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="font-mono font-black text-xs text-slate-900 min-w-[22px] text-center select-none">
                        {count}
                      </span>
                      <button
                        type="button"
                        onClick={() => onChangeMixedRoom && onChangeMixedRoom(r.key, Math.min(100, count + 1))}
                        className="h-6 w-6 rounded-lg bg-emerald-700 hover:bg-emerald-600 active:scale-90 text-white font-bold flex items-center justify-center cursor-pointer transition-all spring-pill shadow-xs"
                        title="1 Oda Artır"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Ara Toplam (Oda adedi > 0 ise) */}
                  {count > 0 && (
                    <div className="flex items-center justify-between bg-emerald-100/60 px-2 py-1 rounded-lg text-[10px] font-mono font-bold text-emerald-950">
                      <span>Ara Toplam ({subPax}k):</span>
                      <span>{subtotalStr}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
