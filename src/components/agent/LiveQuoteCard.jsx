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
import { mekkeIcon, medineIcon } from '../../assets/icons';

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

  // Transfer araç tipi etiketleri (Dinamik Araç İsmi)
  const getVehicleShort = (item) => {
    if (!item || !item.vehicleType || item.vehicleType === 'none') return 'Yok';
    if (item.vehicleName && item.vehicleName !== 'Dahil Değil') {
      return item.vehicleName;
    }
    if (item.vehicleType === 'bus') return 'Otobüs';
    if (item.vehicleType === 'big') return 'Büyük Araç';
    if (item.vehicleType === 'small') return 'Küçük Araç';
    return 'Dahil';
  };

  // Dahil edilen müşteri odaklı sabit giderler (Havuzda aktif ve mektuba uygun olanlar)
  const includedFixedList = (quotation.fixedExpensesBreakdown || []).filter(
    item => item.included && item.isVisible !== false && item.showInLetter !== false
  );

  return (
    <div className="h-full w-full flex flex-col font-sans select-none">
      {/* Market Fişi Kartı - Eşit Dağılım, Esnek & Kesintisiz Görünüm */}
      <div className="pearl-card rounded-3xl p-3.5 sm:p-4 shadow-xl border-2 border-emerald-300/80 dark:border-emerald-600/50 bg-white dark:bg-slate-900 relative h-full flex flex-col justify-between overflow-hidden">
        
        {/* ÜST BÖLÜM: Fiş Başlığı & Döviz Seçici */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 shrink-0">
              <Receipt className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
            </div>
            <div>
              <span className="text-xs font-black text-emerald-950 dark:text-emerald-300 uppercase tracking-wider font-display block leading-none">
                Teklif Fişi
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold tracking-tight">
                İnzar Turizm Fiyat Özeti
              </span>
            </div>
          </div>

          {/* Döviz Seçici */}
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 text-xs font-mono shadow-3xs">
            {['USD', 'TRY', 'EUR', 'SAR'].map(curr => (
              <button
                key={curr}
                type="button"
                onClick={() => setActiveCurrency(curr)}
                className={`px-2.5 py-0.5 rounded-lg transition-all font-bold cursor-pointer text-xs ${
                  activeCurrency === curr
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
            <div className="py-2.5 px-3 bg-gradient-to-br from-amber-50 via-orange-50/40 to-white dark:from-amber-950/40 dark:via-orange-950/30 dark:to-slate-900 border-2 border-amber-300 dark:border-amber-700 rounded-2xl space-y-1 text-center shadow-3xs">
              <div className="text-xs sm:text-sm font-black text-amber-950 dark:text-amber-300 flex items-center justify-center gap-1.5 font-display">
                <span>⚠️ Merkez Fiyat Belirlememiştir</span>
              </div>
              <p className="text-[10px] text-amber-800 dark:text-amber-400 font-semibold leading-relaxed">
                {quotation.tariffWarning || 'Seçilen tarihler için Genel Merkez tarafından otel fiyat tarifesi girilmemiştir.'}
              </p>
            </div>
          ) : isMixed ? (
            /* Çoklu Oda: SADECE Seçili Odaların Kişi Başı Ücretleri (Ortalama Fiyat Kesinlikle YOK) */
            <div className="py-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-950 dark:text-emerald-300 font-display">
                  Oda Tiplerine Göre Kişi Başı
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {effectivePax} Kişi • {quotation.mixedRoomsSummary?.totalRooms || 0} Oda
                </span>
              </div>

              {(() => {
                const activeRoomTypes = [
                  { key: 'single', label: '1 Kişilik', count: quotation.mixedRooms?.single || 0, data: quotation.mixedRoomsBreakdown?.single },
                  { key: 'double', label: '2 Kişilik', count: quotation.mixedRooms?.double || 0, data: quotation.mixedRoomsBreakdown?.double },
                  { key: 'triple', label: '3 Kişilik', count: quotation.mixedRooms?.triple || 0, data: quotation.mixedRoomsBreakdown?.triple },
                  { key: 'quad', label: '4 Kişilik', count: quotation.mixedRooms?.quad || 0, data: quotation.mixedRoomsBreakdown?.quad }
                ].filter(r => r.count > 0);

                if (activeRoomTypes.length === 0) {
                  return (
                    <div className="py-2 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
                      Henüz oda seçilmedi
                    </div>
                  );
                }

                return (
                  <div className={`grid gap-1.5 font-mono ${
                    activeRoomTypes.length === 1 ? 'grid-cols-1' :
                    activeRoomTypes.length === 2 ? 'grid-cols-2' :
                    activeRoomTypes.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'
                  }`}>
                    {activeRoomTypes.map((r) => (
                      <div key={r.key} className="bg-slate-50/90 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200/90 dark:border-slate-700/90 shadow-3xs flex flex-col items-center text-center">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-tight">
                          {r.label} <span className="text-emerald-700 dark:text-emerald-400 font-black">({r.count} Oda)</span>
                        </span>
                        <span className="text-sm font-black text-emerald-950 dark:text-emerald-300 tracking-tight leading-tight mt-0.5">
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
            /* Standart Tekil Oda: Büyük Net Kişi Başı Fiyat */
            <div className="space-y-1 py-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-emerald-950 dark:text-emerald-300">
                  {activeCurrency === 'USD' && `$${(quotation.finalPriceUSD || 0).toLocaleString('tr-TR')}`}
                  {activeCurrency === 'TRY' && `${(quotation.finalPriceTRY || 0).toLocaleString('tr-TR')} ₺`}
                  {activeCurrency === 'EUR' && `€${(quotation.finalPriceEUR || 0).toLocaleString('tr-TR')}`}
                  {activeCurrency === 'SAR' && `${(quotation.finalPriceSAR || 0).toLocaleString('tr-TR')} SAR`}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">/ Kişi Başı</span>
              </div>

              {/* Kur Karşılıkları */}
              <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-slate-600 dark:text-slate-300 font-semibold">
                {activeCurrency !== 'USD' && (
                  <span className="bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    ${(quotation.finalPriceUSD || 0).toLocaleString('tr-TR')} USD
                  </span>
                )}
                {activeCurrency !== 'TRY' && (
                  <span className="bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    ~{(quotation.finalPriceTRY || 0).toLocaleString('tr-TR')} ₺
                  </span>
                )}
                {activeCurrency !== 'EUR' && (
                  <span className="bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    ~{(quotation.finalPriceEUR || 0).toLocaleString('tr-TR')} €
                  </span>
                )}
                {activeCurrency !== 'SAR' && (
                  <span className="bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    ~{(quotation.finalPriceSAR || 0).toLocaleString('tr-TR')} SAR
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Kesikli Çizgi */}
        <div className="border-b-2 border-dashed border-slate-200 dark:border-slate-800 my-1 shrink-0" />

        {/* ORTA BÖLÜM: Fiş Kalemleri (Esnek, İnce Scroll Korumalı) */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col justify-between py-1 space-y-1 text-xs pr-0.5">
          
          {/* Seyahat Tarihleri & Rota Pil Kutusu */}
          <div className="bg-slate-50/80 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-2 shadow-3xs">
            <div className="flex items-center gap-2 min-w-0">
              <Calendar className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0">Tarih & Rota:</span>
              <span className="font-bold text-slate-900 dark:text-white truncate">
                {quotation.startDate ? (
                  `${quotation.startDate} - ${quotation.endDate || ''}`
                ) : (
                  activeMonth?.name || quotation.selectedMonth
                )}
              </span>
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
              {quotation.routeOrder === 'madinah_first' ? 'Medine ➔ Mekke' : 'Mekke ➔ Medine'}
            </span>
          </div>

          {/* Paket Pil Kutusu */}
          <div className="bg-slate-50/80 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-2 shadow-3xs">
            <PackageCheck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-slate-500 dark:text-slate-400 font-medium">Paket:</span>
            <span className="font-bold text-emerald-950 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
              {activePackage?.name || quotation.packageName}
            </span>
          </div>

          {/* Mekke Pil Kutusu */}
          <div className="bg-slate-50/80 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-2 shadow-3xs">
            <div className="flex items-center gap-2 min-w-0">
              <img src={mekkeIcon} alt="Mekke" className="h-3.5 w-3.5 object-contain opacity-80 shrink-0 dark:brightness-0 dark:invert dark:opacity-90 transition-all" />
              <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0">Mekke ({quotation.makkahDays}G):</span>
              <span className="font-semibold text-slate-900 dark:text-slate-200 truncate">
                {quotation.selectedMakkahHotel?.name || activePackage?.hotelMakkah || 'Mekke Oteli'}
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 shrink-0">
              {quotation.selectedMakkahHotel?.distance || activePackage?.distanceMakkah || ''}
            </span>
          </div>

          {/* Medine Pil Kutusu */}
          <div className="bg-slate-50/80 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-2 shadow-3xs">
            <div className="flex items-center gap-2 min-w-0">
              <img src={medineIcon} alt="Medine" className="h-3.5 w-3.5 object-contain opacity-80 shrink-0 dark:brightness-0 dark:invert dark:opacity-90 transition-all" />
              <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0">Medine ({quotation.madinahDays}G):</span>
              <span className="font-semibold text-slate-900 dark:text-slate-200 truncate">
                {quotation.selectedMadinahHotel?.name || activePackage?.hotelMadinah || 'Medine Oteli'}
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 shrink-0">
              {quotation.selectedMadinahHotel?.distance || activePackage?.distanceMadinah || ''}
            </span>
          </div>

          {/* Yemek Durumu Pil Kutusu */}
          <div className="bg-slate-50/80 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-2 shadow-3xs">
            <div className="flex items-center gap-2 min-w-0">
              <Utensils className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0">Yemek Tercihi:</span>
              <div className="flex items-center gap-1.5 truncate">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                  quotation.includeMakkahMeals !== false ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-900/60'
                }`}>
                  Mekke: {quotation.includeMakkahMeals !== false ? 'Dahil' : 'Yemeksiz'}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                  quotation.includeMadinahMeals !== false ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/60' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-900/60'
                }`}>
                  Medine: {quotation.includeMadinahMeals !== false ? 'Dahil' : 'Yemeksiz'}
                </span>
              </div>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
              (quotation.includeMakkahMeals !== false && quotation.includeMadinahMeals !== false)
                ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                : (quotation.includeMakkahMeals === false && quotation.includeMadinahMeals === false)
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-900/60'
                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800'
            }`}>
              {(quotation.includeMakkahMeals !== false && quotation.includeMadinahMeals !== false) ? 'Tam Yemekli' : (quotation.includeMakkahMeals === false && quotation.includeMadinahMeals === false) ? 'Tam Yemeksiz' : 'Kısmi Yemekli'}
            </span>
          </div>

          {/* Araç / Transfer Pil Kutusu */}
          <div className="bg-slate-50/80 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-2 flex-wrap shadow-3xs">
            <Bus className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
            <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0">Araç / Transfer:</span>
            <div className="flex items-center gap-1 flex-wrap">
              <span className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold border ${
                quotation.transferBreakdown?.[0]?.vehicleType && quotation.transferBreakdown?.[0]?.vehicleType !== 'none'
                  ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-900 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}>
                Cidde-Mekke ({getVehicleShort(quotation.transferBreakdown?.[0])})
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold border ${
                quotation.transferBreakdown?.[1]?.vehicleType && quotation.transferBreakdown?.[1]?.vehicleType !== 'none'
                  ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-900 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}>
                Mekke-Medine ({getVehicleShort(quotation.transferBreakdown?.[1])})
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold border ${
                quotation.transferBreakdown?.[2]?.vehicleType && quotation.transferBreakdown?.[2]?.vehicleType !== 'none'
                  ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-900 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}>
                Medine-HL ({getVehicleShort(quotation.transferBreakdown?.[2])})
              </span>
            </div>
          </div>

          {/* Dahil Hizmetler Pil Kutusu */}
          <div className="bg-slate-50/80 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-1.5 flex-wrap shadow-3xs">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0">Dahil Hizmetler:</span>
            {includedFixedList.length > 0 ? (
              includedFixedList.map((item, idx) => {
                const isPartial = item.paxCount && effectivePax > 1 && item.paxCount < effectivePax;
                return (
                  <span 
                    key={idx} 
                    className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold border ${
                      isPartial 
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800' 
                        : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    }`}
                  >
                    ✓ {item.label} {isPartial ? `(${item.paxCount} Kişi)` : ''}
                  </span>
                );
              })
            ) : (
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Yok</span>
            )}
          </div>

          {/* Standart Tekil Oda Sayacı (Sadece Tekil Oda Modunda) */}
          {!isMixed && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Grup Kişi Sayısı:
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                  ({quotation.makkahRoomOccupancy} Kişilik Oda)
                </span>
              </div>

              {onChangePaxCount && (
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => onChangePaxCount(Math.max(1, paxCount - 1))}
                    className="h-5 w-5 rounded-md bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-90 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center cursor-pointer transition-all spring-pill shadow-3xs border border-slate-200 dark:border-slate-600"
                    title="1 Kişi Azalt"
                  >
                    <Minus className="h-2.5 w-2.5" />
                  </button>
                  <span className="font-mono font-black text-xs text-slate-900 dark:text-white min-w-[24px] text-center select-none">
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

        {/* ALT BÖLÜM: TOPLAM BEDEL & YAN YANA BUTONLAR (Kompakt & Şık) */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
          
          {/* 🧾 TOPLAM BEDEL (Kibar, İnce & Zarif Bar) */}
          <div className="rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50/70 to-emerald-50 dark:from-emerald-950/60 dark:via-teal-950/50 dark:to-emerald-950/60 px-3.5 py-2 border border-emerald-300/90 dark:border-emerald-700 shadow-3xs flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-black text-emerald-950 dark:text-emerald-300 uppercase tracking-tight font-display">
                Toplam Bedel:
              </span>
              <span className="text-[10px] text-emerald-800 dark:text-emerald-400 font-bold">
                ({effectivePax} Kişi)
              </span>
            </div>

            <div className="font-mono font-black text-emerald-950 dark:text-emerald-300 text-base sm:text-lg tracking-tight text-right">
              {quotation.isUnpriced || quotation.hasValidTariff === false ? (
                <span className="text-xs sm:text-sm text-amber-900 dark:text-amber-400 font-sans font-bold">
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
              className="flex items-center justify-center gap-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold py-2.5 px-3 text-xs transition-all shadow-2xs hover:border-emerald-400 dark:hover:border-emerald-500 cursor-pointer spring-pill whitespace-nowrap"
            >
              <FileText className="h-4 w-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <span>Teklif Mektubu</span>
            </button>

            <button
              type="button"
              onClick={onSaveQuote}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 text-xs font-bold transition-all cursor-pointer whitespace-nowrap spring-pill ${
                isSaved
                  ? 'bg-emerald-100/90 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-2xs font-extrabold'
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
