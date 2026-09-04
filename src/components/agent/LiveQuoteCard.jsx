import React from 'react';
import { 
  FileText, 
  CheckCircle2, 
  Users,
  Plus,
  Minus,
  Receipt,
  Building,
  Building2,
  Bus,
  Calendar,
  PackageCheck,
  ShieldCheck,
  Utensils
} from 'lucide-react';

export default function LiveQuoteCard({
  quotation,
  activePackage,
  activeMonth,
  onOpenPdfModal,
  onSaveQuote,
  isSaved,
  isEditing = false,
  paxCount = 1,
  onChangePaxCount,
  activeCurrency,
  setActiveCurrency,
}) {
  if (!quotation) return null;

  const isMixed = quotation.isMixedRoomMode;
  const effectivePax = isMixed ? (quotation.mixedRoomsSummary?.totalPax || paxCount) : paxCount;

  // Grup Toplam Tutarları
  const groupTotalUSD = isMixed 
    ? (quotation.mixedRoomsSummary?.groupGrandTotalUSD || (quotation.finalPriceUSD * effectivePax)) 
    : (quotation.finalPriceUSD * effectivePax);
  const groupTotalTRY = isMixed 
    ? (quotation.mixedRoomsSummary?.groupGrandTotalTRY || (quotation.finalPriceTRY * effectivePax)) 
    : (quotation.finalPriceTRY * effectivePax);
  const groupTotalEUR = isMixed 
    ? (quotation.mixedRoomsSummary?.groupGrandTotalEUR || (quotation.finalPriceEUR * effectivePax)) 
    : (quotation.finalPriceEUR * effectivePax);
  const groupTotalSAR = isMixed 
    ? (quotation.mixedRoomsSummary?.groupGrandTotalSAR || (quotation.finalPriceSAR * effectivePax)) 
    : (quotation.finalPriceSAR * effectivePax);

  // Transfer araç tipi etiketleri
  const getVehicleShort = (vType) => {
    if (!vType || vType === 'none') return 'Yok';
    if (vType === 'bus') return 'Otobüs';
    if (vType === 'hiace') return 'Hiace';
    if (vType === 'gmc') return 'GMC';
    if (vType === 'small') return 'Binek';
    return 'Dahil';
  };

  // Dahil edilen sabit giderler
  const includedFixedList = (quotation.fixedExpensesBreakdown || []).filter(item => item.included);

  return (
    <div className="h-full w-full flex flex-col font-sans select-none">
      {/* Market Fişi Kartı - Eşit Dağılım, Sıfır Scroll, Derli Toplu & Ferah */}
      <div className="pearl-card rounded-3xl p-5 shadow-xl border-2 border-emerald-300/80 bg-white relative h-full flex flex-col justify-between overflow-hidden">
        
        {/* ÜST BÖLÜM: Fiş Başlığı & Döviz Seçici */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
              <Receipt className="h-4 w-4 text-emerald-800" />
            </div>
            <div>
              <span className="text-xs font-black text-emerald-950 uppercase tracking-wider font-display block leading-none">
                Teklif Fişi
              </span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-tight">
                İnzar Turizm Fiyat Özeti
              </span>
            </div>
          </div>

          {/* Döviz Seçici */}
          <div className="flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-xs font-mono shadow-3xs">
            {['USD', 'TRY', 'EUR', 'SAR'].map(curr => (
              <button
                key={curr}
                type="button"
                onClick={() => setActiveCurrency(curr)}
                className={`px-2.5 py-0.5 rounded-lg transition-all font-bold cursor-pointer text-xs ${
                  activeCurrency === curr
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {curr === 'USD' ? '$' : curr === 'TRY' ? '₺' : curr === 'EUR' ? '€' : 'SAR'}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Oda Tiplerine Göre Kişi Başı Fiyatlar (Net & Derli Toplu) */}
        <div className="py-1 shrink-0">
          {quotation.isUnpriced || quotation.hasValidTariff === false ? (
            <div className="py-2.5 px-3 bg-gradient-to-br from-amber-50 via-orange-50/40 to-white border-2 border-amber-300 rounded-2xl space-y-1 text-center shadow-3xs">
              <div className="text-xs sm:text-sm font-black text-amber-950 flex items-center justify-center gap-1.5 font-display">
                <span>⚠️ Merkez Fiyat Belirlememiştir</span>
              </div>
              <p className="text-[10px] text-amber-800 font-semibold leading-relaxed">
                {quotation.tariffWarning || 'Seçilen tarihler için Genel Merkez tarafından otel fiyat tarifesi girilmemiştir.'}
              </p>
            </div>
          ) : isMixed ? (
            <div className="bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/70 p-3 rounded-2xl border border-emerald-300 shadow-3xs space-y-2">
              <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-emerald-950 font-display border-b border-emerald-200/70 pb-1">
                <span>Oda Tiplerine Göre Kişi Başı Ücret</span>
                <span className="font-mono text-[10px] bg-emerald-700 text-white px-2 py-0.5 rounded-full font-bold">
                  Çoklu Fiyat
                </span>
              </div>

              {/* Sadece Adedi > 0 Olan Seçili Oda Tiplerinin Kişi Başı Fiyat Kutuları */}
              {(() => {
                const activeRoomTypes = [
                  { key: 'single', label: '1 Kişilik', count: quotation.mixedRooms?.single || 0, data: quotation.mixedRoomsBreakdown?.single },
                  { key: 'double', label: '2 Kişilik', count: quotation.mixedRooms?.double || 0, data: quotation.mixedRoomsBreakdown?.double },
                  { key: 'triple', label: '3 Kişilik', count: quotation.mixedRooms?.triple || 0, data: quotation.mixedRoomsBreakdown?.triple },
                  { key: 'quad', label: '4 Kişilik', count: quotation.mixedRooms?.quad || 0, data: quotation.mixedRoomsBreakdown?.quad }
                ].filter(r => r.count > 0);

                if (activeRoomTypes.length === 0) {
                  return (
                    <div className="py-2 text-center text-xs text-slate-400 font-medium">
                      Henüz oda seçilmedi
                    </div>
                  );
                }

                return (
                  <div className={`grid gap-2 font-mono ${
                    activeRoomTypes.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                  }`}>
                    {activeRoomTypes.map((r) => (
                      <div key={r.key} className="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-3xs flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600">{r.label}:</span>
                        <span className="text-sm font-black text-emerald-950">
                          {activeCurrency === 'USD' && `$${(r.data?.priceUSD || 0).toLocaleString('tr-TR')}`}
                          {activeCurrency === 'TRY' && `${(r.data?.priceTRY || 0).toLocaleString('tr-TR')} ₺`}
                          {activeCurrency === 'EUR' && `€${(r.data?.priceEUR || 0).toLocaleString('tr-TR')}`}
                          {activeCurrency === 'SAR' && `${(r.data?.priceSAR || 0).toLocaleString('tr-TR')} SAR`}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="space-y-1 py-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-emerald-950">
                  {activeCurrency === 'USD' && `$${(quotation.finalPriceUSD || 0).toLocaleString('tr-TR')}`}
                  {activeCurrency === 'TRY' && `${(quotation.finalPriceTRY || 0).toLocaleString('tr-TR')} ₺`}
                  {activeCurrency === 'EUR' && `€${(quotation.finalPriceEUR || 0).toLocaleString('tr-TR')}`}
                  {activeCurrency === 'SAR' && `${(quotation.finalPriceSAR || 0).toLocaleString('tr-TR')} SAR`}
                </span>
                <span className="text-xs text-slate-500 font-bold">/ Kişi Başı</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-slate-600 font-semibold">
                {activeCurrency !== 'USD' && (
                  <span className="bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
                    ${(quotation.finalPriceUSD || 0).toLocaleString('tr-TR')} USD
                  </span>
                )}
                {activeCurrency !== 'TRY' && (
                  <span className="bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
                    ~{(quotation.finalPriceTRY || 0).toLocaleString('tr-TR')} ₺
                  </span>
                )}
                {activeCurrency !== 'EUR' && (
                  <span className="bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
                    ~{(quotation.finalPriceEUR || 0).toLocaleString('tr-TR')} €
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Kesikli Çizgi */}
        <div className="border-b-2 border-dashed border-slate-200 my-1 shrink-0" />

        {/* ORTA BÖLÜM: Fiş Kalemleri (Pil Formunda Şık Kutucuklar) */}
        <div className="flex-1 flex flex-col justify-around py-1 space-y-1.5 text-xs">
          
          {/* Seyahat Tarihleri & Rota Pil Kutusu */}
          <div className="bg-slate-50/80 px-3 py-1.5 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 shadow-3xs">
            <div className="flex items-center gap-2 min-w-0">
              <Calendar className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span className="text-slate-500 font-medium shrink-0">Tarih & Rota:</span>
              <span className="font-bold text-slate-900 truncate">
                {quotation.startDate ? (
                  `${quotation.startDate} - ${quotation.endDate || ''}`
                ) : (
                  activeMonth?.name || quotation.selectedMonth
                )}
              </span>
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
              {quotation.routeOrder === 'madinah_first' ? 'Medine ➔ Mekke' : 'Mekke ➔ Medine'}
            </span>
          </div>

          {/* Paket Pil Kutusu */}
          <div className="bg-slate-50/80 px-3 py-1.5 rounded-xl border border-slate-200/80 flex items-center gap-2 shadow-3xs">
            <PackageCheck className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span className="text-slate-500 font-medium">Paket:</span>
            <span className="font-bold text-emerald-950 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              {activePackage?.name || quotation.packageName}
            </span>
          </div>

          {/* Mekke Pil Kutusu */}
          <div className="bg-slate-50/80 px-3 py-1.5 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 shadow-3xs">
            <div className="flex items-center gap-2 min-w-0">
              <img src="/mekke.png" alt="Mekke" className="h-3.5 w-3.5 object-contain opacity-80 shrink-0" />
              <span className="text-slate-500 font-medium shrink-0">Mekke ({quotation.makkahDays}G):</span>
              <span className="font-semibold text-slate-900 truncate">
                {quotation.selectedMakkahHotel?.name || activePackage?.hotelMakkah || 'Mekke Oteli'}
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 shrink-0">
              {quotation.selectedMakkahHotel?.distance || activePackage?.distanceMakkah || ''}
            </span>
          </div>

          {/* Medine Pil Kutusu */}
          <div className="bg-slate-50/80 px-3 py-1.5 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 shadow-3xs">
            <div className="flex items-center gap-2 min-w-0">
              <img src="/medine.png" alt="Medine" className="h-3.5 w-3.5 object-contain opacity-80 shrink-0" />
              <span className="text-slate-500 font-medium shrink-0">Medine ({quotation.madinahDays}G):</span>
              <span className="font-semibold text-slate-900 truncate">
                {quotation.selectedMadinahHotel?.name || activePackage?.hotelMadinah || 'Medine Oteli'}
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 shrink-0">
              {quotation.selectedMadinahHotel?.distance || activePackage?.distanceMadinah || ''}
            </span>
          </div>

          {/* Yemek Durumu Pil Kutusu */}
          <div className="bg-slate-50/80 px-3 py-1.5 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 shadow-3xs">
            <div className="flex items-center gap-2 min-w-0">
              <Utensils className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span className="text-slate-500 font-medium shrink-0">Yemek Tercihi:</span>
              <div className="flex items-center gap-1.5 truncate">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                  quotation.includeMakkahMeals !== false ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  Mekke: {quotation.includeMakkahMeals !== false ? 'Dahil' : 'Yemeksiz'}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                  quotation.includeMadinahMeals !== false ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  Medine: {quotation.includeMadinahMeals !== false ? 'Dahil' : 'Yemeksiz'}
                </span>
              </div>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
              (quotation.includeMakkahMeals !== false && quotation.includeMadinahMeals !== false)
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                : (quotation.includeMakkahMeals === false && quotation.includeMadinahMeals === false)
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-amber-100 text-amber-900 border-amber-300'
            }`}>
              {(quotation.includeMakkahMeals !== false && quotation.includeMadinahMeals !== false) ? 'Tam Yemekli' : (quotation.includeMakkahMeals === false && quotation.includeMadinahMeals === false) ? 'Tam Yemeksiz' : 'Kısmi Yemekli'}
            </span>
          </div>

          {/* Araç / Transfer Pil Kutusu */}
          <div className="bg-slate-50/80 px-3 py-1.5 rounded-xl border border-slate-200/80 flex items-center gap-2 flex-wrap shadow-3xs">
            <Bus className="h-3.5 w-3.5 text-sky-600 shrink-0" />
            <span className="text-slate-500 font-medium shrink-0">Araç / Transfer:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                quotation.transferBreakdown?.[0]?.vehicleType && quotation.transferBreakdown?.[0]?.vehicleType !== 'none'
                  ? 'bg-sky-50 text-sky-900 border-sky-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                Cidde-Mekke ({getVehicleShort(quotation.transferBreakdown?.[0]?.vehicleType)})
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                quotation.transferBreakdown?.[1]?.vehicleType && quotation.transferBreakdown?.[1]?.vehicleType !== 'none'
                  ? 'bg-sky-50 text-sky-900 border-sky-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                Mekke-Medine ({getVehicleShort(quotation.transferBreakdown?.[1]?.vehicleType)})
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                quotation.transferBreakdown?.[2]?.vehicleType && quotation.transferBreakdown?.[2]?.vehicleType !== 'none'
                  ? 'bg-sky-50 text-sky-900 border-sky-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                Medine-HL ({getVehicleShort(quotation.transferBreakdown?.[2]?.vehicleType)})
              </span>
            </div>
          </div>

          {/* Dahil Hizmetler Pil Kutusu */}
          <div className="bg-slate-50/80 px-3 py-1.5 rounded-xl border border-slate-200/80 flex items-center gap-1.5 flex-wrap shadow-3xs">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span className="text-slate-500 font-medium shrink-0">Dahil Hizmetler:</span>
            {includedFixedList.length > 0 ? (
              includedFixedList.map((item, idx) => (
                <span key={idx} className="bg-emerald-50 text-emerald-900 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                  ✓ {item.label}
                </span>
              ))
            ) : (
              <span className="text-[10px] text-slate-400 font-medium">Yok</span>
            )}
          </div>

          {/* Çoklu Oda Dağılımı */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            {isMixed ? (
              <>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <Users className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                  <span>Çoklu Oda Dağılımı:</span>
                  <span className="font-mono text-emerald-950 font-black text-xs bg-emerald-100/90 px-2 py-0.5 rounded-md">
                    {quotation.mixedRoomsSummary?.totalRooms || 0} Oda • {quotation.mixedRoomsSummary?.totalPax || effectivePax} Kişi
                  </span>
                </div>

                {/* 1 | 2 | 3 | 4 Bölünmüş Net Kutucuklar */}
                <div className="grid grid-cols-4 gap-2 font-mono text-center">
                  <div className={`p-1.5 rounded-xl border transition-all ${
                    quotation.mixedRooms?.single > 0 
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-black shadow-3xs' 
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}>
                    <div className="text-[10px] font-bold">1'li</div>
                    <div className="text-xs font-black">{quotation.mixedRooms?.single || 0} Oda</div>
                  </div>

                  <div className={`p-1.5 rounded-xl border transition-all ${
                    quotation.mixedRooms?.double > 0 
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-black shadow-3xs' 
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}>
                    <div className="text-[10px] font-bold">2'li</div>
                    <div className="text-xs font-black">{quotation.mixedRooms?.double || 0} Oda</div>
                  </div>

                  <div className={`p-1.5 rounded-xl border transition-all ${
                    quotation.mixedRooms?.triple > 0 
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-black shadow-3xs' 
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}>
                    <div className="text-[10px] font-bold">3'lü</div>
                    <div className="text-xs font-black">{quotation.mixedRooms?.triple || 0} Oda</div>
                  </div>

                  <div className={`p-1.5 rounded-xl border transition-all ${
                    quotation.mixedRooms?.quad > 0 
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-black shadow-3xs' 
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}>
                    <div className="text-[10px] font-bold">4'lü</div>
                    <div className="text-xs font-black">{quotation.mixedRooms?.quad || 0} Oda</div>
                  </div>
                </div>
              </>
            ) : (
              /* Standart Tekil Oda Sayacı */
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                  <span className="text-xs font-bold text-slate-700">
                    Grup Kişi Sayısı:
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    ({quotation.makkahRoomOccupancy} Kişilik Oda)
                  </span>
                </div>

                {onChangePaxCount && (
                  <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => onChangePaxCount(Math.max(1, paxCount - 1))}
                      className="h-5 w-5 rounded-md bg-white hover:bg-slate-200 active:scale-90 text-slate-700 font-bold flex items-center justify-center cursor-pointer transition-all spring-pill shadow-3xs"
                      title="1 Kişi Azalt"
                    >
                      <Minus className="h-2.5 w-2.5" />
                    </button>
                    <span className="font-mono font-black text-xs text-slate-900 min-w-[24px] text-center select-none">
                      {paxCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => onChangePaxCount(Math.min(200, paxCount + 1))}
                      className="h-5 w-5 rounded-md bg-emerald-700 hover:bg-emerald-600 active:scale-90 text-white font-bold flex items-center justify-center cursor-pointer transition-all spring-pill shadow-xs"
                      title="1 Kişi Artır"
                    >
                      <Plus className="h-2.5 w-2.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* ALT BÖLÜM: TOPLAM BEDEL & YAN YANA BUTONLAR (Kompakt & Şık) */}
        <div className="space-y-2 pt-2 border-t border-slate-100 shrink-0">
          
          {/* 🧾 TOPLAM BEDEL (Kibar, İnce & Zarif Bar) */}
          <div className="rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50/70 to-emerald-50 px-3.5 py-2 border border-emerald-300/90 shadow-3xs flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-black text-emerald-950 uppercase tracking-tight font-display">
                Toplam Bedel:
              </span>
              <span className="text-[10px] text-emerald-800 font-bold">
                ({effectivePax} Kişi)
              </span>
            </div>

            <div className="font-mono font-black text-emerald-950 text-base sm:text-lg tracking-tight text-right">
              {quotation.isUnpriced || quotation.hasValidTariff === false ? (
                <span className="text-xs sm:text-sm text-amber-900 font-sans font-bold">
                  Belirlenmemiş ⚠️
                </span>
              ) : (
                <>
                  {activeCurrency === 'USD' && `$${groupTotalUSD.toLocaleString('tr-TR')}`}
                  {activeCurrency === 'TRY' && `${groupTotalTRY.toLocaleString('tr-TR')} ₺`}
                  {activeCurrency === 'EUR' && `€${groupTotalEUR.toLocaleString('tr-TR')}`}
                  {activeCurrency === 'SAR' && `${groupTotalSAR.toLocaleString('tr-TR')} SAR`}
                </>
              )}
            </div>
          </div>

          {/* Yan Yana Butonlar: Teklifi Kaydet (Gradient) | Teklif Mektubu (Sade) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                if (onOpenPdfModal) onOpenPdfModal();
              }}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold py-2.5 px-3 text-xs transition-all shadow-2xs hover:border-emerald-400 cursor-pointer spring-pill whitespace-nowrap"
            >
              <FileText className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>Teklif Mektubu</span>
            </button>

            <button
              type="button"
              onClick={onSaveQuote}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 text-xs font-bold transition-all cursor-pointer whitespace-nowrap spring-pill ${
                isSaved
                  ? 'bg-emerald-100/90 text-emerald-950 border border-emerald-300 shadow-2xs font-extrabold'
                  : isEditing
                  ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-md shadow-amber-600/30'
                  : 'bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white shadow-md shadow-emerald-800/20'
              }`}
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{isSaved ? (isEditing ? '✓ Revize Edildi' : '✓ Teklif Kaydedildi') : (isEditing ? 'Değişiklikleri Kaydet' : 'Teklifi Kaydet')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
